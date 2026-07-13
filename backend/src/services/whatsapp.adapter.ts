import { logger } from '../utils/logger';

export interface WhatsAppMessage {
  to: string; // E.164 format: +1234567890
  body: string;
}

/**
 * WhatsAppAdapter — Sends WhatsApp messages via Twilio WhatsApp API.
 *
 * Prerequisites:
 * - TWILIO_ACCOUNT_SID set in .env
 * - TWILIO_AUTH_TOKEN set in .env
 * - TWILIO_WHATSAPP_FROM set in .env (format: whatsapp:+14155238886)
 */
export class WhatsAppAdapter {
  private static get isConfigured(): boolean {
    return !!(
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_WHATSAPP_FROM
    );
  }

  /**
   * Send a WhatsApp message via Twilio.
   */
  public static async sendMessage(
    message: WhatsAppMessage
  ): Promise<{ sid: string }> {
    if (!this.isConfigured) {
      logger.warn(
        '[WhatsApp] Twilio credentials not configured. Skipping message send.'
      );
      throw new Error(
        'WhatsApp (Twilio) not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM.'
      );
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID!;
    const authToken = process.env.TWILIO_AUTH_TOKEN!;
    const from = process.env.TWILIO_WHATSAPP_FROM!;
    const to = `whatsapp:${message.to}`;

    logger.info('[WhatsApp] Sending message', { to: message.to });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ From: from, To: to, Body: message.body }),
      }
    );

    const data: any = await response.json();

    if (!response.ok) {
      logger.error('[WhatsApp] Twilio API error:', data);
      throw new Error(`Twilio error ${data.code}: ${data.message}`);
    }

    logger.info('[WhatsApp] Message sent', { sid: data.sid });
    return { sid: data.sid };
  }

  /**
   * Send an email alert notification via WhatsApp.
   */
  public static async sendEmailAlert(
    to: string,
    subject: string,
    sender: string
  ): Promise<void> {
    await this.sendMessage({
      to,
      body: `📧 New email from *${sender}*\nSubject: ${subject}\n\n_InboxOS Alert_`,
    });
  }
}
