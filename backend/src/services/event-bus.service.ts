import Redis from 'ioredis';
import { EventEmitter } from 'events';
import { PrismaClient } from '@prisma/client';
import { WebhookDispatcher } from './webhook-dispatcher.service';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379/0';

export class EventBus {
  private static pubClient: Redis | null = null;
  private static subClient: Redis | null = null;
  private static subHandlers: Map<string, Array<(payload: any) => void>> = new Map();
  private static webhookCache: { data: any[], expiresAt: number } | null = null;

  // In-memory fallback emitter
  private static localEmitter = new EventEmitter();
  private static useLocalEmitter = false;
  private static fallbackCallbacks: Array<() => void> = [];

  private static async getWebhooks(topic: string) {
    if (!this.webhookCache || Date.now() > this.webhookCache.expiresAt) {
      this.webhookCache = { 
        data: await prisma.webhookEndpoint.findMany(), 
        expiresAt: Date.now() + 30_000 
      };
    }
    return this.webhookCache.data.filter(h => {
      try { return JSON.parse(h.events).includes(topic); } catch { return false; }
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

  private static triggerFallback() {
    if (!this.useLocalEmitter) {
      this.useLocalEmitter = true;
      console.warn('⚠️ [EventBus] Redis connection unavailable. Falling back to in-memory EventBus.');
      // Execute all registered fallback callbacks (e.g. starting the worker inline)
      this.fallbackCallbacks.forEach(cb => {
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
   * Initializes the Redis publish client connection.
   */
  private static getPubClient(): Redis | null {
    if (this.useLocalEmitter) {
      return null;
    }
    if (!this.pubClient) {
      this.pubClient = new Redis(REDIS_URL, {
        maxRetriesPerRequest: null,
        retryStrategy: (times) => {
          if (times > 2) { // Allow up to 2 retries (total 3 attempts)
            this.triggerFallback();
            return null; // Stop retrying
          }
          return 500;
        }
      });

      this.pubClient.on('error', (error: any) => {
        console.error('Redis Pub Client Error:', error.message || error);
        if (error.code === 'ECONNREFUSED') {
          this.triggerFallback();
        }
      });

      this.pubClient.on('connect', () => {
        console.log('Redis Pub Client Connected');
      });
    }
    return this.pubClient;
  }

  /**
   * Initializes the Redis subscribe client connection.
   */
  private static getSubClient(): Redis | null {
    if (this.useLocalEmitter) {
      return null;
    }
    if (!this.subClient) {
      this.subClient = new Redis(REDIS_URL, {
        maxRetriesPerRequest: null,
        retryStrategy: (times) => {
          if (times > 2) {
            this.triggerFallback();
            return null;
          }
          return 500;
        }
      });

      this.subClient.on('error', (error: any) => {
        console.error('Redis Sub Client Error:', error.message || error);
        if (error.code === 'ECONNREFUSED') {
          this.triggerFallback();
        }
      });

      this.subClient.on('connect', () => {
        console.log('Redis Sub Client Connected');
      });

      // Set up global message dispatcher for the subscriber connection
      this.subClient.on('message', (channel, message) => {
        try {
          const payload = JSON.parse(message);
          const handlers = this.subHandlers.get(channel);
          if (handlers) {
            handlers.forEach((handler) => {
              try {
                handler(payload);
              } catch (handlerError) {
                console.error(`Error in event handler for channel ${channel}:`, handlerError);
              }
            });
          }
        } catch (parseError) {
          console.error(`Error parsing message on channel ${channel}:`, parseError);
        }
      });
    }
    return this.subClient;
  }

  /**
   * Publishes a structured JSON payload to a Redis Pub/Sub topic.
   */
  public static async publish(topic: string, payload: any): Promise<void> {
    try {
      // Fire external webhooks registered for this event
      try {
        const hooks = await this.getWebhooks(topic);
        for (const hook of hooks) {
          WebhookDispatcher.dispatch(hook.targetUrl, hook.secret, topic, payload);
        }
      } catch (err) {
        console.error('[EventBus] External webhook dispatch error:', err);
      }

      if (this.useLocalEmitter) {
        this.localEmitter.emit(topic, payload);
        return;
      }

      const client = this.getPubClient();
      if (!client || this.useLocalEmitter) {
        this.localEmitter.emit(topic, payload);
        return;
      }

      const message = JSON.stringify(payload);
      await client.publish(topic, message);
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        this.triggerFallback();
        this.localEmitter.emit(topic, payload);
        return;
      }
      console.error(`Failed to publish event to topic "${topic}":`, error);
      throw error;
    }
  }

  /**
   * Subscribes to a Redis Pub/Sub topic and runs the handler on received messages.
   */
  public static async subscribe(topic: string, handler: (payload: any) => void): Promise<void> {
    try {
      // Store handler in the local map
      let handlers = this.subHandlers.get(topic);
      if (!handlers) {
        handlers = [];
        this.subHandlers.set(topic, handlers);
      }
      handlers.push(handler);

      // Also register on the local emitter
      this.localEmitter.on(topic, handler);

      if (this.useLocalEmitter) {
        return;
      }

      const client = this.getSubClient();
      if (!client || this.useLocalEmitter) {
        return;
      }

      // Subscribe the Redis client to the topic channel
      await client.subscribe(topic);
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        this.triggerFallback();
        return;
      }
      console.error(`Failed to subscribe to topic "${topic}":`, error);
      throw error;
    }
  }

  /**
   * Cleanly disconnects client connections.
   */
  public static async disconnect(): Promise<void> {
    if (this.pubClient) {
      await this.pubClient.quit();
      this.pubClient = null;
    }
    if (this.subClient) {
      await this.subClient.quit();
      this.subClient = null;
    }
    this.subHandlers.clear();
    this.localEmitter.removeAllListeners();
  }
}
