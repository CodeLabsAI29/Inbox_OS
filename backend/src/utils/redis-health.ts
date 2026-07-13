import Redis from 'ioredis';
import { logger } from './logger';

let redisDisabled = false;

type Listener = (disabled: boolean) => void;
const disableListeners = new Set<Listener>();

export const RedisHealth = {
  isDisabled(): boolean {
    return redisDisabled;
  },

  setDisabled(val: boolean) {
    if (val !== redisDisabled) {
      redisDisabled = val;
      if (val) {
        logger.warn('⚠️ [RedisHealth] Redis has been disabled (unreachable or rate limited). Falling back to in-memory mode.');
        disableListeners.forEach(listener => {
          try {
            listener(true);
          } catch (err) {
            logger.error('[RedisHealth] Error in disable listener:', err);
          }
        });
      } else {
        logger.info('ℹ️ [RedisHealth] Redis is enabled.');
      }
    }
  },

  onDisable(listener: Listener) {
    disableListeners.add(listener);
    if (redisDisabled) {
      listener(true);
    }
    return () => {
      disableListeners.delete(listener);
    };
  },

  handleError(error: any) {
    if (!error) return;
    const msg = (error.message || '').toLowerCase();
    if (
      msg.includes('max requests limit exceeded') ||
      msg.includes('limit exceeded') ||
      msg.includes('quota exceeded') ||
      msg.includes('rate limit') ||
      error.code === 'ECONNREFUSED' ||
      (error.name === 'ReplyError' && msg.includes('limit'))
    ) {
      this.setDisabled(true);
    }
  }
};

export class MockRedisClient {
  status = 'end';

  async get(key: string): Promise<string | null> {
    return null;
  }

  async setex(key: string, seconds: number, value: string): Promise<string> {
    return 'OK';
  }

  async del(key: string): Promise<number> {
    return 0;
  }

  async ping(): Promise<string> {
    return 'PONG';
  }

  async call(cmd: string, ...args: any[]): Promise<any> {
    return null;
  }

  on(event: string, handler: (...args: any[]) => void): this {
    if (event === 'connect' && !RedisHealth.isDisabled()) {
      setImmediate(() => handler());
    }
    return this;
  }

  once(event: string, handler: (...args: any[]) => void): this {
    return this;
  }

  off(event: string, handler: (...args: any[]) => void): this {
    return this;
  }

  async quit(): Promise<string> {
    return 'OK';
  }

  disconnect(): void {}
}

export function createRedisClient(url: string, options?: any): Redis {
  if (RedisHealth.isDisabled()) {
    logger.info('[RedisHealth] Redis disabled at startup. Creating Mock Redis Client.');
    return new MockRedisClient() as any;
  }

  logger.info(`[RedisHealth] Creating connection to Redis at ${url}`);
  const realClient = new Redis(url, options);

  const proxy = new Proxy(realClient, {
    get(target, prop, receiver) {
      if (prop === 'status') {
        if (RedisHealth.isDisabled()) {
          return 'end';
        }
        return target.status;
      }

      if (prop === 'on' || prop === 'addListener') {
        return function(this: any, event: string, handler: (...args: any[]) => void) {
          const wrappedHandler = (...args: any[]) => {
            if (event === 'error') {
              RedisHealth.handleError(args[0]);
            }
            handler(...args);
          };
          return target.on(event, wrappedHandler);
        };
      }

      const orig = Reflect.get(target, prop, receiver);
      if (typeof orig === 'function') {
        const bound = orig.bind(target);
        return function(this: any, ...args: any[]) {
          if (RedisHealth.isDisabled() && prop !== 'quit' && prop !== 'disconnect') {
            const mock = new MockRedisClient() as any;
            if (typeof mock[prop] === 'function') {
              return mock[prop](...args);
            }
            return undefined;
          }

          try {
            const result = bound(...args);
            if (result && typeof result.then === 'function') {
              return result.catch((err: any) => {
                RedisHealth.handleError(err);
                if (RedisHealth.isDisabled()) {
                  logger.warn(`[RedisHealth] Command "${String(prop)}" failed on Redis. Falling back.`);
                  return null;
                }
                throw err;
              });
            }
            return result;
          } catch (err) {
            RedisHealth.handleError(err);
            if (RedisHealth.isDisabled()) {
              return null;
            }
            throw err;
          }
        };
      }
      return orig;
    }
  });

  return proxy as any;
}
