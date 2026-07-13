import * as chrono from 'chrono-node';

const refDate = new Date('2026-07-04T12:00:00Z'); // Saturday
const body = 'Interview with XYZ Corp on Friday at 2PM EST';

console.log('Ref Date:', refDate.toISOString());

const results = chrono.parse(body, refDate);
if (results && results.length > 0) {
  const result = results[0];
  const start = result.start.date();
  console.log('Start Date:', start.toISOString());
  console.log('Start Date Local:', start.toLocaleString());
  if (result.end) {
    console.log('End Date:', result.end.date().toISOString());
  }
} else {
  console.log('No results');
}
