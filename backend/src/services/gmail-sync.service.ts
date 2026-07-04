import { google } from 'googleapis';
import { PrismaClient } from '@prisma/client';
import { decrypt, encrypt } from '../utils/crypto';
import { LinkAttachmentExtractorService } from './parser/link-attachment-extractor.service';

const prisma = new PrismaClient();

export class GmailSyncService {
  /**
   * Retrieves user tokens, instantiates an OAuth2 client, and fetches latest 50 emails.
   */
  static async syncLatestEmails(userId: string) {
    console.log(`Starting Gmail sync for user: ${userId}`);

    // 1. Get the email account credentials
    const account = await prisma.emailAccount.findFirst({
      where: { userId, provider: 'gmail' },
    });

    if (!account) {
      throw new Error('No Gmail account connected for this user.');
    }

    // 2. Decrypt tokens and set up OAuth client
    const tokens = JSON.parse(decrypt(account.encryptedTokens));
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI ||
        'http://localhost:8000/api/integrations/gmail/callback'
    );
    oauth2Client.setCredentials(tokens);

    // Auto token refresh listener
    oauth2Client.on('tokens', async (newTokens) => {
      if (newTokens.refresh_token || newTokens.access_token) {
        const updatedTokens = { ...tokens, ...newTokens };
        const reEncrypted = encrypt(JSON.stringify(updatedTokens));
        await prisma.emailAccount.update({
          where: { id: account.id },
          data: { encryptedTokens: reEncrypted },
        });
      }
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // 3. Fetch latest 50 message IDs
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 50,
    });

    const messages = listRes.data.messages || [];
    let syncedCount = 0;

    for (const msg of messages) {
      if (!msg.id) continue;

      // Check if we already have it to prevent duplicates
      if (account.lastMessageId === msg.id) {
        console.log('Reached already synced message, stopping fetch.');
        break;
      }

      const existing = await prisma.email.findUnique({
        where: { messageId: msg.id },
      });
      if (existing) continue;

      // 4. Fetch full payload
      const msgData = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full',
      });

      const payload = msgData.data.payload;
      const headers = payload?.headers || [];

      const subject =
        headers.find((h) => h.name?.toLowerCase() === 'subject')?.value ||
        'No Subject';
      const sender =
        headers.find((h) => h.name?.toLowerCase() === 'from')?.value ||
        'Unknown Sender';
      const recipient =
        headers.find((h) => h.name?.toLowerCase() === 'to')?.value ||
        account.emailAddress;
      const inReplyTo =
        headers.find((h) => h.name?.toLowerCase() === 'in-reply-to')?.value ||
        null;

      // Decode base64url body
      let bodyData = '';
      if (payload?.parts && payload.parts.length > 0) {
        const textPart = payload.parts.find((p) => p.mimeType === 'text/plain');
        if (textPart && textPart.body?.data) {
          bodyData = Buffer.from(textPart.body.data, 'base64url').toString(
            'utf-8'
          );
        } else if (payload.parts[0].body?.data) {
          bodyData = Buffer.from(
            payload.parts[0].body.data,
            'base64url'
          ).toString('utf-8');
        }
      } else if (payload?.body?.data) {
        bodyData = Buffer.from(payload.body.data, 'base64url').toString(
          'utf-8'
        );
      }

      // Handle Thread association
      let threadId = msgData.data.threadId;
      if (threadId) {
        let existingThread = await prisma.thread.findUnique({
          where: { id: threadId },
        });
        if (!existingThread) {
          existingThread = await prisma.thread.create({
            data: { id: threadId, summary: subject },
          });
        }
      } else {
        const newThread = await prisma.thread.create({
          data: { summary: subject },
        });
        threadId = newThread.id;
      }

      // Save to DB
      const links = await LinkAttachmentExtractorService.extractLinks(bodyData);
      await prisma.email.create({
        data: {
          messageId: msg.id,
          inReplyTo,
          sender,
          recipient,
          subject,
          body: bodyData,
          status: 'UNREAD',
          userId,
          threadId: threadId as string,
          links: links as any,
          attachments: [],
        },
      });
      syncedCount++;
    }

    // Store the ID of the most recent message to avoid duplicates on the next run
    if (messages.length > 0 && messages[0].id) {
      await prisma.emailAccount.update({
        where: { id: account.id },
        data: {
          lastMessageId: messages[0].id,
          lastSyncAt: new Date(),
        },
      });
    }

    console.log(
      `[GmailSyncService] Successfully synced ${syncedCount} new emails.`
    );
    return syncedCount;
  }
}
