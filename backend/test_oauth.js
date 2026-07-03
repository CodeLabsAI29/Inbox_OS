const { google } = require('googleapis');
const readline = require('readline');

// Load environment variables from .env file
require('dotenv').config();

function main() {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const redirectUri = process.env.GMAIL_REDIRECT_URI || 'http://localhost:8000/auth/callback/gmail';

  console.log('==================================================');
  console.log('      InboxOS Gmail OAuth2 Test Utility          ');
  console.log('==================================================\n');

  // Validate credentials
  if (!clientId || clientId.trim() === '' || clientId.includes('your_gmail_client_id_here')) {
    console.error('Error: GMAIL_CLIENT_ID is not configured in backend/.env.');
    console.error('Please configure your credentials first. Exiting.\n');
    process.exit(1);
  }

  if (!clientSecret || clientSecret.trim() === '' || clientSecret.includes('your_gmail_client_secret_here')) {
    console.error('Error: GMAIL_CLIENT_SECRET is not configured in backend/.env.');
    console.error('Please configure your credentials first. Exiting.\n');
    process.exit(1);
  }

  console.log(`Using Client ID: ${clientId.substring(0, 15)}...`);
  console.log(`Using Redirect URI: ${redirectUri}\n`);

  // Initialize OAuth2 client
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  // Scopes requested for InboxOS
  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.compose',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ];

  // Generate auth URL
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Generates a refresh token
    scope: scopes,
    prompt: 'consent' // Forces consent screen to ensure refresh token is returned
  });

  console.log('1. Open the following URL in your browser to authorize access:');
  console.log('--------------------------------------------------');
  console.log(authUrl);
  console.log('--------------------------------------------------\n');

  console.log('2. After granting permissions, you will be redirected.');
  console.log('Note: Since no local server might be listening on the redirect port,');
  console.log('the page might fail to load. This is NORMAL.');
  console.log('Copy the "code" parameter from the URL in your browser\'s address bar.');
  console.log('Example: http://localhost:8000/auth/callback/gmail?code=4/0AdQt8... -> copy the code value.');
  console.log('--------------------------------------------------\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('3. Paste the authorization code here: ', async (code) => {
    rl.close();
    
    if (!code || code.trim() === '') {
      console.error('\nError: No authorization code entered. Exiting.');
      process.exit(1);
    }

    console.log('\nExchanging authorization code for tokens...');
    try {
      const { tokens } = await oauth2Client.getToken(code.trim());
      console.log('\n==================================================');
      console.log('         OAuth2 Exchange Successful!             ');
      console.log('==================================================\n');
      console.log('Tokens received:');
      console.log(JSON.stringify(tokens, null, 2));
      console.log('\n==================================================');
      console.log('You can now add the refresh_token to your env if needed.');
      console.log('Happy hacking!');
    } catch (error) {
      console.error('\nError exchanging code for tokens:', error.message);
      if (error.response && error.response.data) {
        console.error('Details:', JSON.stringify(error.response.data, null, 2));
      }
      process.exit(1);
    }
  });
}

main();
