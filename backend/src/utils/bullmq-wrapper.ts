import { Queue as RealQueue, Worker as RealWorker, Job, ConnectionOptions } from 'bullmq';
import { RedisHealth } from './redis-health';
import { logger } from './logger';

export { Job, ConnectionOptions };

// Global registry of processors so the mock Queue can trigger them
const processors = new Map<string, (job: any) => Promise<any>>();
const activeWorkers = new Set<Worker>();

export class Queue {
  private realQueue: RealQueue | null = null;
  private name: string;
  private connectionOpts: any;
  private localRepeatJobs = new Map<string, { pattern: string; tz?: string; data: any; intervalId?: NodeJS.Timeout }>();

  constructor(name: string, options: any) {
    this.name = name;
    this.connectionOpts = options?.connection;

    if (!RedisHealth.isDisabled()) {
      try {
        this.realQueue = new RealQueue(name, options);
        this.realQueue.on('error', (err) => {
          logger.error(`[BullMQ Wrapper] Queue "${name}" error:`, err);
          RedisHealth.handleError(err);
        });
      } catch (err) {
        logger.error(`[BullMQ Wrapper] Failed to instantiate real Queue "${name}":`, err);
        RedisHealth.handleError(err);
      }
    }

    // If Redis becomes disabled, clean up the real queue if it exists
    RedisHealth.onDisable(() => {
      if (this.realQueue) {
        logger.info(`[BullMQ Wrapper] Closing real Queue "${this.name}" due to Redis disable.`);
        this.realQueue.close().catch(() => {});
        this.realQueue = null;
      }
    });
  }

  async add(jobName: string, data: any, options?: any): Promise<any> {
    if (RedisHealth.isDisabled() || !this.realQueue) {
      logger.warn(`[BullMQ Wrapper] Redis disabled. Executing job "${jobName}" in-memory fallback.`);

      const jobId = `mock-${this.name}-${Math.random().toString(36).substring(7)}`;

      // Construct a mock Job object matching standard BullMQ job fields
      const mockJob = {
        id: jobId,
        name: jobName,
        data,
        opts: options,
        updateProgress: async () => {},
        log: async () => {},
      };

      // Check if repeatable cron option is set
      if (options?.repeat && options.repeat.pattern) {
        const pattern = options.repeat.pattern;
        const key = `repeat:${jobName}:${pattern}`;

        // Remove existing repeatable job with same key
        const existing = this.localRepeatJobs.get(key);
        if (existing?.intervalId) {
          clearInterval(existing.intervalId);
        }

        // Map cron pattern to approximate intervals
        let intervalMs = 24 * 60 * 60 * 1000; // Daily
        if (pattern.includes('*/5')) {
          intervalMs = 5 * 60 * 1000;
        } else if (pattern.startsWith('0 8 * * 1')) {
          intervalMs = 7 * 24 * 60 * 60 * 1000; // Weekly
        }

        const runJob = () => {
          const processor = processors.get(this.name);
          if (processor) {
            const repeatJob = {
              id: `mock-repeat-${Math.random().toString(36).substring(7)}`,
              name: jobName,
              data,
              opts: options,
              updateProgress: async () => {},
              log: async () => {},
            };
            processor(repeatJob).catch((err) => {
              logger.error(`[BullMQ Wrapper] Mock repeat job "${jobName}" failed:`, err);
            });
          }
        };

        const intervalId = setInterval(runJob, intervalMs);
        this.localRepeatJobs.set(key, {
          pattern,
          tz: options.repeat.tz,
          data,
          intervalId,
        });

        // Run once initially on startup fallback
        runJob();
        return { id: key, name: jobName, opts: options };
      }

      // Standard delayed or immediate job
      const processor = processors.get(this.name);
      if (processor) {
        const delay = options?.delay || 0;
        if (delay > 0) {
          logger.info(`[BullMQ Wrapper] Scheduling job "${jobName}" with delay ${delay}ms`);
          setTimeout(() => {
            processor(mockJob).catch((err) => {
              logger.error(`[BullMQ Wrapper] Mock job "${jobName}" failed:`, err);
            });
          }, delay);
        } else {
          setImmediate(() => {
            processor(mockJob).catch((err) => {
              logger.error(`[BullMQ Wrapper] Mock job "${jobName}" failed:`, err);
            });
          });
        }
      } else {
        logger.warn(`[BullMQ Wrapper] No worker/processor registered for queue "${this.name}".`);
      }

      return mockJob;
    }

    try {
      return await this.realQueue.add(jobName, data, options);
    } catch (err) {
      logger.error(`[BullMQ Wrapper] Queue.add failed for "${this.name}":`, err);
      RedisHealth.handleError(err);
      // Fallback inline execution
      return this.add(jobName, data, options);
    }
  }

  async getRepeatableJobs(): Promise<any[]> {
    if (RedisHealth.isDisabled() || !this.realQueue) {
      return Array.from(this.localRepeatJobs.entries()).map(([key, value]) => ({
        key,
        name: key,
        cron: value.pattern,
        tz: value.tz,
      }));
    }
    try {
      return await this.realQueue.getRepeatableJobs();
    } catch (err) {
      logger.error(`[BullMQ Wrapper] getRepeatableJobs failed for "${this.name}":`, err);
      RedisHealth.handleError(err);
      return [];
    }
  }

  async removeRepeatableByKey(key: string): Promise<any> {
    if (RedisHealth.isDisabled() || !this.realQueue) {
      const localJob = this.localRepeatJobs.get(key);
      if (localJob) {
        if (localJob.intervalId) {
          clearInterval(localJob.intervalId);
        }
        this.localRepeatJobs.delete(key);
      }
      return true;
    }
    try {
      return await this.realQueue.removeRepeatableByKey(key);
    } catch (err) {
      logger.error(`[BullMQ Wrapper] removeRepeatableByKey failed:`, err);
      RedisHealth.handleError(err);
      return false;
    }
  }

  async close(): Promise<void> {
    if (this.realQueue) {
      await this.realQueue.close();
      this.realQueue = null;
    }
    for (const [key, value] of this.localRepeatJobs.entries()) {
      if (value.intervalId) {
        clearInterval(value.intervalId);
      }
    }
    this.localRepeatJobs.clear();
  }
}

export class Worker {
  private realWorker: RealWorker | null = null;
  private name: string;
  private processor: (job: any) => Promise<any>;
  private connectionOpts: any;
  private eventHandlers = new Map<string, Set<(...args: any[]) => void>>();

  constructor(
    name: string,
    processor: (job: any) => Promise<any>,
    options: any
  ) {
    this.name = name;
    this.processor = processor;
    this.connectionOpts = options?.connection;

    // Register processor globally
    processors.set(name, processor);
    activeWorkers.add(this);

    if (!RedisHealth.isDisabled()) {
      try {
        this.realWorker = new RealWorker(name, processor, options);
        this.realWorker.on('error', (err) => {
          logger.error(`[BullMQ Wrapper] Worker "${name}" error:`, err);
          RedisHealth.handleError(err);
        });
        this.setupRealEvents();
      } catch (err) {
        logger.error(`[BullMQ Wrapper] Failed to instantiate real Worker "${name}":`, err);
        RedisHealth.handleError(err);
      }
    }

    RedisHealth.onDisable(() => {
      if (this.realWorker) {
        logger.info(`[BullMQ Wrapper] Redis disabled. Closing real Worker "${this.name}" to prevent error loop.`);
        this.realWorker.close().catch(() => {});
        this.realWorker = null;
      }
    });
  }

  private setupRealEvents() {
    if (!this.realWorker) return;

    const events = ['completed', 'failed', 'error', 'active', 'progress'];
    events.forEach(event => {
      this.realWorker!.on(event as any, (...args: any[]) => {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
          handlers.forEach(h => h(...args));
        }
      });
    });
  }

  on(event: string, handler: (...args: any[]) => void): this {
    let handlers = this.eventHandlers.get(event);
    if (!handlers) {
      handlers = new Set();
      this.eventHandlers.set(event, handlers);
    }
    handlers.add(handler);
    return this;
  }

  async close(): Promise<void> {
    activeWorkers.delete(this);
    processors.delete(this.name);
    if (this.realWorker) {
      await this.realWorker.close();
      this.realWorker = null;
    }
  }
}
