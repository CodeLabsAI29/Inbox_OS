import axios from 'axios';
import { Email } from '@prisma/client';

export class DiscordNotifier {
  private static getWebhookUrl(): string {
    const url = process.env.DISCORD_WEBHOOK_URL;
    if (
      !url ||
      url.trim() === '' ||
      url.includes('your_test_webhook_url_here')
    ) {
      throw new Error(
        'DISCORD_WEBHOOK_URL environment variable is not configured.'
      );
    }
    return url.trim();
  }

  /**
   * Sends a notification to a Discord channel via Webhook when a new email is received.
   * Formats the email metadata (subject, sender, recipient, AI classification category, body snippet)
   * into a clean Discord embed structure.
   *
   * @param email The ingested Email object from Prisma
   * @returns Promise<boolean> indicating whether the notification was sent successfully
   */
  public static async sendEmailNotification(email: Email): Promise<boolean> {
    try {
      const webhookUrl = this.getWebhookUrl();

      // Fallback values for empty or null fields
      const subject = email.subject?.trim() || '(No Subject)';
      const category = email.category?.trim() || 'Unclassified';
      const sender = email.sender || 'Unknown Sender';
      const recipient = email.recipient || 'Unknown Recipient';

      // Generate a snippet of the email body (max 200 chars)
      const bodySnippet = email.body
        ? email.body.length > 200
          ? email.body.substring(0, 197) + '...'
          : email.body
        : '(Empty Body)';

      // Format Discord Embed
      const payload = {
        embeds: [
          {
            title: '📬 New Email Received',
            description: bodySnippet,
            color: 0x5865f2, // Discord Blurple
            fields: [
              {
                name: 'Subject',
                value: subject,
                inline: false,
              },
              {
                name: 'AI Category',
                value: `🏷️ \`${category}\``,
                inline: true,
              },
              {
                name: 'Sender',
                value: `👤 ${sender}`,
                inline: true,
              },
              {
                name: 'Recipient',
                value: `📥 ${recipient}`,
                inline: true,
              },
            ],
            timestamp: email.createdAt
              ? new Date(email.createdAt).toISOString()
              : new Date().toISOString(),
            footer: {
              text: 'InboxOS Email Operating System',
            },
          },
        ],
      };

      console.log(
        `Sending Discord notification for email: "${subject}" [Category: ${category}]`
      );

      const response = await axios.post(webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10s timeout
      });

      if (response.status >= 200 && response.status < 300) {
        console.log('Discord notification sent successfully.');
        return true;
      } else {
        console.error(
          `Failed to send Discord notification. Status code: ${response.status}`
        );
        return false;
      }
    } catch (error: any) {
      console.error('Error sending Discord notification:');
      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error(`  Status: ${error.response.status}`);
          console.error(`  Data: ${JSON.stringify(error.response.data)}`);
        } else if (error.request) {
          console.error('  No response received from Discord server.');
        } else {
          console.error(`  Request setup error: ${error.message}`);
        }
      } else {
        console.error(`  Unknown error: ${error.message || error}`);
      }
      return false;
    }
  }
}
