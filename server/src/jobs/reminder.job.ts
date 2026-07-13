import { Queue, Worker, Job, ConnectionOptions } from '../utils/bullmq-wrapper';
import { PrismaClient } from '@prisma/client';
import { TelegramNotificationService } from '../services/telegram-notification.service';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

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
    logger.error(
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

export const reminderQueue = new Queue('reminderQueue', { connection });

export const reminderWorker = new Worker(
  'reminderQueue',
  async (job: Job) => {
    const { reminderId, userId, emailId, offset, isSnoozed } = job.data;
    logger.info(
      `[BullMQ Worker] Executing reminder job ${job.id} for reminder: ${reminderId}`
    );

    try {
      // 1. Fetch reminder status from DB to see if it is still active/valid
      const reminder = await prisma.reminder.findUnique({
        where: { id: reminderId },
        include: { email: true },
      });

      if (!reminder) {
        logger.warn(
          `[BullMQ Worker] Reminder ${reminderId} not found in DB. Skipping.`
        );
        return;
      }

      if (reminder.status === 'cancelled') {
        logger.info(
          `[BullMQ Worker] Reminder ${reminderId} is cancelled. Skipping.`
        );
        return;
      }

      // If this is a standard job, but reminder is currently snoozed in DB, skip this run
      if (
        !isSnoozed &&
        reminder.snoozeUntil &&
        reminder.snoozeUntil.getTime() > Date.now()
      ) {
        logger.info(
          `[BullMQ Worker] Reminder ${reminderId} is snoozed until ${reminder.snoozeUntil.toISOString()}. Skipping current run.`
        );
        return;
      }

      // 2. Format message
      const subject = reminder.email?.subject || 'Unnamed Thread';
      const title = 'Task Deadline Reminder';
      let content = '';

      if (isSnoozed) {
        content = `⏰ Snoozed Reminder: Follow-up on "${subject}". Deadline: ${new Date(reminder.deadline).toLocaleString()}`;
      } else if (offset === 1440) {
        content = `⏰ 24h Reminder: Follow-up on "${subject}". Deadline: ${new Date(reminder.deadline).toLocaleString()}`;
      } else if (offset === 60) {
        content = `⏰ 1h Reminder: Follow-up on "${subject}". Deadline: ${new Date(reminder.deadline).toLocaleString()}`;
      } else if (offset === 0) {
        content = `🚨 Deadline Reached: Follow-up on "${subject}" NOW! Deadline: ${new Date(reminder.deadline).toLocaleString()}`;
      } else {
        content = `⏰ Reminder: Follow-up on "${subject}". Deadline: ${new Date(reminder.deadline).toLocaleString()}`;
      }

      // 3. Create Notification in PostgreSQL
      await prisma.notification.create({
        data: {
          userId,
          type: 'action_item',
          title,
          message: content,
          metadata: { reminderId, emailId, offset, isSnoozed } as any,
        },
      });

      // 4. Send via Output Adapter (Telegram) if configured
      const settings = await prisma.userSettings.findFirst({
        where: { userId },
      });

      if (settings?.telegramEnabled && settings?.telegramChatId) {
        await TelegramNotificationService.sendNotification(
          settings.telegramChatId,
          title,
          content,
          offset === 0 ? 'high' : 'normal'
        );
      }

      // If at deadline offset, mark reminder as triggered
      if (offset === 0 && !isSnoozed) {
        await prisma.reminder.update({
          where: { id: reminderId },
          data: { status: 'triggered' },
        });
      }

      logger.info(
        `[BullMQ Worker] Successfully dispatched notification for reminder ${reminderId}`
      );
    } catch (err: any) {
      logger.error(
        `[BullMQ Worker] Error running reminder job: ${err.message || err}`
      );
      throw err;
    }
  },
  { connection }
);
