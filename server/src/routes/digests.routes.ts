import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  requireAuth,
  AuthenticatedRequest,
} from '../middleware/auth.middleware';
import { DigestGeneratorService } from '../services/actions/digest-generator.service';
import { EmailDigestAdapter } from '../services/outputs/email-digest.adapter';
import { logger } from '../utils/logger';
import { z } from 'zod';

export const digestsRouter = Router();
const prisma = new PrismaClient();

const generateSchema = z.object({
  type: z.enum(['daily', 'weekly']).optional().default('daily'),
  limit: z.number().int().min(1).max(100).optional().default(20),
});

/**
 * GET /api/digests
 * List digests for the authenticated user
 */
digestsRouter.get(
  '/',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;

      const [digests, total] = await Promise.all([
        prisma.digest.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.digest.count({ where: { userId } }),
      ]);

      return res.json({ digests, total, limit, offset });
    } catch (err: any) {
      logger.error('[Digests] GET / error:', err.message);
      return res.status(500).json({ error: 'Failed to fetch digests' });
    }
  }
);

/**
 * POST /api/digests/generate
 * Generate a new AI digest for the authenticated user
 */
digestsRouter.post(
  '/generate',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const validation = generateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.error.flatten(),
        });
      }
      const { type, limit } = validation.data;

      logger.info('[Digests] Generating digest', { userId, type });
      const digest = await DigestGeneratorService.generateDigest(userId, type);

      return res.status(201).json(digest);
    } catch (err: any) {
      logger.error('[Digests] POST /generate error:', err.message);
      return res
        .status(500)
        .json({ error: 'Failed to generate digest', message: err.message });
    }
  }
);

/**
 * POST /api/digests/:id/send
 * Send a digest via email to the user
 */
digestsRouter.post(
  '/:id/send',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const id = req.params.id as string;
      const digest = await prisma.digest.findUnique({ where: { id } });

      if (!digest || digest.userId !== userId) {
        return res.status(404).json({ error: 'Digest not found' });
      }

      await EmailDigestAdapter.sendDigest(digest, userId);

      logger.info('[Digests] Digest sent', { id, userId });
      return res.json({ message: 'Digest sent successfully' });
    } catch (err: any) {
      logger.error('[Digests] POST /:id/send error:', err.message);
      return res
        .status(500)
        .json({ error: 'Failed to send digest', message: err.message });
    }
  }
);

/**
 * GET /api/digests/unsubscribe
 * Unsubscribe category link handler
 */
digestsRouter.get('/unsubscribe', async (req, res) => {
  try {
    const { category } = req.query;
    logger.info(`[Digests] Unsubscribed from category: ${category}`);
    return res.send(`
        <html style="background-color: #0d0f1a;">
          <body style="font-family: sans-serif; background-color: #0d0f1a; color: #ffffff; text-align: center; padding-top: 100px;">
            <div style="background-color: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; display: inline-block; padding: 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
              <h2 style="margin-top:0; color: #818cf8;">Unsubscribed Successfully</h2>
              <p>You have been unsubscribed from the <strong>${category}</strong> category digests.</p>
              <p style="margin-bottom:0;"><a href="http://localhost:5173" style="color: #a5b4fc; text-decoration:none;">Go back to InboxOS</a></p>
            </div>
          </body>
        </html>
      `);
  } catch (err: any) {
    return res.status(500).send('Unsubscribe failed');
  }
});
