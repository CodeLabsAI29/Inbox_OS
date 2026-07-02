import { AIService } from './services/ai.service';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from the shared configuration directory
dotenv.config({ path: path.resolve(__dirname, '../../infrastructure/config/env/.env') });

const prisma = new PrismaClient();

async function runTest() {
  console.log('🧪 Starting AIService Thread Summarization Tests...');
  const activeProvider = process.env.AI_PROVIDER || 'openai';
  console.log(`Active AI_PROVIDER: ${activeProvider}`);
  console.log('OpenAI API Key: ', process.env.OPENAI_API_KEY ? 'Present' : 'Missing');
  console.log('Gemini API Key: ', process.env.GEMINI_API_KEY ? 'Present' : 'Missing');

  try {
    // 1. Fetch or create a test User
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'test-summarizer@inboxos.dev',
          passwordHash: '$2b$10$dummyhashxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        },
      });
    }

    // 2. Create a test Thread
    const thread = await prisma.thread.create({
      data: {
        summary: null,
      },
    });
    console.log(`\n🧵 Created new test Thread: ID = ${thread.id}`);

    // 3. Create sample emails in chronological order
    const emailData = [
      {
        subject: 'Project Launch Sync',
        body: 'Hi team, we are planning to launch the new customer portal on Friday. Please review the launch checklist and ensure all database migrations are ready.',
        offsetMinutes: 0,
      },
      {
        subject: 'Re: Project Launch Sync',
        body: 'Thanks for the update. I have reviewed the migrations and executed a dry-run in staging. Everything succeeded. We are ready on the database front.',
        offsetMinutes: 10,
      },
      {
        subject: 'Re: Project Launch Sync',
        body: 'Awesome! I will handle the final DNS switchover on Friday at 6 AM. Let\'s meet tomorrow at 10 AM for a final sync before the release.',
        offsetMinutes: 20,
      },
    ];

    const baseTime = new Date();
    for (const item of emailData) {
      const email = await prisma.email.create({
        data: {
          messageId: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          sender: 'team@company.com',
          recipient: user.email,
          subject: item.subject,
          body: item.body,
          status: 'READ',
          userId: user.id,
          threadId: thread.id,
          createdAt: new Date(baseTime.getTime() + item.offsetMinutes * 60000),
        },
      });
      console.log(`📩 Created Email: ID = ${email.id}, CreatedAt = ${email.createdAt.toISOString()}`);
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

    // 4. Generate the summary
    console.log('\n✨ Generating summary using AIService.generateSummary()...');
    const start = Date.now();
    const summary = await AIService.generateSummary(thread.id);
    const duration = Date.now() - start;

    console.log(`⚡ Summary generation completed in ${duration}ms.`);
    console.log(`\n📝 Summary returned by function:\n"${summary}"`);

    // 5. Fetch the updated Thread from database to verify persistence
    const updatedThread = await prisma.thread.findUnique({
      where: { id: thread.id },
    });

    console.log(`\n💾 Persisted summary in Thread DB record:\n"${updatedThread?.summary}"`);

    if (updatedThread?.summary === summary) {
      console.log('\n✅ PASSED: Thread record updated correctly with the generated summary!');
    } else {
      console.error('\n❌ FAILED: Persisted summary does not match returned summary.');
      process.exit(1);
    }

  } catch (error: any) {
    console.error('\n❌ Test run failed with error:', error.message || error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTest().catch((err) => {
  console.error('Test run failed unexpectedly:', err);
  process.exit(1);
});
