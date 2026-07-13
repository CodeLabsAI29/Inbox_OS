import { PrismaClient, Reminder } from '@prisma/client';
import { reminderQueue } from '../../jobs/reminder.job';
import { TelegramNotificationService } from '../telegram-notification.service';
import { logger } from '../../utils/logger';

const prisma = new PrismaClient();

export class ReminderSchedulerService {
  /**
   * Schedule reminders for an email based on extracted deadlines.
   * Default offsets: 24 hours (1440m) before, 1 hour (60m) before, at deadline (0m).
   */
  public static async scheduleReminders(
    emailId: string,
    deadlines: Date[]
  ): Promise<Reminder[]> {
    logger.info(
      `[ReminderScheduler] Scheduling reminders for email: ${emailId}`,
      {
        deadlineCount: deadlines.length,
      }
    );

    const email = await prisma.email.findUnique({
      where: { id: emailId },
    });

    if (!email) {
      logger.error(`[ReminderScheduler] Email not found: ${emailId}`);
      return [];
    }

    const defaultOffsets = [1440, 60, 0]; // minutes: 24h, 1h, at deadline
    const savedReminders: Reminder[] = [];

    for (const deadline of deadlines) {
      const deadlineUtc = new Date(deadline.toISOString());

      // 1. Deduplicate: check if a reminder for same emailId and deadline (UTC time) already exists
      const existing = await prisma.reminder.findFirst({
        where: {
          emailId,
          deadline: deadlineUtc,
        },
      });

      if (existing) {
        logger.info(
          `[ReminderScheduler] Reminder for email ${emailId} at ${deadlineUtc.toISOString()} already exists. Skipping.`
        );
        savedReminders.push(existing);
        continue;
      }

      // 2. Create Reminder record in database
      const reminder = await prisma.reminder.create({
        data: {
          userId: email.userId,
          emailId: email.id,
          deadline: deadlineUtc,
          offsets: defaultOffsets,
          status: 'active',
        },
      });

      savedReminders.push(reminder);

      // 3. Schedule jobs for each offset
      for (const offset of defaultOffsets) {
        const triggerTime = new Date(
          deadlineUtc.getTime() - offset * 60 * 1000
        );
        const delay = triggerTime.getTime() - Date.now();

        if (delay <= 0) {
          // Graceful handling of past/overdue deadlines: trigger immediately
          logger.info(
            `[ReminderScheduler] Calculated trigger time ${triggerTime.toISOString()} is in the past. Triggering immediate notification.`
          );
          await this.triggerPastDeadlineNotification(
            reminder.id,
            email.userId,
            email.id,
            deadlineUtc,
            offset
          );
        } else {
          // Future deadline: queue delayed job via BullMQ
          await reminderQueue.add(
            `reminder-${reminder.id}-${offset}`,
            {
              reminderId: reminder.id,
              userId: email.userId,
              emailId: email.id,
              deadline: deadlineUtc,
              offset,
              isSnoozed: false,
            },
            {
              delay,
              removeOnComplete: true,
              removeOnFail: true,
            }
          );
          logger.info(
            `[ReminderScheduler] Enqueued BullMQ delayed job for reminder ${reminder.id} offset ${offset}m with delay ${delay}ms`
          );
        }
      }
    }

    return savedReminders;
  }

  /**
   * Immediately trigger a notification for a past deadline, setting overdue metadata.
   */
  private static async triggerPastDeadlineNotification(
    reminderId: string,
    userId: string,
    emailId: string,
    deadline: Date,
    offset: number
  ): Promise<void> {
    try {
      const email = await prisma.email.findUnique({
        where: { id: emailId },
      });
      const subject = email?.subject || 'Unnamed Thread';

      const title = '⚠️ Overdue Task Reminder';
      const content = `🚨 Overdue Reminder: Follow-up on "${subject}". Deadline: ${deadline.toLocaleString()}`;

      // Create Notification in DB
      await prisma.notification.create({
        data: {
          userId,
          type: 'action_item',
          title,
          message: content,
          metadata: { reminderId, emailId, offset, overdue: true } as any,
        },
      });

      // Send via Telegram if enabled
      const settings = await prisma.userSettings.findFirst({
        where: { userId },
      });

      if (settings?.telegramEnabled && settings?.telegramChatId) {
        await TelegramNotificationService.sendNotification(
          settings.telegramChatId,
          title,
          content,
          'high'
        );
      }
    } catch (err: any) {
      logger.error(
        `[ReminderScheduler] Failed to dispatch past deadline notification: ${err.message || err}`
      );
    }
  }

  /**
   * Snooze a reminder for a given number of minutes.
   */
  public static async snoozeReminder(
    reminderId: string,
    durationMinutes: number
  ): Promise<void> {
    const reminder = await prisma.reminder.findUnique({
      where: { id: reminderId },
    });

    if (!reminder) {
      logger.error(
        `[ReminderScheduler] Cannot snooze reminder: ${reminderId} not found`
      );
      return;
    }

    const snoozeUntil = new Date(Date.now() + durationMinutes * 60 * 1000);

    // Update database status and snoozeUntil
    await prisma.reminder.update({
      where: { id: reminderId },
      data: {
        snoozeUntil,
        status: 'active', // Reset to active so it executes again
      },
    });

    // Schedule the snoozed execution delayed job
    const delay = durationMinutes * 60 * 1000;
    await reminderQueue.add(
      `snooze-${reminder.id}`,
      {
        reminderId: reminder.id,
        userId: reminder.userId,
        emailId: reminder.emailId,
        deadline: reminder.deadline,
        offset: 0,
        isSnoozed: true,
      },
      {
        delay,
        removeOnComplete: true,
        removeOnFail: true,
      }
    );

    logger.info(
      `[ReminderScheduler] Snoozed reminder ${reminderId} for ${durationMinutes} minutes (delay: ${delay}ms)`
    );
  }

  /**
   * Cancel all active reminders for a specific email.
   * Typically called when a task is completed/marked done.
   */
  public static async cancelReminders(emailId: string): Promise<void> {
    await prisma.reminder.updateMany({
      where: {
        emailId,
        status: 'active',
      },
      data: {
        status: 'cancelled',
      },
    });

    logger.info(
      `[ReminderScheduler] Cancelled all active reminders for email: ${emailId}`
    );
  }

  public static initWorker(): void {
    logger.info('[ReminderScheduler] initWorker stub called (delegated to separate worker process)');
  }

  public static async shutdown(): Promise<void> {
    logger.info('[ReminderScheduler] shutdown stub called');
  }
}
