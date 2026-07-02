import { logger } from '../utils/logger';

export interface TelegramConfigType {
  botToken: string;
  botUsername: string;
  mode: 'polling' | 'webhook';
  webhookUrl: string;
  webhookSecret: string;
  allowedChatIds: Set<string>;
}

const parseAllowedChatIds = (idsStr?: string): Set<string> => {
  const chatIdsSet = new Set<string>();
  if (idsStr) {
    idsStr
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0)
      .forEach((id) => chatIdsSet.add(id));
  }
  return chatIdsSet;
};

const getTelegramMode = (modeStr?: string, webhookUrl?: string): 'polling' | 'webhook' => {
  const normalized = (modeStr || '').toLowerCase().trim();
  if (normalized === 'webhook' && webhookUrl) {
    return 'webhook';
  }
  return 'polling';
};

export const TelegramConfig: TelegramConfigType = {
  botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  botUsername: process.env.TELEGRAM_BOT_USERNAME || '',
  mode: getTelegramMode(process.env.TELEGRAM_MODE, process.env.TELEGRAM_WEBHOOK_URL),
  webhookUrl: process.env.TELEGRAM_WEBHOOK_URL || '',
  webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET || '',
  allowedChatIds: parseAllowedChatIds(process.env.TELEGRAM_ALLOWED_CHAT_IDS),
};

// Startup validation and clean reporting
export function validateTelegramConfig(): boolean {
  if (!TelegramConfig.botToken) {
    logger.warn('[TelegramConfig] TELEGRAM_BOT_TOKEN is missing in local environment. Telegram integrations will be disabled.');
    return false;
  }

  logger.info(`[TelegramConfig] Configured with mode: ${TelegramConfig.mode.toUpperCase()}`);
  if (TelegramConfig.mode === 'webhook') {
    if (!TelegramConfig.webhookUrl) {
      logger.error('[TelegramConfig] Webhook mode specified but TELEGRAM_WEBHOOK_URL is undefined.');
      return false;
    }
    logger.info(`[TelegramConfig] Webhook URL configured: ${TelegramConfig.webhookUrl}/api/telegram/webhook`);
  } else {
    logger.info('[TelegramConfig] Bot running locally using long-polling fallback.');
  }

  if (TelegramConfig.allowedChatIds.size > 0) {
    logger.info(`[TelegramConfig] Restricting access to chat IDs whitelist: ${Array.from(TelegramConfig.allowedChatIds).join(', ')}`);
  } else {
    logger.info('[TelegramConfig] No allowed chat IDs whitelist specified. Accepting messages from all users.');
  }

  return true;
}
