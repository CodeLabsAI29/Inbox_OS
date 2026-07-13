import { Email } from '@prisma/client';
import { SlackNotifier } from './services/SlackNotifier';

import * as dotenv from 'dotenv';

// Load env configuration
dotenv.config();

async function runTest() {
  const mockEmail: Email = {
    id: 'test-email-id-54321',
    messageId: 'test-msg-id-54321@inboxos.dev',
    inReplyTo: null,
    sender: 'charlie@company.com',
    recipient: 'team@inboxos.dev',
    subject: 'Urgent: Server Outage in Production Environment (US-EAST-1)',
    body: 'We are experiencing an outage on the primary database cluster. The replication lag started spiking at 10:15 AM UTC and eventually the node stopped responding to queries. The site is currently showing a 500 error page. The DevOps team is investigating. I will post updates here.',
    status: 'UNREAD',
    category: 'Infrastructure / Critical',
    createdAt: new Date(),
    userId: 'user-id-abc',
    threadId: 'thread-id-xyz',
    links: [],
    attachments: [],
    digestId: null,
  };

  const mockSummary =
    'Production database cluster is down in US-EAST-1 since 10:15 AM UTC. Site is currently returning 500 errors. DevOps team is actively troubleshooting the node and investigating replication lag issues.';

  console.log('Starting Slack notification test...');
  const success = await SlackNotifier.sendEmailNotification(
    mockEmail,
    mockSummary
  );

  if (success) {
    console.log('Test completed: Slack notification sent successfully!');
  } else {
    console.log('Test completed: Slack notification failed to send.');
    process.exit(1);
  }
}

runTest();
