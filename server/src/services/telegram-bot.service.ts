import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { logger } from '../utils/logger';
import {
  TelegramConfig,
  validateTelegramConfig,
} from '../config/telegram.config';

const prisma = new PrismaClient();

export class TelegramBotService {
  private static get baseUrl() {
    return `https://api.telegram.org/bot${TelegramConfig.botToken}`;
  }

  private static isPollingActive = false;
  private static shouldStopPolling = false;
  private static pollingTimeoutId: NodeJS.Timeout | null = null;

  /**
   * Initializes the Telegram Bot.
   */
  public static async init(): Promise<void> {
    // Gracefully handle hot-reloads: stop active polling if already running
    if (this.isPollingActive) {
      logger.info(
        '[TelegramBot] Active polling session detected on initialization. Shutting down previous session...'
      );
      this.shutdown();
    }

    if (!validateTelegramConfig()) {
      return;
    }

    try {
      // 1. Verify Bot Token validity via getMe
      const me = await this.apiCall('getMe', {});
      if (!me.ok) {
        logger.error(
          '[TelegramBot] Failed to connect using the configured bot token. Bot services are disabled.',
          me
        );
        return;
      }

      logger.info(
        `[TelegramBot] Bot authenticated. Username: @${me.result.username}`
      );

      // Warn if configured bot username doesn't match authenticated bot info
      if (
        TelegramConfig.botUsername &&
        TelegramConfig.botUsername !== me.result.username
      ) {
        logger.warn(
          `[TelegramBot] Configured username @${TelegramConfig.botUsername} does not match verified username @${me.result.username}`
        );
      }

      // 2. Select Run Mode
      if (TelegramConfig.mode === 'webhook') {
        const registerUrl = `${TelegramConfig.webhookUrl}/api/telegram/webhook`;
        logger.info(
          `[TelegramBot] Running in WEBHOOK mode. Registering: ${registerUrl}`
        );

        const res = await this.apiCall('setWebhook', {
          url: registerUrl,
          secret_token: TelegramConfig.webhookSecret || undefined,
        });

        if (res.ok) {
          logger.info(
            '[TelegramBot] Webhook registered successfully with Telegram API.'
          );
        } else {
          logger.error('[TelegramBot] Webhook registration failed:', res);
        }
      } else {
        logger.info(
          '[TelegramBot] Running in POLLING mode. Starting background long-polling loop.'
        );
        this.startPolling();
      }
    } catch (err: any) {
      logger.error(
        `[TelegramBot] Exception during bot initialization: ${err.message}`,
        err
      );
    }
  }

  /**
   * Gracefully shuts down active long-polling sessions.
   */
  public static shutdown(): void {
    logger.info('[TelegramBot] Shutting down bot client...');
    this.shouldStopPolling = true;
    if (this.pollingTimeoutId) {
      clearTimeout(this.pollingTimeoutId);
      this.pollingTimeoutId = null;
    }
    this.isPollingActive = false;
  }

  /**
   * Diagnostic indicator returning connection, webhook, and API health status.
   */
  public static async checkHealth(): Promise<{
    connected: boolean;
    webhookActive: boolean;
    reachable: boolean;
  }> {
    if (!TelegramConfig.botToken) {
      return { connected: false, webhookActive: false, reachable: false };
    }

    try {
      const res = await axios.get(`${this.baseUrl}/getMe`, {
        timeout: 3000,
      });

      if (res.status !== 200) {
        return {
          connected: true,
          webhookActive: TelegramConfig.mode === 'webhook',
          reachable: false,
        };
      }

      const info = await this.apiCall('getWebhookInfo', {});
      const webhookActive = !!(
        TelegramConfig.mode === 'webhook' &&
        info.ok &&
        info.result.url === `${TelegramConfig.webhookUrl}/api/telegram/webhook`
      );

      return {
        connected: true,
        webhookActive,
        reachable: true,
      };
    } catch {
      return {
        connected: true,
        webhookActive: TelegramConfig.mode === 'webhook',
        reachable: false,
      };
    }
  }

  /**
   * Routes updates to appropriate command handlers.
   */
  public static async handleUpdate(update: any): Promise<void> {
    if (!update || typeof update !== 'object') return;

    const message = update.message;
    if (!message || !message.chat || !message.chat.id) return;

    const chatId = String(message.chat.id);
    const text = (message.text || '').trim();

    // Check Whitelist security filter
    if (
      TelegramConfig.allowedChatIds.size > 0 &&
      !TelegramConfig.allowedChatIds.has(chatId)
    ) {
      logger.warn(
        `[TelegramBot] Rejected unauthorized message attempt from chat ID: ${chatId}.`
      );
      await this.sendMessage(
        chatId,
        '⚠️ *Access Denied.*\nYour chat ID is not authorized to interact with this InboxOS instance.'
      );
      return;
    }

    logger.info(
      `[TelegramBot] Received command: "${text}" from chat: ${chatId}`
    );

    try {
      if (text.startsWith('/start')) {
        await this.handleStartCommand(chatId, text);
      } else if (text.startsWith('/help')) {
        await this.handleHelpCommand(chatId);
      } else if (text.startsWith('/status')) {
        await this.handleStatusCommand(chatId);
      } else if (text.startsWith('/inbox')) {
        await this.handleInboxCommand(chatId);
      } else if (text.startsWith('/done')) {
        await this.handleDoneCommand(chatId, text);
      } else {
        await this.sendMessage(
          chatId,
          '❓ *Unknown Command.*\nSend /help to see the list of available commands.'
        );
      }
    } catch (err: any) {
      logger.error(
        `[TelegramBot] Error executing command handler: ${err.message}`,
        err
      );
      await this.sendMessage(
        chatId,
        '❌ *An error occurred* while processing your request.'
      );
    }
  }

  /**
   * Low-level fetch wrapper calling Telegram Bot API. Handles HTTP 429 rate limiting with exponential backoff.
   */
  public static async apiCall(
    method: string,
    body: any,
    attempt = 1
  ): Promise<any> {
    if (!TelegramConfig.botToken) {
      return { ok: false, error: 'Token missing' };
    }

    const url = `${this.baseUrl}/${method}`;
    const maxAttempts = 5;

    try {
      const response = await axios.post(url, body, {
        headers: {
          'Content-Type': 'application/json',
        },
        validateStatus: () => true, // Don't throw on HTTP status codes
      });

      if (response.status === 429) {
        const retryAfterHeader = response.headers['retry-after'];
        const retryAfterSeconds = retryAfterHeader
          ? parseInt(Array.isArray(retryAfterHeader) ? retryAfterHeader[0] : retryAfterHeader, 10)
          : Math.pow(2, attempt);
        logger.warn(
          `[TelegramBot] Rate limited (429) on API call "${method}". Retrying in ${retryAfterSeconds}s...`
        );

        if (attempt < maxAttempts) {
          await new Promise((resolve) =>
            setTimeout(resolve, retryAfterSeconds * 1000)
          );
          return this.apiCall(method, body, attempt + 1);
        }
      }

      return response.data;
    } catch (err: any) {
      logger.error(
        `[TelegramBot] API connection error on "${method}": ${err.message}`
      );
      if (attempt < maxAttempts) {
        const delay = Math.pow(2, attempt) * 1000;
        logger.warn(
          `[TelegramBot] Retrying connection to "${method}" in ${delay / 1000}s...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.apiCall(method, body, attempt + 1);
      }
      return { ok: false, error: err.message };
    }
  }

  /**
   * Helper sending formatted message payload.
   */
  public static async sendMessage(
    chatId: string | number,
    text: string,
    options: { parseMode?: 'Markdown' | 'HTML'; replyMarkup?: any } = {}
  ): Promise<any> {
    return this.apiCall('sendMessage', {
      chat_id: String(chatId),
      text,
      parse_mode: options.parseMode || 'Markdown',
      reply_markup: options.replyMarkup,
    });
  }

  /**
   * Helper editing message payload.
   */
  public static async editMessage(
    chatId: string | number,
    messageId: number,
    text: string,
    options: { parseMode?: 'Markdown' | 'HTML'; replyMarkup?: any } = {}
  ): Promise<any> {
    return this.apiCall('editMessageText', {
      chat_id: String(chatId),
      message_id: messageId,
      text,
      parse_mode: options.parseMode || 'Markdown',
      reply_markup: options.replyMarkup,
    });
  }

  /**
   * Helper deleting message payload.
   */
  public static async deleteMessage(
    chatId: string | number,
    messageId: number
  ): Promise<any> {
    return this.apiCall('deleteMessage', {
      chat_id: String(chatId),
      message_id: messageId,
    });
  }

  // ─── Command Handlers ──────────────────────────────────────────────────────────

  private static async handleStartCommand(
    chatId: string,
    text: string
  ): Promise<void> {
    const parts = text.split(/\s+/);
    if (parts.length < 2) {
      await this.sendMessage(
        chatId,
        '📬 *Welcome to InboxOS!*\n\nTo link your Telegram chat to your InboxOS workspace, please send:\n`/start <your-user-id>`'
      );
      return;
    }

    const token = parts[1];

    // Validate User id exists in Postgres
    const user = await prisma.user.findUnique({
      where: { id: token },
    });

    if (!user) {
      await this.sendMessage(
        chatId,
        '❌ *Linking failed.*\nInvalid token or user workspace not found.'
      );
      return;
    }

    // Link chat identifier
    await prisma.userSettings.upsert({
      where: { userId: token },
      update: {
        telegramChatId: chatId,
        telegramEnabled: true,
      },
      create: {
        userId: token,
        theme: 'dark',
        telegramChatId: chatId,
        telegramEnabled: true,
      },
    });

    await this.sendMessage(
      chatId,
      '✅ *Account linked successfully!*\n\nYou will now receive important notifications here. Send /inbox to see your workspace action items.'
    );
  }

  private static async handleHelpCommand(chatId: string): Promise<void> {
    const helpMessage = `📬 *InboxOS Bot Commands*
------------------------
/start \`<user-id>\` - Link your InboxOS workspace
/inbox - View pending action items
/done \`<task-id>\` - Mark an item as completed
/status - Check bot status
/help - Show this help guide`;
    await this.sendMessage(chatId, helpMessage);
  }

  private static async handleStatusCommand(chatId: string): Promise<void> {
    const health = await this.checkHealth();
    const statusMessage = `🤖 *InboxOS Bot Status*
------------------------
*Bot API:* ${health.reachable ? '✅ Reachable' : '❌ Unreachable'}
*Mode:* ${TelegramConfig.mode.toUpperCase()}
*Webhook:* ${health.webhookActive ? '✅ Active' : '❌ Inactive'}
*System:* ✅ Running`;
    await this.sendMessage(chatId, statusMessage);
  }

  private static async handleInboxCommand(chatId: string): Promise<void> {
    const settings = await prisma.userSettings.findFirst({
      where: { telegramChatId: chatId, telegramEnabled: true },
    });

    if (!settings) {
      await this.sendMessage(
        chatId,
        '⚠️ Please link your InboxOS account first by sending:\n`/start <your-user-id>`'
      );
      return;
    }

    const actionItems = await prisma.actionItem.findMany({
      where: {
        isCompleted: false,
        email: {
          userId: settings.userId,
        },
      },
      include: {
        email: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (actionItems.length === 0) {
      await this.sendMessage(
        chatId,
        '📥 *Your InboxOS is clean!*\nNo pending actions.'
      );
      return;
    }

    let msg = `📥 *Pending InboxOS Actions:*\n\n`;
    actionItems.forEach((item, idx) => {
      msg += `*${idx + 1}. ${item.taskDescription}*\n`;
      msg += `_Subject:_ ${item.email.subject}\n`;
      msg += `_Mark complete:_ \`/done ${item.id}\`\n\n`;
    });

    await this.sendMessage(chatId, msg);
  }

  private static async handleDoneCommand(
    chatId: string,
    text: string
  ): Promise<void> {
    const parts = text.split(/\s+/);
    if (parts.length < 2) {
      await this.sendMessage(chatId, '⚠️ Usage: \`/done <task-id>\`');
      return;
    }

    const taskId = parts[1];

    const settings = await prisma.userSettings.findFirst({
      where: { telegramChatId: chatId, telegramEnabled: true },
    });

    if (!settings) {
      await this.sendMessage(
        chatId,
        '⚠️ Please link your InboxOS account first by sending:\n`/start <your-user-id>`'
      );
      return;
    }

    const actionItem = await prisma.actionItem.findFirst({
      where: {
        id: taskId,
        email: {
          userId: settings.userId,
        },
      },
    });

    if (!actionItem) {
      await this.sendMessage(
        chatId,
        '❌ *Task not found* in your pending backlog.'
      );
      return;
    }

    await prisma.actionItem.update({
      where: { id: taskId },
      data: { isCompleted: true },
    });

    await this.sendMessage(
      chatId,
      `✅ *Task completed:* ${actionItem.taskDescription}`
    );
  }

  // ─── Polling fallback loop ─────────────────────────────────────────────────────

  private static startPolling(): void {
    this.isPollingActive = true;
    this.shouldStopPolling = false;
    this.pollUpdates(0);
  }

  private static async pollUpdates(offset: number): Promise<void> {
    if (this.shouldStopPolling) {
      this.isPollingActive = false;
      return;
    }

    try {
      const res = await this.apiCall('getUpdates', {
        offset: offset || undefined,
        timeout: 30,
      });

      if (res && res.ok && Array.isArray(res.result)) {
        let nextOffset = offset;
        for (const update of res.result) {
          nextOffset = Math.max(nextOffset, update.update_id + 1);
          this.handleUpdate(update).catch((e) =>
            logger.error('[TelegramBot] Polling update handling error:', e)
          );
        }

        if (!this.shouldStopPolling) {
          this.pollingTimeoutId = setTimeout(
            () => this.pollUpdates(nextOffset),
            500
          );
        }
      } else {
        if (!this.shouldStopPolling) {
          this.pollingTimeoutId = setTimeout(
            () => this.pollUpdates(offset),
            5000
          );
        }
      }
    } catch (err: any) {
      logger.error(`[TelegramBot] Polling connection error: ${err.message}`);
      if (!this.shouldStopPolling) {
        this.pollingTimeoutId = setTimeout(
          () => this.pollUpdates(offset),
          5000
        );
      }
    }
  }
}
