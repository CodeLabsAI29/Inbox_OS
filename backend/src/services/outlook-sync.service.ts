import { logger } from '../utils/logger';

export interface OutlookSyncConfig {
  userId: string;
  emailAddress: string;
  accessToken: string;
  refreshToken?: string;
}

/**
 * OutlookSyncService — syncs emails from Microsoft Outlook via Microsoft Graph API.
 *
 * Prerequisites: OUTLOOK_CLIENT_ID and OUTLOOK_CLIENT_SECRET must be set in .env.
 * The user must have connected their Outlook account via /api/integrations/outlook/auth.
 */
export class OutlookSyncService {
  private static readonly GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

  /**
   * Sync new emails from Outlook inbox for a given user.
   */
  public static async syncEmails(
    config: OutlookSyncConfig
  ): Promise<{ synced: number }> {
    logger.info('[OutlookSync] Starting email sync', {
      userId: config.userId,
      email: config.emailAddress,
    });

    try {
      const messages = await this.fetchMessages(config.accessToken);
      logger.info('[OutlookSync] Fetched messages', { count: messages.length });
      return { synced: messages.length };
    } catch (err: any) {
      logger.error('[OutlookSync] Sync failed:', err.message);
      throw err;
    }
  }

  /**
   * Fetch messages from the Outlook inbox using Microsoft Graph API.
   */
  private static async fetchMessages(
    accessToken: string,
    top: number = 25
  ): Promise<any[]> {
    const url = `${this.GRAPH_BASE}/me/messages?$top=${top}&$orderby=receivedDateTime desc&$select=id,subject,from,toRecipients,body,receivedDateTime,internetMessageId`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const err: any = await response.json();
      throw new Error(
        `Graph API error: ${err.error?.message || response.statusText}`
      );
    }

    const data: any = await response.json();
    return data.value || [];
  }

  /**
   * Refresh an Outlook access token using refresh token.
   */
  public static async refreshAccessToken(
    refreshToken: string
  ): Promise<{ access_token: string; refresh_token?: string }> {
    const clientId = process.env.OUTLOOK_CLIENT_ID;
    const clientSecret = process.env.OUTLOOK_CLIENT_SECRET;
    const tenant = process.env.OUTLOOK_TENANT || 'common';

    if (!clientId || !clientSecret) {
      throw new Error('Outlook OAuth credentials not configured');
    }

    const response = await fetch(
      `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      }
    );

    const tokens: any = await response.json();
    if (tokens.error) {
      throw new Error(`Token refresh failed: ${tokens.error_description}`);
    }

    return tokens;
  }
}
