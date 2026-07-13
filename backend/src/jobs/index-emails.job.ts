import { Queue, Worker, Job, ConnectionOptions } from '../utils/bullmq-wrapper';
import { PrismaClient } from '@prisma/client';
import { AIService } from '../services/ai.service';

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

export const indexEmailsQueue = new Queue('indexEmailsQueue', { connection });

export const indexEmailsWorker = new Worker(
  'indexEmailsQueue',
  async (job: Job) => {
    console.log(`[BullMQ] Starting job ${job.id}: indexing unindexed emails.`);
    const { userId } = job.data;

    // Find all unindexed emails for the user (or all users if not specified)
    // We fetch raw emails because embedding is defined as Unsupported in schema
    let unindexedEmails: any[] = [];
    try {
      if (userId) {
        unindexedEmails = await prisma.$queryRawUnsafe<any[]>(
          `SELECT * FROM "Email" WHERE embedding IS NULL AND "userId" = $1`,
          userId
        );
      } else {
        unindexedEmails = await prisma.$queryRawUnsafe<any[]>(
          `SELECT * FROM "Email" WHERE embedding IS NULL`
        );
      }
    } catch (dbErr) {
      console.error(
        '[BullMQ] Failed to fetch unindexed emails from database:',
        dbErr
      );
      return { indexedCount: 0 };
    }

    console.log(
      `[BullMQ] Found ${unindexedEmails.length} unindexed emails to process.`
    );

    let indexedCount = 0;
    for (const email of unindexedEmails) {
      if (!email.body || !email.body.trim()) {
        console.log(
          `[BullMQ] Skipping email ${email.id} because body is empty.`
        );
        continue;
      }

      try {
        await AIService.embedEmail(email.id);
        indexedCount++;
      } catch (error) {
        console.error(
          `[BullMQ] Failed to generate embedding for email ${email.id}:`,
          error
        );
      }
    }

    console.log(
      `[BullMQ] Finished job ${job.id}. Successfully indexed ${indexedCount} emails.`
    );
    return { indexedCount };
  },
  { connection }
);
