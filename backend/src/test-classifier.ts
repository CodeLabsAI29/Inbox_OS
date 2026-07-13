import { KeywordFilter } from './services/KeywordFilter';
import { AIService } from './services/ai.service';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables (disable actual API keys to ensure LLM is not called)
dotenv.config({
  path: path.resolve(__dirname, '../../infrastructure/config/env/.env'),
});

async function runClassifierTests() {
  console.log('🧪 Running Heuristic Keyword Filter Tests...\n');

  // Test Case 1: Identifies an 'unsubscribe' email as Newsletter
  const newsletterBody1 =
    'Hello, thank you for subscribing to our weekly tech updates. Click here to unsubscribe.';
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
  const spamBody =
    'Earn money today! Buy now to receive a 100% free gift card!';
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
  const cleanBody =
    'Hi team, let us meet tomorrow at 10 AM to discuss the launch checklist.';
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
      console.log(
        '✅ PASSED: Heuristic filter successfully bypassed the LLM API call!'
      );
    } else {
      console.error('❌ FAILED: Unexpected classification result');
      process.exit(1);
    }
  } catch (error: any) {
    console.error(
      `❌ FAILED: AIService threw an error (LLM was likely called when it should not have been):`,
      error
    );
    process.exit(1);
  } finally {
    // Restore environment keys
    process.env.OPENAI_API_KEY = originalOpenAIKey;
    process.env.GEMINI_API_KEY = originalGeminiKey;
  }

  // --- DEADLINE EXTRACTION TESTS ---
  console.log('\n----------------------------------------');
  console.log('🧪 Running Deadline Extraction and Chrono Fallback Tests...\n');

  // Test Case 6: Chrono-node fallback with explicit date "Submit by July 15, 2026"
  console.log('Test Case 6: Explicit date text');
  const resultD1 = await AIService.classifyEmail(
    'Important Submission',
    'Please make sure to submit the DBMS report by July 15, 2026. Absolutely no extensions.'
  );
  console.log('- Extracted Deadlines:', resultD1.deadlines);
  const expectedDeadline = '2026-07-15T23:59:00Z';
  if (resultD1.deadlines.includes(expectedDeadline)) {
    console.log(
      '✅ PASSED: Correctly extracted July 15, 2026 deadline as 2026-07-15T23:59:00Z!\n'
    );
  } else {
    console.error(
      `❌ FAILED: Expected deadline ${expectedDeadline} not found in result.\n`
    );
    process.exit(1);
  }

  // Test Case 7: Chrono-node fallback with relative dates "Tomorrow"
  console.log('Test Case 7: Relative date text ("Tomorrow")');
  const resultD2 = await AIService.classifyEmail(
    'Task Due Soon',
    'Hey, can you finish the presentation? It is due tomorrow.'
  );
  console.log('- Extracted Deadlines:', resultD2.deadlines);
  if (resultD2.deadlines.length > 0) {
    console.log('✅ PASSED: Relative date ("Tomorrow") parsed successfully!\n');
  } else {
    console.error(
      '❌ FAILED: No deadline extracted for relative date "Tomorrow".\n'
    );
    process.exit(1);
  }

  // Test Case 8: Chrono-node fallback with relative dates "Next Monday"
  console.log('Test Case 8: Relative date text ("Next Monday")');
  const resultD3 = await AIService.classifyEmail(
    'Project Sync',
    'Let us meet next Monday to review project status.'
  );
  console.log('- Extracted Deadlines:', resultD3.deadlines);
  if (resultD3.deadlines.length > 0) {
    console.log(
      '✅ PASSED: Relative date ("Next Monday") parsed successfully!\n'
    );
  } else {
    console.error(
      '❌ FAILED: No deadline extracted for relative date "Next Monday".\n'
    );
    process.exit(1);
  }

  // Test Case 9: Subject + Body parsing & Deduplication
  console.log('Test Case 9: Subject + Body parsing & Deduplication');
  const resultD4 = await AIService.classifyEmail(
    'Submit by July 15, 2026',
    'Reminder: Submit by July 15, 2026.'
  );
  console.log('- Extracted Deadlines:', resultD4.deadlines);
  const occurrences = resultD4.deadlines.filter(
    (d) => d === expectedDeadline
  ).length;
  if (occurrences === 1) {
    console.log('✅ PASSED: Deadlines correctly deduplicated!\n');
  } else {
    console.error(
      `❌ FAILED: Expected 1 occurrence of ${expectedDeadline}, got ${occurrences}.\n`
    );
    process.exit(1);
  }

  // Test Case 10: Action Items extraction verification
  console.log('Test Case 10: Action Item Extraction & Deadline matching');
  const actionItems = await AIService.extractActionItems(
    'DBMS Project Code',
    'Submit DBMS report by July 15, 2026'
  );
  console.log(
    '- Extracted Action Items:',
    JSON.stringify(actionItems, null, 2)
  );
  if (
    actionItems.length > 0 &&
    actionItems[0].task &&
    actionItems[0].taskDescription
  ) {
    console.log(
      '✅ PASSED: Action items extraction returned both task and taskDescription fields!\n'
    );
  } else {
    console.error(
      '❌ FAILED: Action items extraction output is missing required fields.\n'
    );
    process.exit(1);
  }

  console.log('\n🎉 All tests passed successfully!');
}

runClassifierTests();
