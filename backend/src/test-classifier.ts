import { AIService } from './services/ai.service';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from the shared configuration directory
dotenv.config({ path: path.resolve(__dirname, '../../config/env/.env') });

async function runTests() {
  console.log('🧪 Starting AIService Classification Tests...');
  const activeProvider = process.env.AI_PROVIDER || 'openai';
  console.log(`Active AI_PROVIDER: ${activeProvider}`);
  console.log('OpenAI API Key: ', process.env.OPENAI_API_KEY ? 'Present' : 'Missing');
  console.log('Gemini API Key: ', process.env.GEMINI_API_KEY ? 'Present' : 'Missing');

  const testEmails = [
    {
      subject: 'URGENT: Database Outage Detected - Action Required',
      body: 'Our automated monitors detected that the production database has been down for 5 minutes. Please login and restart the services immediately.',
      expectedHint: 'urgent',
    },
    {
      subject: 'Weekly Developer Newsletter - Issue #42',
      body: 'In this issue, we discuss the new features of Node.js 22, performance improvements in V8, and tutorials on PostgreSQL pgvector.',
      expectedHint: 'newsletter',
    },
    {
      subject: 'Plans for dinner tonight?',
      body: 'Hey! Are you free for dinner around 7 PM tonight? Let me know if that works.',
      expectedHint: 'personal',
    },
    {
      subject: 'Q3 Project Roadmap and Sync Meeting',
      body: 'Hi team, please find attached the Q3 project roadmap. We will have a sync meeting tomorrow at 10 AM to discuss task allocations and deliverables.',
      expectedHint: 'work',
    },
    {
      subject: 'GET RICH QUICK!!! FREE MONEY!!!',
      body: 'Click here now to win $1,000,000 guaranteed!!! No catches, just enter your credit card number and email address to claim your reward immediately!!!',
      expectedHint: 'spam',
    },
  ];

  for (let i = 0; i < testEmails.length; i++) {
    const testCase = testEmails[i];
    console.log(`\n----------------------------------------`);
    console.log(`Test Case #${i + 1}:`);
    console.log(`Subject: "${testCase.subject}"`);
    try {
      const start = Date.now();
      const result = await AIService.classifyEmail(testCase.subject, testCase.body);
      const duration = Date.now() - start;

      console.log(`Result:`, JSON.stringify(result, null, 2));
      console.log(`Duration: ${duration}ms`);

      // Basic validation
      const validCategories = ['urgent', 'newsletter', 'personal', 'work', 'spam'];
      if (!validCategories.includes(result.category)) {
        console.error(`❌ FAILED: Invalid category "${result.category}" returned.`);
      } else {
        console.log(`✅ PASSED: Valid category "${result.category}" with confidence ${result.confidence}.`);
      }
    } catch (error: any) {
      console.error(`❌ FAILED with error:`, error.message || error);
    }
  }
}

runTests().catch((err) => {
  console.error('Test run failed unexpectedly:', err);
});
