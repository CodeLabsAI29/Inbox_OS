import { PrismaClient } from '@prisma/client';
import { AIService } from '../services/ai.service';
import { RulesEngineService } from '../services/rules-engine.service';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

async function run() {
  logger.info('Starting Category and Rules Migration Script...');
  const emails = await prisma.email.findMany();
  logger.info(`Found ${emails.length} emails to re-evaluate.`);

  for (const email of emails) {
    try {
      logger.info(`Re-evaluating email: ${email.id} ("${email.subject}")`);
      const result = await AIService.classifyEmail(email.subject, email.body);
      
      const updated = await prisma.email.update({
        where: { id: email.id },
        data: { category: result.category }
      });
      
      logger.info(`Email ${email.id} classified as "${result.category}"`);
      
      await RulesEngineService.evaluateRules(updated, email.userId);
    } catch (err: any) {
      logger.error(`Failed to process email ${email.id}:`, err.message || err);
    }
  }

  logger.info('Migration finished successfully.');
}

run()
  .catch(err => {
    logger.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
