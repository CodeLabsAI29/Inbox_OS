import * as nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';
import { decrypt } from '../utils/crypto';

const prisma = new PrismaClient();

export class EmailSenderService {
  static async send(userId: string, payload: { to: string, subject: string, text: string, html?: string, inReplyTo?: string }) {
    const account = await prisma.emailAccount.findFirst({
      where: { userId, provider: 'imap' }
    });

    if (!account) {
      throw new Error('No IMAP/SMTP account connected for this user.');
    }

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
