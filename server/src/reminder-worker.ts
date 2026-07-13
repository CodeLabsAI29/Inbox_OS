/**
 * reminder-worker.ts
 * Standalone entry-point for the InboxOS reminder processing worker.
 * Can be run as: ts-node src/reminder-worker.ts
 *
 * In server.ts, ReminderSchedulerService.initWorker() is called instead,
 * which boots the worker inside the same process.
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import './utils/redis-patch';
import { ReminderSchedulerService } from './services/actions/reminder-scheduler.service';
import { logger } from './utils/logger';

logger.info('[ReminderWorker] Starting dedicated reminder worker process...');

ReminderSchedulerService.initWorker();

logger.info('[ReminderWorker] Worker registered. Listening for reminder.fire jobs on queue: inboxos-reminders');

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('[ReminderWorker] Shutting down...');
  await ReminderSchedulerService.shutdown();
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
