import { ReminderSchedulerService } from '../services/actions/reminder-scheduler.service';
import { reminderQueue } from '../jobs/reminder.job';
import { TelegramNotificationService } from '../services/telegram-notification.service';
import { PrismaClient } from '@prisma/client';

// Mock PrismaClient
jest.mock('@prisma/client', () => {
  const mPrisma = {
    email: {
      findUnique: jest.fn(),
    },
    reminder: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
    userSettings: {
      findFirst: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn().mockImplementation(() => mPrisma),
  };
});

// Mock reminderQueue
jest.mock('../jobs/reminder.job', () => ({
  reminderQueue: {
    add: jest.fn(),
  },
}));

// Mock TelegramNotificationService
jest.mock('../services/telegram-notification.service', () => ({
  TelegramNotificationService: {
    sendNotification: jest.fn(),
  },
}));

const prisma = new PrismaClient();

describe('ReminderSchedulerService tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('scheduleReminders', () => {
    it('should schedule future offset jobs correctly', async () => {
      const emailId = 'email-123';
      const deadline = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days in the future

      (prisma.email.findUnique as jest.Mock).mockResolvedValue({
        id: emailId,
        userId: 'user-456',
        subject: 'Project deadline tomorrow',
      });

      (prisma.reminder.findFirst as jest.Mock).mockResolvedValue(null); // No existing reminder (no duplicate)

      (prisma.reminder.create as jest.Mock).mockResolvedValue({
        id: 'reminder-789',
        userId: 'user-456',
        emailId,
        deadline,
        offsets: [1440, 60, 0],
        status: 'active',
      });

      const reminders = await ReminderSchedulerService.scheduleReminders(
        emailId,
        [deadline]
      );

      expect(reminders).toHaveLength(1);
      expect(prisma.reminder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-456',
            emailId,
            deadline: new Date(deadline.toISOString()),
            offsets: [1440, 60, 0],
            status: 'active',
          }),
        })
      );

      // Should add three delayed jobs to reminderQueue (24h, 1h, 0m before deadline)
      expect(reminderQueue.add).toHaveBeenCalledTimes(3);
    });

    it('should trigger immediate notifications for past/overdue deadlines', async () => {
      const emailId = 'email-123';
      const deadline = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours in the past

      (prisma.email.findUnique as jest.Mock).mockResolvedValue({
        id: emailId,
        userId: 'user-456',
        subject: 'Overdue assignment submission',
      });

      (prisma.reminder.findFirst as jest.Mock).mockResolvedValue(null);

      (prisma.reminder.create as jest.Mock).mockResolvedValue({
        id: 'reminder-past',
        userId: 'user-456',
        emailId,
        deadline,
        offsets: [1440, 60, 0],
        status: 'active',
      });

      (prisma.userSettings.findFirst as jest.Mock).mockResolvedValue({
        userId: 'user-456',
        telegramEnabled: true,
        telegramChatId: 'chat-999',
      });

      const reminders = await ReminderSchedulerService.scheduleReminders(
        emailId,
        [deadline]
      );

      expect(reminders).toHaveLength(1);
      // Because deadline is in the past:
      // triggerPastDeadlineNotification is called for offsets 1440, 60, 0
      // since all trigger times are in the past
      expect(prisma.notification.create).toHaveBeenCalledTimes(3);
      expect(
        TelegramNotificationService.sendNotification
      ).toHaveBeenCalledTimes(3);
      // Future job scheduling should not happen
      expect(reminderQueue.add).not.toHaveBeenCalled();
    });

    it('should deduplicate and not schedule reminders if the same deadline exists', async () => {
      const emailId = 'email-123';
      const deadline = new Date(Date.now() + 5 * 60 * 60 * 1000); // 5 hours in future

      (prisma.email.findUnique as jest.Mock).mockResolvedValue({
        id: emailId,
        userId: 'user-456',
      });

      // Mock duplicate exists
      (prisma.reminder.findFirst as jest.Mock).mockResolvedValue({
        id: 'reminder-existing',
        userId: 'user-456',
        emailId,
        deadline,
        status: 'active',
      });

      const reminders = await ReminderSchedulerService.scheduleReminders(
        emailId,
        [deadline]
      );

      expect(reminders).toHaveLength(1);
      expect(reminders[0].id).toBe('reminder-existing');
      expect(prisma.reminder.create).not.toHaveBeenCalled();
      expect(reminderQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('cancelReminders', () => {
    it('should set active reminders status to cancelled', async () => {
      const emailId = 'email-123';

      await ReminderSchedulerService.cancelReminders(emailId);

      expect(prisma.reminder.updateMany).toHaveBeenCalledWith({
        where: {
          emailId,
          status: 'active',
        },
        data: {
          status: 'cancelled',
        },
      });
    });
  });

  describe('snoozeReminder', () => {
    it('should set snoozeUntil and enqueue a new delayed job', async () => {
      const reminderId = 'reminder-111';
      const durationMinutes = 30;

      (prisma.reminder.findUnique as jest.Mock).mockResolvedValue({
        id: reminderId,
        userId: 'user-456',
        emailId: 'email-123',
        deadline: new Date(),
        status: 'active',
      });

      await ReminderSchedulerService.snoozeReminder(
        reminderId,
        durationMinutes
      );

      expect(prisma.reminder.update).toHaveBeenCalledWith({
        where: { id: reminderId },
        data: expect.objectContaining({
          status: 'active',
          snoozeUntil: expect.any(Date),
        }),
      });

      expect(reminderQueue.add).toHaveBeenCalledWith(
        `snooze-${reminderId}`,
        expect.objectContaining({
          reminderId,
          isSnoozed: true,
        }),
        expect.objectContaining({
          delay: 30 * 60 * 1000,
        })
      );
    });
  });
});
