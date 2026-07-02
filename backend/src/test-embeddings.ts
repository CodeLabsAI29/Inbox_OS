import { AIService } from './services/ai.service';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from the shared configuration directory
dotenv.config({ path: path.resolve(__dirname, '../../infrastructure/config/env/.env') });

const prisma = new PrismaClient();

async function runTest() {
  console.log('🧪 Starting AIService Embedding and Semantic Search Tests...');
  const activeProvider = process.env.AI_PROVIDER || 'openai';
  console.log(`Active AI_PROVIDER: ${activeProvider}`);

  try {
    // 1. Fetch or create a test User
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'test-embeddings@inboxos.dev',
          passwordHash: '$2b$10$dummyhashxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        },
      });
    }

    // 2. Fetch or create a test Thread
    let thread = await prisma.thread.findFirst();
    if (!thread) {
      thread = await prisma.thread.create({
        data: {
          summary: null,
        },
      });
    }

    // 3. Create test emails with HTML content
    const emailData = [
      {
        subject: 'Invoice #1094 for monthly cloud compute resources',
        body: '<p>Hello customer,</p><p>Please find attached your monthly invoice for active cloud database servers. The total amount is <strong>$120.00</strong>.</p>',
      },
      {
        subject: 'Dinner plans tonight',
        body: '<p>Hey friend!</p><p>Let me know if you want to meet up for dinner tonight around 7 PM.</p>',
      },
      {
        subject: 'Monthly JS Newsletter',
        body: '<h1>JavaScript Weekly</h1><p>Here is what is new in the JS world this week. We have cool tips on React 19 and Node 22.</p>',
      },
    ];

    const emailIds: string[] = [];

    console.log('\n📥 Creating test emails in DB...');
    for (let i = 0; i < emailData.length; i++) {
      const data = emailData[i];
      const email = await prisma.email.create({
        data: {
          messageId: `msg-embed-${i}-${Date.now()}`,
          sender: i === 0 ? 'billing@cloud.com' : i === 1 ? 'friend@gmail.com' : 'newsletter@jsweekly.com',
          recipient: user.email,
          subject: data.subject,
          body: data.body,
          status: 'UNREAD',
          userId: user.id,
          threadId: thread.id,
        },
      });
      emailIds.push(email.id);
      console.log(`📩 Created Email: ID = ${email.id}, Subject = "${email.subject}"`);
    }

    // 4. Generate embeddings for each email
    console.log('\n✨ Generating embeddings for emails...');
    for (const emailId of emailIds) {
      console.log(`Generating embedding for email: ${emailId}...`);
      const embedding = await AIService.embedEmail(emailId);
      console.log(`✅ Embedding generated successfully! Dimension: ${embedding.length}`);
    }

    // 5. Query similarity search
    const query = 'cloud server billing invoice';
    console.log(`\n🔍 Searching similar emails for query: "${query}"...`);
    const results = await AIService.searchSimilarEmails(query, 3);

    console.log('\n📊 Ranked Search Results:');
    results.forEach((res, index) => {
      console.log(`[Rank ${index + 1}] Similarity: ${res.similarity.toFixed(4)} | Subject: "${res.subject}"`);
    });

    // 6. Assertions
    if (results.length > 0 && results[0].subject.includes('Invoice')) {
      console.log('\n✅ PASSED: The semantic search correctly ranked the invoice email as the top result!');
    } else {
      console.error('\n❌ FAILED: The invoice email was not ranked as the top result.');
    }

  } catch (error: any) {
    console.error('\n❌ Test execution failed with error:', error.message || error);
  } finally {
    await prisma.$disconnect();
  }
}

runTest().catch((err) => {
  console.error('Test run failed unexpectedly:', err);
});
