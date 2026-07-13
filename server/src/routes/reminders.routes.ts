import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  requireAuth,
  AuthenticatedRequest,
} from '../middleware/auth.middleware';
import { ReminderSchedulerService } from '../services/actions/reminder-scheduler.service';
import { logger } from '../utils/logger';
import { z } from 'zod';

export const remindersRouter = Router();
const prisma = new PrismaClient();

const snoozeSchema = z.object({
  durationMinutes: z
    .number()
    .int()
    .positive('Duration must be a positive integer'),
});

/**
 * GET /api/reminders/upcoming
 * Fetch all upcoming active reminders for the authenticated user.
 */
remindersRouter.get(
  '/upcoming',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      // Fetch active reminders, ordered by deadline ascending
      const reminders = await prisma.reminder.findMany({
        where: {
          userId,
          status: 'active',
        },
        include: {
          email: {
            select: {
              id: true,
              subject: true,
              sender: true,
            },
          },
        },
        orderBy: {
          deadline: 'asc',
        },
      });

      return res.json(reminders);
    } catch (err: any) {
      logger.error('[Reminders] GET /upcoming error:', err.message);
      return res
        .status(500)
        .json({ error: 'Failed to fetch upcoming reminders' });
    }
  }
);

/**
 * POST /api/reminders/:id/snooze
 * Snooze an active reminder by a positive duration in minutes.
 */
remindersRouter.post(
  '/:id/snooze',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const id = req.params.id as string;

      const validation = snoozeSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.error.flatten(),
        });
      }

      const { durationMinutes } = validation.data;

      // Verify ownership
      const reminder = await prisma.reminder.findUnique({
        where: { id },
      });

      if (!reminder || reminder.userId !== userId) {
        return res.status(404).json({ error: 'Reminder not found' });
      }

      await ReminderSchedulerService.snoozeReminder(id, durationMinutes);

      logger.info('[Reminders] Reminder snoozed', {
        id,
        userId,
        durationMinutes,
      });
      return res.json({
        success: true,
        message: `Reminder snoozed for ${durationMinutes} minutes`,
      });
    } catch (err: any) {
      logger.error('[Reminders] POST /:id/snooze error:', err.message);
      return res.status(500).json({ error: 'Failed to snooze reminder' });
    }
  }
);

/**
 * POST /api/reminders/:id/cancel
 * Cancel an active reminder manually.
 */
remindersRouter.post(
  '/:id/cancel',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const id = req.params.id as string;

      // Verify ownership
      const reminder = await prisma.reminder.findUnique({
        where: { id },
      });

      if (!reminder || reminder.userId !== userId) {
        return res.status(404).json({ error: 'Reminder not found' });
      }

      const updated = await prisma.reminder.update({
        where: { id },
        data: { status: 'cancelled' },
      });

      logger.info('[Reminders] Reminder manually cancelled', { id, userId });
      return res.json(updated);
    } catch (err: any) {
      logger.error('[Reminders] POST /:id/cancel error:', err.message);
      return res.status(500).json({ error: 'Failed to cancel reminder' });
    }
  }
);
