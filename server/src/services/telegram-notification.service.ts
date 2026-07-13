import { TelegramBotService } from './telegram-bot.service';
import { logger } from '../utils/logger';

export class TelegramNotificationService {
  /**
   * General-purpose notification method.
   */
  public static async sendNotification(
    chatId: string,
    title: string,
    content: string,
    priority: 'high' | 'normal' | 'digest' = 'normal'
  ): Promise<boolean> {
    const emojiMap = {
      high: '🚨',
      normal: '🔔',
      digest: '📂',
    };
    const emoji = emojiMap[priority] || '🔔';
    const text = `*${emoji} ${title}*\n\n${content}`;

    try {
      const res = await TelegramBotService.sendMessage(chatId, text);
      if (res.ok) {
        logger.info(
          `[TelegramNotification] Notification "${title}" sent successfully to chat ${chatId}`
        );
        return true;
      }
      logger.error(`[TelegramNotification] Telegram API returned error:`, res);
      return false;
    } catch (err: any) {
      logger.error(
        `[TelegramNotification] Exception sending message: ${err.message}`,
        err
      );
      return false;
    }
  }

  /**
   * Important email alert notification.
   */
  public static async sendImportantEmailAlert(
    chatId: string,
    email: { sender: string; subject: string; summary?: string }
  ): Promise<boolean> {
    const title = 'Important Email Received';
    let content = `*From:* ${email.sender}\n*Subject:* ${email.subject}`;
    if (email.summary) {
      content += `\n\n*AI Summary:*\n_${email.summary}_`;
    }
    return this.sendNotification(chatId, title, content, 'high');
  }

  /**
   * AI Summary generation alert.
   */
  public static async sendAISummaryAlert(
    chatId: string,
    emailSubject: string,
    summary: string
  ): Promise<boolean> {
    const title = 'AI Summary Generated';
    const content = `*Email Subject:* ${emailSubject}\n\n*Summary:*\n_${summary}_`;
    return this.sendNotification(chatId, title, content, 'normal');
  }

  /**
   * Task completed alert.
   */
  public static async sendTaskCompletedAlert(
    chatId: string,
    taskDescription: string
  ): Promise<boolean> {
    const title = 'Task Completed';
    const content = `✅ *Description:* ${taskDescription}`;
    return this.sendNotification(chatId, title, content, 'normal');
  }

  /**
   * Workflow finished alert.
   */
  public static async sendWorkflowFinishedAlert(
    chatId: string,
    workflowName: string
  ): Promise<boolean> {
    const title = 'Workflow Completed';
    const content = `⛓️ *Workflow:* \`${workflowName}\` executed successfully.`;
    return this.sendNotification(chatId, title, content, 'normal');
  }

  /**
   * Authentication alert.
   */
  public static async sendAuthAlert(
    chatId: string,
    message: string
  ): Promise<boolean> {
    const title = 'Security Alert';
    const content = `🔒 ${message}`;
    return this.sendNotification(chatId, title, content, 'high');
  }

  /**
   * System error alert.
   */
  public static async sendSystemErrorAlert(
    chatId: string,
    errorMsg: string
  ): Promise<boolean> {
    const title = 'System Error Logged';
    const content = `⚠️ *Error Details:*\n\`\`\`\n${errorMsg}\n\`\`\``;
    return this.sendNotification(chatId, title, content, 'high');
  }

  /**
   * Deadline reminder alert.
   * Sent when a BullMQ reminder job fires.
   */
  public static async sendReminderAlert(
    chatId: string,
    options: {
      emailSubject: string;
      deadline: Date;
      offsetLabel: string;
      isOverdue: boolean;
    }
  ): Promise<boolean> {
    const { emailSubject, deadline, offsetLabel, isOverdue } = options;

    // Format deadline in a readable UTC string
    const deadlineFormatted = deadline.toLocaleString('en-US', {
      timeZone: 'UTC',
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    const title = isOverdue
      ? '⚠️ Overdue Deadline!'
      : `🔔 Deadline Reminder — ${offsetLabel}`;

    const content = isOverdue
      ? `*Email:* ${emailSubject}\n*Deadline:* ${deadlineFormatted}\n\n_This deadline has passed. Please follow up._`
      : `*Email:* ${emailSubject}\n*Deadline:* ${deadlineFormatted}\n*Alert:* ${offsetLabel} reminder`;

    const priority = isOverdue ? 'high' : offsetLabel === 'at deadline' ? 'high' : 'normal';

    return this.sendNotification(chatId, title, content, priority);
  }
}

