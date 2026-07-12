import { PrismaClient, Digest } from '@prisma/client';
import { EmailSenderService, GmailAuthError } from '../email-sender.service';
import { logger } from '../../utils/logger';

const prisma = new PrismaClient();

export class EmailDigestAdapter {
  /**
   * Sends the compiled digest email to the user using their connected SMTP or Gmail account.
   *
   * On GmailAuthError:
   *  - Marks the user's email_account.syncState = 'needs_reauth' to stop further attempts.
   *  - Creates an in-app Notification so the frontend can surface a reconnect banner.
   *  - Does NOT re-throw — BullMQ should NOT retry dead OAuth tokens indefinitely.
   *
   * On any other error:
   *  - Re-throws so BullMQ retry/backoff policies apply as normal.
   */
  public static async sendDigest(
    digest: Digest,
    userId: string
  ): Promise<void> {
    logger.info(
      `[EmailDigestAdapter] Sending digest ${digest.id} for user: ${userId}`
    );

    try {
      // 1. Fetch user profile to get their delivery address
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      // 2. Resolve HTML and text formats from JSON content
      const content = digest.content as any;
      const html =
        content?.html || `<pre>${JSON.stringify(content, null, 2)}</pre>`;
      const text = `InboxOS ${digest.type.toUpperCase()} Digest: ${content?.emailCount || 0} low-priority updates compiled. Please view in a browser or HTML-capable email client.`;

      // 3. Send using EmailSenderService (which resolves Gmail API / SMTP dynamically)
      await EmailSenderService.send(userId, {
        to: user.email,
        subject: `Your InboxOS ${digest.type.charAt(0).toUpperCase() + digest.type.slice(1)} Digest`,
        text,
        html,
      });

      // 4. Update Digest status to sent
      await prisma.digest.update({
        where: { id: digest.id },
        data: {
          status: 'sent',
          sentAt: new Date(),
        },
      });

      logger.info(
        `[EmailDigestAdapter] Digest ${digest.id} sent and status updated to sent.`
      );
    } catch (err: any) {
      // ── Phase 1+3: Handle dead OAuth tokens without retrying ─────────────────
      if (err instanceof GmailAuthError) {
        logger.error(
          `[EmailDigestAdapter] Gmail auth failure for user ${userId} — marking needs_reauth and suppressing retry`,
          {
            digestId: digest.id,
            gmailCause: err.gmailCause,
            accountId: err.accountId,
            errorCode: err.originalCode,
          }
        );

        // Mark the email account as needing reauth so workers skip this user
        try {
          await prisma.emailAccount.update({
            where: { id: err.accountId },
            data: { syncState: 'needs_reauth' },
          });
        } catch (dbErr: any) {
          logger.error(
            '[EmailDigestAdapter] Failed to mark email_account.syncState = needs_reauth',
            { accountId: err.accountId, error: dbErr.message }
          );
        }

        // Insert an in-app notification so the frontend can surface a reconnect banner
        try {
          const reauthMessage =
            err.gmailCause === 'client_mismatch'
              ? 'Your Gmail connection was invalidated by a server configuration change. Please reconnect your Gmail account in Settings → Integrations.'
              : err.gmailCause === 'access_revoked'
              ? 'It looks like you revoked InboxOS access to your Gmail account. Please reconnect in Settings → Integrations to resume email digests.'
              : 'Your Gmail connection has expired. Please reconnect your Gmail account in Settings → Integrations to resume email digests.';

          await prisma.notification.create({
            data: {
              userId,
              type: 'system',
              title: 'Gmail Reconnection Required',
              message: reauthMessage,
              channel: null,
              metadata: {
                action: 'reconnect_gmail',
                digestId: digest.id,
                gmailCause: err.gmailCause,
              },
            },
          });
        } catch (notifyErr: any) {
          logger.error(
            '[EmailDigestAdapter] Failed to create reauth notification',
            { userId, error: notifyErr.message }
          );
        }

        // Mark digest as failed in DB
        try {
          await prisma.digest.update({
            where: { id: digest.id },
            data: { status: 'failed' },
          });
        } catch (_) { /* best effort */ }

        // DO NOT re-throw — suppresses BullMQ retry for dead tokens
        return;
      }

      // ── Any other error: log and re-throw for normal BullMQ retry ────────────
      logger.error(
        `[EmailDigestAdapter] Failed to deliver digest ${digest.id}:`,
        err.message || err
      );

      // Update Digest status to failed in database
      try {
        await prisma.digest.update({
          where: { id: digest.id },
          data: {
            status: 'failed',
          },
        });
      } catch (dbErr) {
        logger.error(
          '[EmailDigestAdapter] Failed to mark digest status as failed in database:',
          dbErr
        );
      }

      throw err; // Re-throw to trigger job retries in BullMQ
    }
  }
}
