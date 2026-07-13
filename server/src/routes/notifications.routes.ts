import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  requireAuth,
  AuthenticatedRequest,
} from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

export const notificationsRouter = Router();
const prisma = new PrismaClient();

/**
 * GET /api/notifications
 * List notifications for the authenticated user
 */
notificationsRouter.get(
  '/',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const unreadOnly = req.query.unread === 'true';

      const where: any = { userId };
      if (unreadOnly) where.isRead = false;

      const [notifications, total, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.notification.count({ where }),
        prisma.notification.count({ where: { userId, isRead: false } }),
      ]);

      return res.json({ notifications, total, unreadCount, limit, offset });
    } catch (err: any) {
      logger.error('[Notifications] GET / error:', err.message);
      return res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  }
);

/**
 * PATCH /api/notifications/:id/read
 * Mark a notification as read
 */
notificationsRouter.patch(
  '/:id/read',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const id = req.params.id as string;
      const notification = await prisma.notification.findUnique({
        where: { id },
      });

      if (!notification || notification.userId !== userId) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      const updated = await prisma.notification.update({
        where: { id },
        data: { isRead: true },
      });

      return res.json(updated);
    } catch (err: any) {
      logger.error('[Notifications] PATCH /:id/read error:', err.message);
      return res
        .status(500)
        .json({ error: 'Failed to mark notification as read' });
    }
  }
);

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
notificationsRouter.delete(
  '/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const id = req.params.id as string;
      const notification = await prisma.notification.findUnique({
        where: { id },
      });

      if (!notification || notification.userId !== userId) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      await prisma.notification.delete({ where: { id } });
      logger.info('[Notifications] Deleted', { id, userId });
      return res.json({ message: 'Notification deleted successfully' });
    } catch (err: any) {
      logger.error('[Notifications] DELETE /:id error:', err.message);
      return res.status(500).json({ error: 'Failed to delete notification' });
    }
  }
);
