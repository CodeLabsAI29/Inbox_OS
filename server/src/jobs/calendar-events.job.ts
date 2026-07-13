import { Queue, Worker, Job, ConnectionOptions } from '../utils/bullmq-wrapper';
import { CalendarCreatorService } from '../services/actions/calendar-creator.service';
import { CalendarEventData } from '../services/actions/calendar-extractor.service';
import { logger } from '../utils/logger';

const getRedisConnectionOptions = (): ConnectionOptions => {
  const urlStr = process.env.REDIS_URL || 'redis://localhost:6379/0';
  try {
    const parsed = new URL(urlStr);
    return {
      host: parsed.hostname || 'localhost',
      port: parsed.port ? parseInt(parsed.port, 10) : 6379,
      username: parsed.username || undefined,
      password: parsed.password || undefined,
      db: parsed.pathname
        ? parseInt(parsed.pathname.substring(1) || '0', 10)
        : 0,
      maxRetriesPerRequest: null,
      tls: parsed.protocol === 'rediss:' ? { rejectUnauthorized: false } : undefined,
    };
  } catch (error) {
    console.error(
      'Failed to parse REDIS_URL, falling back to default localhost options:',
      error
    );
    return {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null,
    };
  }
};

const connection = getRedisConnectionOptions();

// Queue for calendar event creation
export const calendarEventsQueue = new Queue('calendarEventsQueue', {
  connection,
});

// Worker for calendar event creation
export const calendarEventsWorker = new Worker(
  'calendarEventsQueue',
  async (
    job: Job<{ userId: string; emailId: string; eventData: CalendarEventData }>
  ) => {
    const { userId, emailId, eventData } = job.data;
    logger.info(
      `[BullMQ Worker] Starting calendar event creation job ${job.id} for email: ${emailId}`
    );

    // Adjust date/time strings back to Date objects (since JSON serialization in BullMQ converts them to strings)
    const formattedEventData: CalendarEventData = {
      ...eventData,
      startTime: new Date(eventData.startTime),
      endTime: new Date(eventData.endTime),
    };

    try {
      await CalendarCreatorService.createGoogleCalendarEvent(
        formattedEventData,
        userId,
        emailId
      );
      logger.info(
        `[BullMQ Worker] Calendar event creation job ${job.id} succeeded.`
      );
    } catch (err: any) {
      logger.error(
        `[BullMQ Worker] Job ${job.id} failed with error: ${err.message || err}. Requeuing/Retrying.`
      );
      throw err; // Throw error to let BullMQ trigger attempts and retry
    }
  },
  { connection }
);
