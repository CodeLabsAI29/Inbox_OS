const fs = require('fs');
const path = require('path');
const { simpleParser } = require('mailparser');

async function main() {
  // Get EML file path from command-line arguments or fallback to default sample.eml
  const argPath = process.argv[2];
  const emlPath = argPath ? path.resolve(argPath) : path.join(__dirname, 'sample.eml');

  console.log('==================================================');
  console.log('      InboxOS EML Attachment Metadata Extractor   ');
  console.log('==================================================\n');
  console.log(`Target EML File: ${emlPath}\n`);

  // Verify file existence
  if (!fs.existsSync(emlPath)) {
    console.error(`Error: File not found at "${emlPath}".`);
    console.error('Please specify a valid path to an .eml file as an argument.');
    console.error('Usage: node parse_eml.js <path_to_eml_file>\n');
    process.exit(1);
  }

  try {
    const emlBuffer = fs.readFileSync(emlPath);
    console.log('Parsing EML file structure...');
    const parsed = await simpleParser(emlBuffer);

    console.log('Parsing complete.\n');
    console.log(`Subject: ${parsed.subject || '(No Subject)'}`);
    console.log(`From:    ${parsed.from ? parsed.from.text : 'Unknown'}`);
    console.log(`Date:    ${parsed.date ? parsed.date.toISOString() : 'Unknown'}\n`);

    const attachments = parsed.attachments || [];

    if (attachments.length === 0) {
      console.log('--------------------------------------------------');
      console.log('📎 Attachments: None (0 attachments found)');
      console.log('--------------------------------------------------\n');
      console.log('Gracefully processed. Exiting.');
      return;
    }

    console.log('--------------------------------------------------');
    console.log(`📎 Attachments: Found ${attachments.length} attachment(s)`);
    console.log('--------------------------------------------------');
    
    attachments.forEach((attachment, index) => {
      const filename = attachment.filename || `unnamed_attachment_${index + 1}`;
      const contentType = attachment.contentType || 'application/octet-stream';
      const sizeBytes = attachment.size;
      
      console.log(`\nAttachment #${index + 1}:`);
      console.log(`  Filename:     ${filename}`);
      console.log(`  Content-Type: ${contentType}`);
      console.log(`  Size:         ${sizeBytes} bytes (${(sizeBytes / 1024).toFixed(2)} KB)`);
    });
    console.log('\n--------------------------------------------------');
    console.log('Success: All attachment metadata extracted.');

  } catch (error) {
    console.error('\nAn error occurred while reading or parsing the EML file:');
    console.error(error.message || error);
    process.exit(1);
  }
}

main();
