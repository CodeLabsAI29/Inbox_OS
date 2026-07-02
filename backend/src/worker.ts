import { EventBus } from './services/event-bus.service';
import { PrismaClient } from '@prisma/client';
import { AIService } from './services/ai.service';
import { logger } from './utils/logger';
import { emailsProcessedCounter } from './utils/metrics';
import { RulesEngineService } from './services/rules-engine.service';
import { TelegramNotificationService } from './services/telegram-notification.service';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();

/**
 * Subscribes to the event bus and processes emails asynchronously.
 * Logs structured JSON events and updates Prometheus metrics.
 */
export async function registerWorkerHandlers() {
  logger.info('Registering email processing workers...');

  // Subscribe to 'email.received' topic
  await EventBus.subscribe(
    'email.received',
    async (payload: { emailId: string }) => {
      const { emailId } = payload;
      logger.info('[Worker] Received email.received event', { emailId });

      let email: any = null;
      try {
        // 1. Fetch the email from database
        email = await prisma.email.findUnique({
          where: { id: emailId },
        });

        if (!email) {
          logger.error('[Worker] Email not found in database', { emailId });
          return;
        }

        logger.info('[Worker] Processing email classification', { emailId });

        // 2. Classify email using AIService
        const result = await AIService.classifyEmail(email.subject, email.body);
        logger.info('[Worker] Email classification result', {
          emailId,
          category: result.category,
          confidence: result.confidence,
        });

        // 3. Update the email with the category
        const updatedEmail = await prisma.email.update({
          where: { id: email.id },
          data: {
            category: result.category,
          },
        });

        logger.info(
          '[Worker] Email classification updated successfully in database',
          { emailId }
        );

        // If classified as 'urgent', send Telegram alert notification if enabled
        if (updatedEmail.category === 'urgent') {
          try {
            const settings = await prisma.userSettings.findFirst({
              where: { userId: email.userId, telegramEnabled: true },
            });
            if (settings && settings.telegramChatId) {
              await TelegramNotificationService.sendImportantEmailAlert(
                settings.telegramChatId,
                {
                  sender: updatedEmail.sender,
                  subject: updatedEmail.subject,
                  summary: updatedEmail.body,
                }
              );
            }
          } catch (teleErr) {
            logger.error(
              '[Worker] Failed to send Telegram urgent email alert:',
              teleErr
            );
          }
        }

        // 3.5 Evaluate rules engine logic against the email
        try {
          await RulesEngineService.evaluateRules(updatedEmail, email.userId);
        } catch (ruleErr: any) {
          logger.error('[Worker] Rules engine execution failed', {
            emailId,
            error: ruleErr.message || ruleErr,
          });
        }

        // 4. Extract and save actions
        logger.info('[Worker] Extracting action items from email', { emailId });
        const actions = await AIService.extractActions(
          email.subject,
          email.body
        );

        if (actions && actions.length > 0) {
          logger.info('[Worker] Saving extracted action items', {
            emailId,
            count: actions.length,
          });
          await prisma.actionItem.createMany({
            data: actions.map((task) => ({
              emailId: email.id,
              taskDescription: task,
              isCompleted: false,
            })),
          });
          logger.info('[Worker] Saved action items successfully', { emailId });
        } else {
          logger.info('[Worker] No action items extracted from email', {
            emailId,
          });
        }

        // 4.5 Generate thread summary and email vector embedding
        try {
          logger.info('[Worker] Generating thread summary', {
            threadId: email.threadId,
          });
          const summary = await AIService.generateSummary(email.threadId);

          // Alert Telegram about summary if enabled
          try {
            const settings = await prisma.userSettings.findFirst({
              where: { userId: email.userId, telegramEnabled: true },
            });
            if (settings && settings.telegramChatId) {
              await TelegramNotificationService.sendAISummaryAlert(
                settings.telegramChatId,
                email.subject,
                summary
              );
            }
          } catch (teleErr) {
            logger.error(
              '[Worker] Failed to send Telegram summary alert:',
              teleErr
            );
          }
        } catch (sumErr: any) {
          logger.error('[Worker] Thread summarization failed', {
            threadId: email.threadId,
            error: sumErr.message || sumErr,
          });
        }

        try {
          logger.info('[Worker] Generating vector embedding', { emailId });
          await AIService.embedEmail(emailId);
        } catch (embedErr: any) {
          logger.error('[Worker] Email embedding failed', {
            emailId,
            error: embedErr.message || embedErr,
          });
        }

        // Increment successful processing counter
        emailsProcessedCounter.inc({ status: 'success' });
      } catch (error: any) {
        logger.error('[Worker] Classification/extraction failed for email', {
          emailId,
          error: error.message || error,
        });

        // Dispatch Telegram alert for system processing error if enabled
        try {
          if (email) {
            const settings = await prisma.userSettings.findFirst({
              where: { userId: email.userId, telegramEnabled: true },
            });
            if (settings && settings.telegramChatId) {
              await TelegramNotificationService.sendSystemErrorAlert(
                settings.telegramChatId,
                `Classification/extraction failed for email "${email.subject}": ${error.message || error}`
              );
            }
          }
        } catch (teleErr) {
          logger.error(
            '[Worker] Failed to send Telegram system error alert:',
            teleErr
          );
        }

        // Increment failed processing counter
        emailsProcessedCounter.inc({ status: 'failed' });

        // Mark email status as 'FAILED'
        try {
          await prisma.email.update({
            where: { id: emailId },
            data: {
              status: 'FAILED',
            },
          });
          logger.info('[Worker] Updated email status to FAILED in database', {
            emailId,
          });
        } catch (dbError: any) {
          logger.error(
            '[Worker] Failed to update email status to FAILED in database',
            { emailId, error: dbError.message || dbError }
          );
        }
      }
    }
  );

  logger.info('Worker handlers registered and listening for events.');
}

// Only run automatically if executed directly as the entry point
if (
  require.main === module ||
  (process.argv[1] && process.argv[1].endsWith('worker.ts'))
) {
  logger.info('Worker starting as standalone process...');
  registerWorkerHandlers().catch((error) => {
    logger.error('Worker failed to start', { error: error.message || error });
    process.exit(1);
  });
}
