import { Email } from '@prisma/client';
import { DiscordNotifier } from './services/DiscordNotifier';

import * as dotenv from 'dotenv';

// Load env configuration
dotenv.config();

async function runTest() {
  const mockEmail: Email = {
    id: 'test-email-id-12345',
    messageId: 'test-msg-id-12345@inboxos.dev',
    inReplyTo: null,
    sender: 'alice@example.com',
    recipient: 'bob@inboxos.dev',
    subject: 'Urgent: Review Q2 Product Roadmap & Deliverables',
    body: 'Hi Bob, please find attached the Q2 product roadmap. We need to verify the design systems and integrations before the end of the week. Let me know if you have any questions.\n\nBest,\nAlice',
    status: 'UNREAD',
    category: 'Urgent/Action Required',
    createdAt: new Date(),
    userId: 'user-id-abc',
    threadId: 'thread-id-xyz',
    links: [],
    attachments: [],
  };

  console.log('Starting Discord notification test...');
  const success = await DiscordNotifier.sendEmailNotification(mockEmail);

  if (success) {
    console.log('Test completed: Discord notification sent successfully!');
  } else {
    console.log('Test completed: Discord notification failed to send.');
    process.exit(1);
  }
}

runTest();
