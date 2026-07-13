import * as nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';
import { decrypt, encrypt } from '../utils/crypto';
import { google } from 'googleapis';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// ── Structured OAuth error ────────────────────────────────────────────────────
// Thrown by EmailSenderService when a Gmail token cannot be used.
// `cause` identifies WHICH of the three known root causes triggered:
//   'token_expired'   → refresh_token exists but Google rejected it (invalid_grant).
//                       Usually means redirect_uri mismatch or token rotated server-side.
//   'client_mismatch' → OAuth client ID/secret mismatch (unauthorized_client).
//   'access_revoked'  → User explicitly revoked app access.
//   'unknown'         → Any other OAuth-family 401/403 error.
export class GmailAuthError extends Error {
  public readonly gmailCause: 'token_expired' | 'client_mismatch' | 'access_revoked' | 'unknown';
  public readonly userId: string;
  public readonly accountId: string;
  public readonly originalCode: string | number | undefined;

  constructor(
    message: string,
    gmailCause: GmailAuthError['gmailCause'],
    userId: string,
    accountId: string,
    originalCode?: string | number
  ) {
    super(message);
    this.name = 'GmailAuthError';
    this.gmailCause = gmailCause;
    this.userId = userId;
    this.accountId = accountId;
    this.originalCode = originalCode;
  }
}

/**
 * Classifies a raw Google API / google-auth-library error into one of our
 * four known GmailAuthError causes and emits a structured log line.
 */
function classifyGoogleAuthError(
  err: any,
  userId: string,
  accountId: string
): GmailAuthError {
  const errMessage: string = (err.message || '').toLowerCase();
  const code = err.code ?? err.status ?? err.response?.data?.error;
  const errorStr = (typeof code === 'string' ? code : '').toLowerCase();

  // invalid_grant → refresh token rejected; most often redirect_uri or client rotation
  if (errorStr === 'invalid_grant' || errMessage.includes('invalid_grant')) {
    const gmailCause = errMessage.includes('revoked') ? 'access_revoked' : 'token_expired';
    logger.error('[GmailAuth] Token invalid/expired (invalid_grant)', {
      gmailCause,
      userId,
      accountId,
      errorCode: code,
      details: err.message,
    });
    return new GmailAuthError(err.message, gmailCause, userId, accountId, code);
  }

  // unauthorized_client → OAuth client ID/secret mismatch or redirect_uri mismatch at token exchange
  if (errorStr === 'unauthorized_client' || errMessage.includes('unauthorized_client')) {
    logger.error('[GmailAuth] Unauthorized client — likely redirect_uri or client ID change', {
      gmailCause: 'client_mismatch',
      userId,
      accountId,
      errorCode: code,
      details: err.message,
    });
    return new GmailAuthError(err.message, 'client_mismatch', userId, accountId, code);
  }

  // access_denied → explicit user revocation
  if (errorStr === 'access_denied' || errMessage.includes('access_denied')) {
    logger.error('[GmailAuth] Access denied — user revoked app permissions', {
      gmailCause: 'access_revoked',
      userId,
      accountId,
      errorCode: code,
    });
    return new GmailAuthError(err.message, 'access_revoked', userId, accountId, code);
  }

  // Generic 401/403 or token-shaped error
  logger.error('[GmailAuth] Unclassified OAuth error', {
    gmailCause: 'unknown',
    userId,
    accountId,
    errorCode: code,
    details: err.message,
  });
  return new GmailAuthError(err.message, 'unknown', userId, accountId, code);
}

export class EmailSenderService {
  static async send(
    userId: string,
    payload: {
      to: string;
      subject: string;
      text: string;
      html?: string;
      inReplyTo?: string;
    }
  ) {
    const account = await prisma.emailAccount.findFirst({
      where: {
        userId,
        provider: { in: ['imap', 'gmail'] },
        isActive: true,
      },
    });

    if (!account) {
      throw new Error(
        'No active IMAP/SMTP or Gmail account connected for this user.'
      );
    }

    // ── GMAIL OUTBOUND (GMAIL API) ───────────────────────────────────────────
    if (account.provider === 'gmail') {
      const tokens = JSON.parse(decrypt(account.encryptedTokens));
      const redirectUri = process.env.GMAIL_REDIRECT_URI ||
        (process.env.RENDER_EXTERNAL_URL ? `${process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '')}/api/integrations/gmail/callback` : 'http://localhost:8000/api/integrations/gmail/callback');

      const oauth2Client = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        redirectUri
      );
      oauth2Client.setCredentials(tokens);

      // Auto token refresh listener to save updated credentials
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

      const mailOptions = {
        from: account.emailAddress,
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
        inReplyTo: payload.inReplyTo,
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
          (info.message as any).on('data', (chunk: Buffer) =>
            chunks.push(chunk)
          );
          (info.message as any).on('end', () => {
            const buffer = Buffer.concat(chunks);
            resolve(buffer.toString('base64url'));
          });
          (info.message as any).on('error', reject);
        });
      }

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      let res: any;
      try {
        res = await gmail.users.messages.send({
          userId: 'me',
          requestBody: { raw: rawMime },
        });
      } catch (gmailErr: any) {
        // Classify OAuth errors into GmailAuthError; others bubble as-is
        const isAuthError =
          gmailErr?.code === 401 ||
          gmailErr?.code === 403 ||
          ['invalid_grant', 'unauthorized_client', 'access_denied'].includes(
            gmailErr?.response?.data?.error || ''
          );

        if (isAuthError) {
          throw classifyGoogleAuthError(gmailErr, userId, account.id);
        }
        throw gmailErr;
      }

      const messageId = res.data.id || `gmail-sent-${Date.now()}`;

      // Threading logic
      let threadId: string | null = null;
      if (payload.inReplyTo) {
        const parentEmail = await prisma.email.findUnique({
          where: { messageId: payload.inReplyTo },
        });
        if (parentEmail) threadId = parentEmail.threadId;
      }

      if (!threadId) {
        const newThread = await prisma.thread.create({
          data: { summary: payload.subject },
        });
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
          threadId,
        },
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
      auth: { user: credentials.user, pass: credentials.password },
    });

    try {
      await transporter.verify();
      const mailOptions: nodemailer.SendMailOptions = {
        from: account.emailAddress,
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
        inReplyTo: payload.inReplyTo,
      };

      const info = await transporter.sendMail(mailOptions);

      // Threading logic
      let threadId: string | null = null;
      if (payload.inReplyTo) {
        const parentEmail = await prisma.email.findUnique({
          where: { messageId: payload.inReplyTo },
        });
        if (parentEmail) threadId = parentEmail.threadId;
      }

      if (!threadId) {
        const newThread = await prisma.thread.create({
          data: { summary: payload.subject },
        });
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
          threadId,
        },
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
