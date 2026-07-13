import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  requireAuth,
  AuthenticatedRequest,
} from '../middleware/auth.middleware';
import { logger } from '../utils/logger';
import { z } from 'zod';

export const feedbackRouter = Router();
const prisma = new PrismaClient();

const feedbackSchema = z.object({
  feedbackType: z.enum(['thumbs_up', 'thumbs_down']),
  feature: z
    .enum(['classify', 'summarize', 'reply', 'extract_actions'])
    .optional(),
  emailId: z.string().uuid().optional(),
  comment: z.string().max(500).optional(),
});

/**
 * POST /api/feedback
 * Submit AI thumbs up/down feedback
 */
feedbackRouter.post(
  '/',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const validation = feedbackSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.error.flatten(),
        });
      }

      const { feedbackType, feature, emailId, comment } = validation.data;

      // Verify emailId belongs to user if provided
      if (emailId) {
        const email = await prisma.email.findFirst({
          where: { id: emailId, userId },
        });
        if (!email) {
          return res.status(404).json({ error: 'Email not found' });
        }
      }

      const feedback = await prisma.userFeedback.create({
        data: { userId, feedbackType, feature, emailId, comment },
      });

      logger.info('[Feedback] Recorded', {
        id: feedback.id,
        userId,
        feedbackType,
        feature,
      });
      return res
        .status(201)
        .json({ message: 'Feedback recorded', id: feedback.id });
    } catch (err: any) {
      logger.error('[Feedback] POST / error:', err.message);
      return res.status(500).json({ error: 'Failed to record feedback' });
    }
  }
);
