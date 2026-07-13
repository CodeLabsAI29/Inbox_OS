import { Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import { AuthService } from '../services/auth.service';
import { createRedisClient, RedisHealth } from '../utils/redis-health';

const isTest = process.env.NODE_ENV === 'test';

// Initialize Redis client using container environment variable, fallback to default local Redis URL
const redisClient = !isTest
  ? createRedisClient(process.env.REDIS_URL || 'redis://redis:6379/0', {
      maxRetriesPerRequest: 1,
      connectTimeout: 1000,
      lazyConnect: true,
    })
  : null;

if (redisClient) {
  redisClient.on('error', (err) => {
    console.error('Rate Limiter Redis client error:', err.message || err);
  });
}

// Map-based local fallback memory store
const memoryStore = {
  hits: new Map<string, number>(),
  resetTimes: new Map<string, number>(),

  increment: async (key: string) => {
    const now = Date.now();
    const windowMs = 15 * 60 * 1000;

    let hits = memoryStore.hits.get(key) || 0;
    let resetTime = memoryStore.resetTimes.get(key);

    if (!resetTime || now > resetTime) {
      hits = 0;
      resetTime = now + windowMs;
      memoryStore.resetTimes.set(key, resetTime);
    }

    hits++;
    memoryStore.hits.set(key, hits);

    return {
      totalHits: hits,
      resetTime: new Date(resetTime),
    };
  },
  decrement: async (key: string) => {
    const hits = memoryStore.hits.get(key) || 0;
    if (hits > 0) {
      memoryStore.hits.set(key, hits - 1);
    }
  },
  resetKey: async (key: string) => {
    memoryStore.hits.delete(key);
    memoryStore.resetTimes.delete(key);
  }
};

class HybridStore {
  private redisStore: any;

  constructor() {
    if (redisClient) {
      this.redisStore = new RedisStore({
        // @ts-expect-error - compatibility mapping for ioredis and rate-limit-redis sendCommand structure
        sendCommand: (...args: string[]) => {
          if (RedisHealth.isDisabled()) {
            throw new Error('Redis is disabled');
          }
          return redisClient.call(args[0], ...args.slice(1));
        }
      });
    }
  }

  async increment(key: string) {
    if (RedisHealth.isDisabled() || !this.redisStore) {
      return memoryStore.increment(key);
    }
    try {
      return await this.redisStore.increment(key);
    } catch (err) {
      RedisHealth.handleError(err);
      return memoryStore.increment(key);
    }
  }

  async decrement(key: string) {
    if (RedisHealth.isDisabled() || !this.redisStore) {
      return memoryStore.decrement(key);
    }
    try {
      await this.redisStore.decrement(key);
    } catch (err) {
      RedisHealth.handleError(err);
      await memoryStore.decrement(key);
    }
  }

  async resetKey(key: string) {
    if (RedisHealth.isDisabled() || !this.redisStore) {
      return memoryStore.resetKey(key);
    }
    try {
      await this.redisStore.resetKey(key);
    } catch (err) {
      RedisHealth.handleError(err);
      await memoryStore.resetKey(key);
    }
  }
}

/**
 * Global rate-limiting middleware for all /api endpoints.
 * Integrates with Redis to store request count across service restarts and scale-outs.
 */
export const rateLimiter = rateLimit({
  store: !isTest ? new HybridStore() as any : undefined, // Use default memory store in test env
  validate: false, // Suppress validations for custom configuration
  windowMs: 15 * 60 * 1000, // 15-minute window
  limit: async (req: Request) => {
    const token = req.cookies?.token;
    if (token) {
      try {
        const payload = AuthService.verifyToken(token);
        if (payload && payload.userId) {
          return 1000; // Authenticated user limit: 1000 requests per 15 mins
        }
      } catch (err) {
        // Fall back to public limits if token verification throws or is invalid
      }
    }
    return 100; // Public endpoint limit: 100 requests per 15 mins
  },
  keyGenerator: (req: Request) => {
    const token = req.cookies?.token;
    if (token) {
      try {
        const payload = AuthService.verifyToken(token);
        if (payload && payload.userId) {
          return `rate-limit:auth:${payload.userId}`;
        }
      } catch (err) {
        // Fall back to IP-based rate limiting key if token is malformed
      }
    }
    // Fallback to client IP address for public/anonymous requests
    const ip =
      req.ip ||
      req.headers['x-forwarded-for'] ||
      req.socket.remoteAddress ||
      'anonymous';
    const cleanIp = Array.isArray(ip) ? ip[0] : ip;
    return `rate-limit:public:${cleanIp}`;
  },
  standardHeaders: true, // Return standard rate limit info in headers (RateLimit-*)
  legacyHeaders: true, // Include X-RateLimit-* headers
  handler: (req: Request, res: Response) => {
    res.status(429).json({ error: 'Too Many Requests' });
  },
});
