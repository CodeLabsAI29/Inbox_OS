import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  requireAuth,
  AuthenticatedRequest,
} from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

export const tasksRouter = Router();
const prisma = new PrismaClient();

/**
 * GET /api/tasks
 * List all action items for the authenticated user
 */
tasksRouter.get(
  '/',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const showCompleted = req.query.completed === 'true';
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const where: any = {
        email: { userId },
      };
      if (!showCompleted) {
        where.isCompleted = false;
      }

      const [tasks, total] = await Promise.all([
        prisma.actionItem.findMany({
          where,
          orderBy: [{ isCompleted: 'asc' }, { createdAt: 'desc' }],
          take: limit,
          skip: offset,
          include: {
            email: {
              select: {
                id: true,
                subject: true,
                sender: true,
                createdAt: true,
              },
            },
          },
        }),
        prisma.actionItem.count({ where }),
      ]);

      logger.info('[Tasks] Fetched tasks', { userId, total });
      return res.json({ tasks, total, limit, offset });
    } catch (err: any) {
      logger.error('[Tasks] GET / error:', err.message);
      return res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  }
);

/**
 * PATCH /api/tasks/:id
 * Update a task (mark complete/incomplete, update description)
 */
tasksRouter.patch(
  '/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { id } = req.params;
      const { isCompleted, taskDescription } = req.body;

      // Verify ownership via email relation
      const task = await prisma.actionItem.findUnique({
        where: { id: id as string },
        include: { email: { select: { userId: true } } },
      });

      if (!task || (task as any).email.userId !== userId) {
        return res.status(404).json({ error: 'Task not found' });
      }

      const updated = await prisma.actionItem.update({
        where: { id: id as string },
        data: {
          ...(isCompleted !== undefined && { isCompleted }),
          ...(taskDescription !== undefined && { taskDescription }),
        },
      });

      if (isCompleted === true) {
        try {
          const { ReminderSchedulerService } =
            await import('../services/actions/reminder-scheduler.service');
          await ReminderSchedulerService.cancelReminders(task.emailId);
        } catch (remErr) {
          logger.error(
            '[Tasks] Failed to cancel reminders on task completion:',
            remErr
          );
        }
      }

      logger.info('[Tasks] Task updated', { id, userId });
      return res.json(updated);
    } catch (err: any) {
      logger.error('[Tasks] PATCH /:id error:', err.message);
      return res.status(500).json({ error: 'Failed to update task' });
    }
  }
);

/**
 * DELETE /api/tasks/:id
 * Delete a task
 */
tasksRouter.delete(
  '/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { id } = req.params;

      const task = await prisma.actionItem.findUnique({
        where: { id: id as string },
        include: { email: { select: { userId: true } } },
      });

      if (!task || (task as any).email.userId !== userId) {
        return res.status(404).json({ error: 'Task not found' });
      }

      await prisma.actionItem.delete({ where: { id: id as string } });
      logger.info('[Tasks] Task deleted', { id, userId });
      return res.json({ message: 'Task deleted successfully' });
    } catch (err: any) {
      logger.error('[Tasks] DELETE /:id error:', err.message);
      return res.status(500).json({ error: 'Failed to delete task' });
    }
  }
);
