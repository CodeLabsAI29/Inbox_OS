import * as nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';
import { decrypt, encrypt } from '../utils/crypto';
import { google } from 'googleapis';

const prisma = new PrismaClient();

export class EmailSenderService {
  static async send(userId: string, payload: { to: string, subject: string, text: string, html?: string, inReplyTo?: string }) {
    const account = await prisma.emailAccount.findFirst({
      where: {
        userId,
        provider: { in: ['imap', 'gmail'] },
        isActive: true
      }
    });

    if (!account) {
      throw new Error('No active IMAP/SMTP or Gmail account connected for this user.');
    }

    // ── GMAIL OUTBOUND (GMAIL API) ───────────────────────────────────────────
    if (account.provider === 'gmail') {
      const tokens = JSON.parse(decrypt(account.encryptedTokens));
      const oauth2Client = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        process.env.GMAIL_REDIRECT_URI || 'http://localhost:8000/api/integrations/gmail/callback'
      );
      oauth2Client.setCredentials(tokens);

      // Auto token refresh listener to save updated credentials
      oauth2Client.on('tokens', async (newTokens) => {
        if (newTokens.refresh_token || newTokens.access_token) {
          const updatedTokens = { ...tokens, ...newTokens };
          const reEncrypted = encrypt(JSON.stringify(updatedTokens));
          await prisma.emailAccount.update({
            where: { id: account.id },
            data: { encryptedTokens: reEncrypted }
          });
        }
      });

      const mailOptions = {
        from: account.emailAddress,
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
        inReplyTo: payload.inReplyTo
      };

      // Compile message raw headers and body using stream transport
      const buildTransporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'windows',
      });

      const info = await buildTransporter.sendMail(mailOptions);
      let rawMime: string;

      if (Buffer.isBuffer(info.message)) {
        rawMime = info.message.toString('base64url');
      } else {
        rawMime = await new Promise<string>((resolve, reject) => {
          const chunks: Buffer[] = [];
          (info.message as any).on('data', (chunk: Buffer) => chunks.push(chunk));
          (info.message as any).on('end', () => {
            const buffer = Buffer.concat(chunks);
            resolve(buffer.toString('base64url'));
          });
          (info.message as any).on('error', reject);
        });
      }

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      const res = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: rawMime
        }
      });

      const messageId = res.data.id || `gmail-sent-${Date.now()}`;

      // Threading logic
      let threadId: string | null = null;
      if (payload.inReplyTo) {
        const parentEmail = await prisma.email.findUnique({ where: { messageId: payload.inReplyTo } });
        if (parentEmail) threadId = parentEmail.threadId;
      }

      if (!threadId) {
        const newThread = await prisma.thread.create({ data: { summary: payload.subject } });
        threadId = newThread.id;
      }

      // Save copy of sent email to database
      await prisma.email.create({
        data: {
          messageId,
          inReplyTo: payload.inReplyTo || null,
          sender: account.emailAddress,
          recipient: payload.to,
          subject: payload.subject,
          body: payload.text || payload.html || '',
          status: 'SENT',
          userId,
          threadId
        }
      });

      return { messageId };
    }

    // ── IMAP/SMTP OUTBOUND (SMTP) ────────────────────────────────────────────
    if (!account.smtpHost) {
      throw new Error('SMTP host is not configured for this account.');
    }

    const credentials = JSON.parse(decrypt(account.encryptedTokens));

    const transporter = nodemailer.createTransport({
      host: account.smtpHost,
      port: account.smtpPort ?? 587,
      secure: false, // Use STARTTLS
      auth: { user: credentials.user, pass: credentials.password }
    });

    try {
      await transporter.verify();
      const mailOptions: nodemailer.SendMailOptions = {
        from: account.emailAddress,
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
        inReplyTo: payload.inReplyTo
      };

      const info = await transporter.sendMail(mailOptions);

      // Threading logic
      let threadId: string | null = null;
      if (payload.inReplyTo) {
        const parentEmail = await prisma.email.findUnique({ where: { messageId: payload.inReplyTo } });
        if (parentEmail) threadId = parentEmail.threadId;
      }

      if (!threadId) {
        const newThread = await prisma.thread.create({ data: { summary: payload.subject } });
        threadId = newThread.id;
      }

      // Save a copy
      await prisma.email.create({
        data: {
          messageId: info.messageId || `sent-${Date.now()}`,
          inReplyTo: payload.inReplyTo || null,
          sender: account.emailAddress,
          recipient: payload.to,
          subject: payload.subject,
          body: payload.text || payload.html || '',
          status: 'SENT',
          userId,
          threadId
        }
      });

      return { messageId: info.messageId };
    } catch (err: any) {
      console.error('SMTP send failed', err.message);
      throw new Error('Failed to send email');
    } finally {
      // Clear password from memory best effort
      if (credentials) credentials.password = '';
    }
  }
}
