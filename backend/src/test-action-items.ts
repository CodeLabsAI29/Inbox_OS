import { AIService } from './services/ai.service';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from the shared configuration directory
dotenv.config({ path: path.resolve(__dirname, '../../infrastructure/config/env/.env') });

const prisma = new PrismaClient();

async function runTest() {
  console.log('🧪 Starting AIService Action Item Extraction Tests...');
  const activeProvider = process.env.AI_PROVIDER || 'openai';
  console.log(`Active AI_PROVIDER: ${activeProvider}`);

  try {
    // 1. Fetch or create a test User
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'test-actions@inboxos.dev',
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

    // Check if API keys are present and are not placeholders
    const openaiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    const hasOpenAI = openaiKey && openaiKey !== 'sk-...' && openaiKey !== '...' && openaiKey !== '';
    const hasGemini = geminiKey && geminiKey !== 'placeholder' && geminiKey !== '...' && geminiKey !== '';

    if (!hasOpenAI && !hasGemini) {
      console.log('\n⚠️ Skipping AI integration tests in CI/dev environment due to missing/placeholder API keys.');
      return;
    }

    // --- TEST CASE 1: Email with explicit action items ---
    console.log('\n----------------------------------------');
    console.log('Test Case 1: Email with actionable requests');
    const emailWithActionsData = {
      subject: 'Review request: Q4 Product Roadmap',
      body: 'Hi team, please review the attached PDF roadmap by Friday and send me your feedback. Also, John, please make sure the design mocks are uploaded to Figma by tomorrow evening.',
    };

    console.log(`Email Body:\n"${emailWithActionsData.body}"`);

    // A. Call AI extraction
    const actions1 = await AIService.extractActions(emailWithActionsData.subject, emailWithActionsData.body);
    console.log('Extracted actions:', JSON.stringify(actions1, null, 2));

    // B. Save email to DB
    const email1 = await prisma.email.create({
      data: {
        messageId: `msg-actions-1-${Date.now()}`,
        sender: 'manager@company.com',
        recipient: user.email,
        subject: emailWithActionsData.subject,
        body: emailWithActionsData.body,
        status: 'UNREAD',
        userId: user.id,
        threadId: thread.id,
      },
    });

    // C. Save actions to DB
    if (actions1.length > 0) {
      await prisma.actionItem.createMany({
        data: actions1.map((desc) => ({
          emailId: email1.id,
          taskDescription: desc,
          isCompleted: false,
        })),
      });
    }

    // D. Verify DB state
    const savedActions1 = await prisma.actionItem.findMany({
      where: { emailId: email1.id },
    });

    console.log('Saved actions in DB:', JSON.stringify(savedActions1, null, 2));

    if (savedActions1.length > 0) {
      console.log('✅ Test Case 1 PASSED: Action items successfully extracted and saved to DB!');
    } else {
      console.error('❌ Test Case 1 FAILED: No action items found in DB.');
      process.exit(1);
    }

    // --- TEST CASE 2: Email with NO action items ---
    console.log('\n----------------------------------------');
    console.log('Test Case 2: Email with no actionable requests');
    const emailNoActionsData = {
      subject: 'Just saying hi!',
      body: 'Hey, just wanted to check in and see how you are doing. Hope you have a wonderful weekend! Let\'s catch up sometime next month.',
    };

    console.log(`Email Body:\n"${emailNoActionsData.body}"`);

    // A. Call AI extraction
    const actions2 = await AIService.extractActions(emailNoActionsData.subject, emailNoActionsData.body);
    console.log('Extracted actions (should be empty):', JSON.stringify(actions2, null, 2));

    // B. Save email to DB
    const email2 = await prisma.email.create({
      data: {
        messageId: `msg-actions-2-${Date.now()}`,
        sender: 'friend@gmail.com',
        recipient: user.email,
        subject: emailNoActionsData.subject,
        body: emailNoActionsData.body,
        status: 'UNREAD',
        userId: user.id,
        threadId: thread.id,
      },
    });

    // C. Save actions to DB
    if (actions2.length > 0) {
      await prisma.actionItem.createMany({
        data: actions2.map((desc) => ({
          emailId: email2.id,
          taskDescription: desc,
          isCompleted: false,
        })),
      });
    }

    // D. Verify DB state
    const savedActions2 = await prisma.actionItem.findMany({
      where: { emailId: email2.id },
    });

    console.log('Saved actions in DB (should be empty):', JSON.stringify(savedActions2, null, 2));

    if (savedActions2.length === 0) {
      console.log('✅ Test Case 2 PASSED: Handles empty action item cases gracefully!');
    } else {
      console.error('❌ Test Case 2 FAILED: Saved action items when none were expected.');
      process.exit(1);
    }

  } catch (error: any) {
    console.error('❌ Test execution failed with error:', error.message || error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTest().catch((err) => {
  console.error('Test run failed unexpectedly:', err);
  process.exit(1);
});
