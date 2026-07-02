import { Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import { AuthService } from '../services/auth.service';

// Initialize Redis client using container environment variable, fallback to default local Redis URL
const redisClient = new Redis(process.env.REDIS_URL || 'redis://redis:6379/0');

/**
 * Global rate-limiting middleware for all /api endpoints.
 * Integrates with Redis to store request count across service restarts and scale-outs.
 */
export const rateLimiter = rateLimit({
  store: new RedisStore({
    // @ts-expect-error - compatibility mapping for ioredis and rate-limit-redis sendCommand structure
    sendCommand: (...args: string[]) => redisClient.call(args[0], ...args.slice(1)),
  }),
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
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'anonymous';
    const cleanIp = Array.isArray(ip) ? ip[0] : ip;
    return `rate-limit:public:${cleanIp}`;
  },
  standardHeaders: true, // Return standard rate limit info in headers (RateLimit-*)
  legacyHeaders: true, // Include X-RateLimit-* headers
  handler: (req: Request, res: Response) => {
    res.status(429).json({ error: 'Too Many Requests' });
  },
});
