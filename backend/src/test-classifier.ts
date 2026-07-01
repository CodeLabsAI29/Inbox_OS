import { KeywordFilter } from './services/KeywordFilter';
import { AIService } from './services/ai.service';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables (disable actual API keys to ensure LLM is not called)
dotenv.config({ path: path.resolve(__dirname, '../../config/env/.env') });

async function runClassifierTests() {
  console.log('🧪 Running Heuristic Keyword Filter Tests...\n');

  // Test Case 1: Identifies an 'unsubscribe' email as Newsletter
  const newsletterBody1 = 'Hello, thank you for subscribing to our weekly tech updates. Click here to unsubscribe.';
  const category1 = KeywordFilter.classify(newsletterBody1);
  console.log(`Test Case 1 (KeywordFilter - Newsletter):`);
  console.log(`- Input Body: "${newsletterBody1}"`);
  console.log(`- Expected Category: "newsletter"`);
  console.log(`- Got Category:      "${category1}"`);
  if (category1 === 'newsletter') {
    console.log('✅ PASSED\n');
  } else {
    console.error('❌ FAILED\n');
    process.exit(1);
  }

  // Test Case 2: Identifies 'buy now' + 'earn money' as Spam
  const spamBody = 'Earn money today! Buy now to receive a 100% free gift card!';
  const category2 = KeywordFilter.classify(spamBody);
  console.log(`Test Case 2 (KeywordFilter - Spam):`);
  console.log(`- Input Body: "${spamBody}"`);
  console.log(`- Expected Category: "spam"`);
  console.log(`- Got Category:      "${category2}"`);
  if (category2 === 'spam') {
    console.log('✅ PASSED\n');
  } else {
    console.error('❌ FAILED\n');
    process.exit(1);
  }

  // Test Case 3: Case-insensitive check
  const mixedCaseBody = 'UnSuBsCrIbE from this list.';
  const category3 = KeywordFilter.classify(mixedCaseBody);
  console.log(`Test Case 3 (KeywordFilter - Mixed Case):`);
  console.log(`- Input Body: Mixed-case 'UnSuBsCrIbE'`);
  console.log(`- Expected Category: "newsletter"`);
  console.log(`- Got Category:      "${category3}"`);
  if (category3 === 'newsletter') {
    console.log('✅ PASSED\n');
  } else {
    console.error('❌ FAILED\n');
    process.exit(1);
  }

  // Test Case 4: Non-spam/non-newsletter email returns null
  const cleanBody = 'Hi team, let us meet tomorrow at 10 AM to discuss the launch checklist.';
  const category4 = KeywordFilter.classify(cleanBody);
  console.log(`Test Case 4 (KeywordFilter - No Match):`);
  console.log(`- Input Body: "${cleanBody}"`);
  console.log(`- Expected Category: null`);
  console.log(`- Got Category:      ${category4}`);
  if (category4 === null) {
    console.log('✅ PASSED\n');
  } else {
    console.error('❌ FAILED\n');
    process.exit(1);
  }

  // Test Case 5: Verify integration with AIService
  // We temporarily clear process.env API keys to guarantee that the LLM is NOT called.
  // If the heuristic filter works, it returns newsletter with 1.0 confidence.
  // If it falls back to LLM, it will throw an error because API keys are unset/invalidated.
  const originalOpenAIKey = process.env.OPENAI_API_KEY;
  const originalGeminiKey = process.env.GEMINI_API_KEY;
  
  process.env.OPENAI_API_KEY = 'sk-placeholder-nonexistent';
  process.env.GEMINI_API_KEY = '';

  console.log('Test Case 5 (AIService Integration - Avoiding LLM):');
  try {
    const result = await AIService.classifyEmail(
      'Weekly Newsletter', 
      'You are receiving this because you subscribed. To stop receiving, unsubscribe.'
    );
    console.log(`- Returned Category:   "${result.category}"`);
    console.log(`- Returned Confidence: ${result.confidence}`);
    
    if (result.category === 'newsletter' && result.confidence === 1.0) {
      console.log('✅ PASSED: Heuristic filter successfully bypassed the LLM API call!');
    } else {
      console.error('❌ FAILED: Unexpected classification result');
      process.exit(1);
    }
  } catch (error: any) {
    console.error(`❌ FAILED: AIService threw an error (LLM was likely called when it should not have been):`, error);
    process.exit(1);
  } finally {
    // Restore environment keys
    process.env.OPENAI_API_KEY = originalOpenAIKey;
    process.env.GEMINI_API_KEY = originalGeminiKey;
  }

  console.log('\n🎉 All tests passed successfully!');
}

runClassifierTests();
