import { EventBus } from './services/event-bus.service';
import { PrismaClient } from '@prisma/client';
import { AIService } from './services/ai.service';

const prisma = new PrismaClient();

// Wire BullMQ worker events for logging
indexEmailsWorker.on('completed', (job) => {
  console.log(`[BullMQ] Job ${job.id} completed successfully.`);
});
indexEmailsWorker.on('failed', (job, err) => {
  console.error(`[BullMQ] Job ${job?.id} failed with error:`, err);
});

async function main() {
  console.log('Worker starting...');

  // Subscribe to 'email.received' topic
  await EventBus.subscribe('email.received', async (payload: { emailId: string }) => {
    const { emailId } = payload;
    logger.info('[Worker] Received email.received event', { emailId });

    try {
      // 1. Fetch the email from database
      const email = await prisma.email.findUnique({
        where: { id: emailId },
      });

      if (!email) {
        logger.error('[Worker] Email not found in database', { emailId });
        return;
      }

      logger.info('[Worker] Processing email classification', { emailId });

      // 2. Classify email using AIService
      const result = await AIService.classifyEmail(email.subject, email.body);
      console.log(`[Worker] Classification result for "${email.subject}": category = ${result.category}, confidence = ${result.confidence}`);

      // 3. Update the email with the category
      await prisma.email.update({
        where: { id: email.id },
        data: {
          category: result.category,
        },
      });

      console.log(`[Worker] Email updated successfully!`);

      // 4. Extract and save actions
      console.log(`[Worker] Extracting actions for: "${email.subject}"`);
      const actions = await AIService.extractActions(email.subject, email.body);

      if (actions && actions.length > 0) {
        console.log(`[Worker] Found ${actions.length} action items. Saving...`);
        await prisma.actionItem.createMany({
          data: actionItems.map((item) => ({
            emailId: email.id,
            taskDescription: item.taskDescription,
            isCompleted: false,
            deadline: item.deadline ? new Date(item.deadline) : null,
          })),
        });
        logger.info('[Worker] Saved action items successfully', { emailId });
      } else {
        logger.info('[Worker] No action items extracted from email', { emailId });
      }

      // Increment successful processing counter
      emailsProcessedCounter.inc({ status: 'success' });

    } catch (error: any) {
      logger.error('[Worker] Classification/extraction failed for email', { emailId, error: error.message || error });

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
        logger.info('[Worker] Updated email status to FAILED in database', { emailId });
      } catch (dbError: any) {
        logger.error('[Worker] Failed to update email status to FAILED in database', { emailId, error: dbError.message || dbError });
      }
    }
  });

  console.log('Worker is listening for email.received events...');
}

main().catch((error) => {
  console.error('Worker failed to start:', error);
  process.exit(1);
});
