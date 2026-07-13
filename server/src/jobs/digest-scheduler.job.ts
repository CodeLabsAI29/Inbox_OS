import { Queue, Worker, Job, ConnectionOptions } from '../utils/bullmq-wrapper';
import { PrismaClient } from '@prisma/client';
import { DigestGeneratorService } from '../services/actions/digest-generator.service';
import { EmailDigestAdapter } from '../services/outputs/email-digest.adapter';
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

// Queue for scheduling email digests
export const digestQueue = new Queue('digestQueue', { connection });

// Worker for executing digest generation & sending
export const digestWorker = new Worker(
  'digestQueue',
  async (job: Job<{ userId: string; type: 'daily' | 'weekly' }>) => {
    const { userId, type } = job.data;
    logger.info(
      `[DigestWorker] Executing digest job ${job.id} for user: ${userId}, type: ${type}`
    );

    // ── Phase 2: Skip users whose Gmail token is dead ─────────────────────────
    // EmailDigestAdapter marks syncState = 'needs_reauth' when a GmailAuthError
    // occurs. Honour that flag here to avoid wasting Redis/API quota retrying
    // a permanently broken token.
    const gmailAccount = await prisma.emailAccount.findFirst({
      where: { userId, provider: 'gmail' },
      select: { id: true, syncState: true },
    });

    if (gmailAccount?.syncState === 'needs_reauth') {
      logger.warn(
        `[DigestWorker] Skipping digest job ${job.id} for user ${userId} — Gmail account requires re-authentication. ` +
        `User has been notified via in-app notification.`
      );
      // Resolve without throwing: BullMQ marks job as completed (not failed),
      // which prevents infinite retries and Redis quota drain.
      return;
    }

    try {
      // 1. Generate the digest (aggregates low-priority emails and compiles Handlebars template)
      const digest = await DigestGeneratorService.generateDigest(userId, type);

      // 2. Deliver the digest via email using Nodemailer & SMTP settings
      await EmailDigestAdapter.sendDigest(digest, userId);

      logger.info(
        `[DigestWorker] Successfully completed digest execution for user: ${userId}`
      );
    } catch (err: any) {
      logger.error(
        `[DigestWorker] Failed to execute digest job: ${err.message || err}`
      );
      throw err; // Allow BullMQ retry policies to handle failures
    }
  },
  { connection }
);


/**
 * Synchronizes the BullMQ repeatable digest jobs for a specific user.
 * Reads user settings and schedules or clears repeatable jobs accordingly.
 */
export async function syncDigestSchedule(userId: string): Promise<void> {
  logger.info(
    `[DigestScheduler] Synchronizing digest schedule for user: ${userId}`
  );

  try {
    // 1. Fetch user's current settings
    const settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      logger.warn(
        `[DigestScheduler] User settings not found for user: ${userId}`
      );
      return;
    }

    const { digestSchedule, timezone } = settings;

    // 2. Query and clear any existing repeatable digest jobs for this user
    const repeatableJobs = await digestQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      if (
        job &&
        job.name &&
        typeof job.name === 'string' &&
        job.name.startsWith(`digest-`) &&
        job.name.endsWith(`-${userId}`)
      ) {
        logger.info(`[DigestScheduler] Removing repeatable job: ${job.key}`);
        await digestQueue.removeRepeatableByKey(job.key);
      }
    }

    // 3. Add new repeatable job if schedule is not disabled
    if (digestSchedule === 'daily') {
      const jobName = `digest-daily-${userId}`;
      logger.info(
        `[DigestScheduler] Scheduling daily digest at 8:00 AM (TZ: ${timezone})`
      );
      await digestQueue.add(
        jobName,
        { userId, type: 'daily' },
        {
          repeat: {
            pattern: '0 8 * * *',
            tz: timezone,
          },
        }
      );
    } else if (digestSchedule === 'weekly') {
      const jobName = `digest-weekly-${userId}`;
      logger.info(
        `[DigestScheduler] Scheduling weekly digest on Mondays at 8:00 AM (TZ: ${timezone})`
      );
      await digestQueue.add(
        jobName,
        { userId, type: 'weekly' },
        {
          repeat: {
            pattern: '0 8 * * 1',
            tz: timezone,
          },
        }
      );
    } else {
      logger.info(`[DigestScheduler] Digests disabled for user: ${userId}`);
    }
  } catch (err: any) {
    logger.error(
      `[DigestScheduler] Failed to sync schedule for user ${userId}: ${err.message || err}`,
      { stack: err.stack }
    );
  }
}
