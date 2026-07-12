import Redis from 'ioredis';
import { createRedisClient } from '../utils/redis-health';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379/0';

export class RedisService {
  private static client: Redis | null = null;

  public static getClient(): Redis {
    if (!this.client) {
      this.client = createRedisClient(REDIS_URL, {
        maxRetriesPerRequest: 1, // keep retries low so we fallback fast
        connectTimeout: 1000, // 1s timeout to connect
        lazyConnect: true,
      });

      this.client.on('error', (err) => {
        // Log but don't crash the server process
        console.error('Redis client error:', err.message);
      });
    }
    return this.client;
  }

  public static async get(key: string): Promise<string | null> {
    try {
      const client = this.getClient();
      // Ensure we only perform queries if the connection is active
      if (client.status === 'ready' || client.status === 'connecting') {
        return await client.get(key);
      }
      return null;
    } catch (err) {
      console.warn(`Redis GET error for key ${key}, falling back to DB:`, err);
      return null;
    }
  }

  public static async setex(
    key: string,
    seconds: number,
    value: string
  ): Promise<void> {
    try {
      const client = this.getClient();
      if (client.status === 'ready' || client.status === 'connecting') {
        await client.setex(key, seconds, value);
      }
    } catch (err) {
      console.warn(`Redis SETEX error for key ${key}:`, err);
    }
  }

  public static async del(key: string): Promise<void> {
    try {
      const client = this.getClient();
      if (client.status === 'ready' || client.status === 'connecting') {
        await client.del(key);
      }
    } catch (err) {
      console.warn(`Redis DEL error for key ${key}:`, err);
    }
  }
}
