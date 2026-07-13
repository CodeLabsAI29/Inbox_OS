import client from 'prom-client';

// Enable collection of default Node.js metrics (CPU, memory, event loop lag, etc.)
client.collectDefaultMetrics();

/**
 * Custom Counter metric to track total processed emails.
 * Uses labels to distinguish between successfully classified and failed email jobs.
 */
export const emailsProcessedCounter = new client.Counter({
  name: 'emails_processed_total',
  help: 'Total number of emails processed by the classification worker',
  labelNames: ['status'], // 'success' or 'failed'
});

export default client;
