import Redis from 'ioredis';
import { EventEmitter } from 'events';
import { PrismaClient } from '@prisma/client';
import { WebhookDispatcher } from './webhook-dispatcher.service';
import { Queue, Worker, Job } from '../utils/bullmq-wrapper';
import { createRedisClient, RedisHealth } from '../utils/redis-health';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379/0';

export class EventBus {
  private static pubClient: Redis | null = null;
  private static subHandlers: Map<string, Array<(payload: any) => void>> =
    new Map();
  private static webhookCache: { data: any[]; expiresAt: number } | null = null;

  // BullMQ components
  private static eventQueue: Queue | null = null;
  private static eventWorker: Worker | null = null;

  // In-memory fallback emitter
  private static localEmitter = new EventEmitter();
  private static useLocalEmitter = false;
  private static fallbackCallbacks: Array<() => void> = [];

  private static async getWebhooks(topic: string) {
    if (!this.webhookCache || Date.now() > this.webhookCache.expiresAt) {
      this.webhookCache = {
        data: await prisma.webhookEndpoint.findMany(),
        expiresAt: Date.now() + 30_000,
      };
    }
    return this.webhookCache.data.filter((h) => {
      try {
        return JSON.parse(h.events).includes(topic);
      } catch {
        return false;
      }
    });
  }

  /**
   * Registers a callback to be executed if the EventBus falls back to in-memory mode.
   */
  public static onFallback(callback: () => void) {
    if (this.useLocalEmitter) {
      callback();
    } else {
      this.fallbackCallbacks.push(callback);
    }
  }

  public static triggerFallback() {
    if (!this.useLocalEmitter) {
      this.useLocalEmitter = true;
      console.warn(
        '⚠️ [EventBus] Redis connection unavailable. Falling back to in-memory EventBus.'
      );
      // Execute all registered fallback callbacks (e.g. starting the worker inline)
      this.fallbackCallbacks.forEach((cb) => {
        try {
          cb();
        } catch (err) {
          console.error('[EventBus] Error in fallback callback:', err);
        }
      });
      this.fallbackCallbacks = [];
    }
  }

  /**
   * Initializes the Redis connection and BullMQ queue.
   */
  private static getPubClient(): Redis | null {
    if (this.useLocalEmitter) {
      return null;
    }
    if (!this.pubClient) {
      this.pubClient = createRedisClient(REDIS_URL, {
        maxRetriesPerRequest: null,
        retryStrategy: (times: number) => {
          if (times > 2) {
            // Allow up to 2 retries (total 3 attempts)
            this.triggerFallback();
            return null; // Stop retrying
          }
          return 500;
        },
      });

      this.pubClient.on('error', (error: any) => {
        console.error('Redis Client Error:', error.message || error);
        if (error.code === 'ECONNREFUSED' || RedisHealth.isDisabled()) {
          this.triggerFallback();
        }
      });

      this.pubClient.on('connect', () => {
        console.log('Redis Client Connected for EventBus');
      });
    }
    return this.pubClient;
  }

  /**
   * Returns the BullMQ queue instance.
   */
  public static getQueue(): Queue | null {
    if (this.useLocalEmitter) return null;
    if (!this.eventQueue) {
      const client = this.getPubClient();
      if (!client || this.useLocalEmitter) return null;

      this.eventQueue = new Queue('inboxos-events', {
        connection: client as any,
      });
    }
    return this.eventQueue;
  }

  /**
   * Publishes a structured JSON payload to a BullMQ queue topic.
   */
  public static async publish(topic: string, payload: any): Promise<void> {
    try {
      // Fire external webhooks registered for this event
      try {
        const hooks = await this.getWebhooks(topic);
        for (const hook of hooks) {
          WebhookDispatcher.dispatch(
            hook.targetUrl,
            hook.secret,
            topic,
            payload
          );
        }
      } catch (err) {
        console.error('[EventBus] External webhook dispatch error:', err);
      }

      if (this.useLocalEmitter) {
        this.localEmitter.emit(topic, payload);
        return;
      }

      const queue = this.getQueue();
      if (!queue || this.useLocalEmitter) {
        this.localEmitter.emit(topic, payload);
        return;
      }

      // Add to BullMQ with retry logic
      await queue.add(topic, payload, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });
    } catch (error: any) {
      RedisHealth.handleError(error);
      if (error.code === 'ECONNREFUSED' || RedisHealth.isDisabled()) {
        this.triggerFallback();
        this.localEmitter.emit(topic, payload);
        return;
      }
      console.error(`Failed to publish event to topic "${topic}":`, error);
      throw error;
    }
  }

  /**
   * Subscribes to a topic. If running in BullMQ mode, initializes a Worker to handle the queue.
   */
  public static async subscribe(
    topic: string,
    handler: (payload: any) => void
  ): Promise<void> {
    try {
      // Store handler in the local map
      let handlers = this.subHandlers.get(topic);
      if (!handlers) {
        handlers = [];
        this.subHandlers.set(topic, handlers);
      }
      handlers.push(handler);

      // Also register on the local emitter for fallback
      this.localEmitter.on(topic, handler);

      if (this.useLocalEmitter) {
        return;
      }

      const client = this.getPubClient();
      if (!client || this.useLocalEmitter) {
        return;
      }

      // Instantiate BullMQ Worker if it's not already running
      if (!this.eventWorker) {
        this.eventWorker = new Worker(
          'inboxos-events',
          async (job: Job) => {
            const registeredHandlers = this.subHandlers.get(job.name);
            if (registeredHandlers && registeredHandlers.length > 0) {
              console.log(
                `[BullMQ EventBus] Executing job ${job.id} for event: "${job.name}"`
              );
              for (const subHandler of registeredHandlers) {
                await subHandler(job.data);
              }
            }
          },
          {
            connection: client as any,
            concurrency: 5,
          }
        );

        this.eventWorker.on('failed', (job: any, err: Error) => {
          console.error(
            `[BullMQ EventBus] Job ${job?.id} failed:`,
            err.message || err
          );
        });

        console.log(
          '[BullMQ EventBus] Worker listener registered successfully'
        );
      }
    } catch (error: any) {
      RedisHealth.handleError(error);
      if (error.code === 'ECONNREFUSED' || RedisHealth.isDisabled()) {
        this.triggerFallback();
        return;
      }
      console.error(`Failed to subscribe to topic "${topic}":`, error);
      throw error;
    }
  }

  /**
   * Cleanly disconnects queue and worker clients.
   */
  public static async disconnect(): Promise<void> {
    if (this.eventQueue) {
      await this.eventQueue.close();
      this.eventQueue = null;
    }
    if (this.eventWorker) {
      await this.eventWorker.close();
      this.eventWorker = null;
    }
    if (this.pubClient) {
      await this.pubClient.quit();
      this.pubClient = null;
    }
    this.subHandlers.clear();
    this.localEmitter.removeAllListeners();
  }
}

// Automatically fallback if Redis is disabled globally
RedisHealth.onDisable(() => {
  EventBus.triggerFallback();
});
