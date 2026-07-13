import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  requireAuth,
  AuthenticatedRequest,
} from '../middleware/auth.middleware';
import { CalendarExtractorService } from '../services/actions/calendar-extractor.service';
import { calendarEventsQueue } from '../jobs/calendar-events.job';
import { logger } from '../utils/logger';
import { z } from 'zod';

export const calendarRouter = Router();
const prisma = new PrismaClient();

const createEventSchema = z.object({
  emailId: z.string().uuid('Invalid emailId'),
  title: z.string().min(1).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  location: z.string().optional(),
  attendees: z.array(z.string().email()).optional(),
  meetingLink: z.string().url().optional(),
  pushToGoogle: z.boolean().optional().default(false),
});

/**
 * GET /api/calendar/events
 * List calendar events for the authenticated user
 */
calendarRouter.get(
  '/',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const status = req.query.status as string | undefined;
      const from = req.query.from
        ? new Date(req.query.from as string)
        : undefined;
      const to = req.query.to ? new Date(req.query.to as string) : undefined;

      const where: any = { userId };
      if (status) where.status = status;
      if (from || to) {
        where.startTime = {};
        if (from) where.startTime.gte = from;
        if (to) where.startTime.lte = to;
      }

      const [events, total] = await Promise.all([
        prisma.calendarEvent.findMany({
          where,
          orderBy: { startTime: 'asc' },
          take: limit,
          skip: offset,
        }),
        prisma.calendarEvent.count({ where }),
      ]);

      logger.info('[Calendar] Fetched events', { userId, total });
      return res.json({ events, total, limit, offset });
    } catch (err: any) {
      logger.error('[Calendar] GET / error:', err.message);
      return res.status(500).json({ error: 'Failed to fetch calendar events' });
    }
  }
);

/**
 * GET /api/calendar/events/:emailId
 * List calendar events associated with a specific email
 */
calendarRouter.get(
  '/:emailId',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const emailId = req.params.emailId as string;

      const events = await prisma.calendarEvent.findMany({
        where: {
          userId,
          emailId,
        },
        orderBy: { startTime: 'asc' },
      });

      logger.info('[Calendar] Fetched events for email', {
        userId,
        emailId,
        count: events.length,
      });
      return res.json(events);
    } catch (err: any) {
      logger.error('[Calendar] GET /:emailId error:', err.message);
      return res
        .status(500)
        .json({ error: 'Failed to fetch calendar events for email' });
    }
  }
);

/**
 * POST /api/calendar/events
 * Create a calendar event from an email (extracts details or uses provided data)
 */
calendarRouter.post(
  '/',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const validation = createEventSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.error.flatten(),
        });
      }

      const {
        emailId,
        title,
        startTime,
        endTime,
        location,
        attendees,
        meetingLink,
        pushToGoogle,
      } = validation.data;

      // Verify email belongs to user
      const email = await prisma.email.findFirst({
        where: { id: emailId as string, userId },
      });
      if (!email) {
        return res.status(404).json({ error: 'Email not found' });
      }

      // Auto-extract if no explicit times provided
      let eventData: any;
      if (!startTime || !endTime) {
        const extracted = CalendarExtractorService.extractEventDetails(email);
        if (!extracted) {
          return res.status(422).json({
            error:
              'Could not extract event details from email. Please provide startTime and endTime manually.',
          });
        }
        eventData = extracted;
      } else {
        eventData = {
          title: title || email.subject,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          location,
          attendees: attendees || [email.sender, email.recipient],
          meetingLink,
        };
      }

      // Save a pending CalendarEvent record
      const calEvent = await prisma.calendarEvent.create({
        data: {
          userId,
          emailId,
          title: eventData.title,
          startTime: eventData.startTime,
          endTime: eventData.endTime,
          location: eventData.location,
          attendees: eventData.attendees,
          meetingLink: eventData.meetingLink,
          status: 'pending',
        },
      });

      // Optionally push to Google Calendar via BullMQ
      if (pushToGoogle) {
        await calendarEventsQueue.add('createGoogleEvent', {
          userId,
          emailId,
          eventData,
        });
        logger.info('[Calendar] Queued Google Calendar sync job', {
          userId,
          emailId,
        });
      }

      logger.info('[Calendar] Event created', { id: calEvent.id, userId });
      return res.status(201).json(calEvent);
    } catch (err: any) {
      logger.error('[Calendar] POST / error:', err.message);
      return res.status(500).json({ error: 'Failed to create calendar event' });
    }
  }
);

/**
 * DELETE /api/calendar/events/:id
 * Delete a calendar event
 */
calendarRouter.delete(
  '/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const id = req.params.id as string;
      const event = await prisma.calendarEvent.findUnique({ where: { id } });

      if (!event || event.userId !== userId) {
        return res.status(404).json({ error: 'Calendar event not found' });
      }

      await prisma.calendarEvent.delete({ where: { id } });
      logger.info('[Calendar] Event deleted', { id, userId });
      return res.json({ message: 'Calendar event deleted successfully' });
    } catch (err: any) {
      logger.error('[Calendar] DELETE /:id error:', err.message);
      return res.status(500).json({ error: 'Failed to delete calendar event' });
    }
  }
);
