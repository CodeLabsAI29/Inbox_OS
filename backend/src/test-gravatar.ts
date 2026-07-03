import { getGravatarUrl } from './utils/gravatar';

function runTest() {
  const tests = [
    {
      input: 'MyEmailAddress@example.com',
      expectedHash: '0bc83cb571cd1c50ba6f3e8a78ef1346',
    },
    {
      input: '  myemailaddress@example.com  ',
      expectedHash: '0bc83cb571cd1c50ba6f3e8a78ef1346',
    },
    {
      input: 'myemailaddress@example.com',
      expectedHash: '0bc83cb571cd1c50ba6f3e8a78ef1346',
    },
    { input: '', expectedHash: '00000000000000000000000000000000' },
  ];

  console.log('==================================================');
  console.log('          Gravatar URL Test Runner                ');
  console.log('==================================================\n');

  let failedCount = 0;

  for (const t of tests) {
    const url = getGravatarUrl(t.input);
    const expectedUrl = `https://www.gravatar.com/avatar/${t.expectedHash}?d=identicon`;

    console.log(`Input: "${t.input}"`);
    console.log(`Result URL:   ${url}`);
    console.log(`Expected URL: ${expectedUrl}`);

    if (url === expectedUrl) {
      console.log('✅ PASS\n');
    } else {
      console.log('❌ FAIL\n');
      failedCount++;
    }
  }

  if (failedCount === 0) {
    console.log('All tests passed successfully!');
  } else {
    console.error(`${failedCount} test(s) failed.`);
    process.exit(1);
  }
}

runTest();
