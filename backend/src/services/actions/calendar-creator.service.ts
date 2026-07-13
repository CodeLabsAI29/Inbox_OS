import { google } from 'googleapis';
import { PrismaClient } from '@prisma/client';
import { encrypt, decrypt } from '../../utils/crypto';
import { logger } from '../../utils/logger';
import { CalendarEventData } from './calendar-extractor.service';

const prisma = new PrismaClient();

export class CalendarCreatorService {
  /**
   * Creates a Google Calendar event using googleapis client.
   * Gracefully throws an error if credentials are missing or expired (to trigger BullMQ retries).
   */
  public static async createGoogleCalendarEvent(
    eventData: CalendarEventData,
    userId: string,
    emailId: string
  ): Promise<any> {
    try {
      logger.info(
        `[CalendarCreator] Creating Google Calendar event for user: ${userId}`
      );

      // 1. Fetch Google Calendar integration credentials from database
      const integration = await prisma.integration.findUnique({
        where: {
          userId_provider: {
            userId,
            provider: 'google_calendar',
          },
        },
      });

      if (!integration) {
        logger.warn(
          `[CalendarCreator] Missing Google Calendar integration for user: ${userId}. Queueing/Retrying.`
        );
        throw new Error('MISSING_GOOGLE_CALENDAR_CREDENTIALS');
      }

      // 2. Decrypt tokens
      let tokens: any;
      try {
        tokens = JSON.parse(decrypt(integration.encryptedTokens));
      } catch (decryptErr) {
        logger.error(
          `[CalendarCreator] Failed to decrypt integration tokens for user: ${userId}`,
          decryptErr
        );
        throw new Error('INVALID_DECRYPTION_KEY_OR_TOKENS');
      }

      // 3. Configure Google OAuth2 Client
      const googleCalendarRedirectUri =
        process.env.GOOGLE_CALENDAR_REDIRECT_URI ||
        (process.env.RENDER_EXTERNAL_URL
          ? `${process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '')}/api/integrations/google_calendar/callback`
          : 'http://localhost:8000/api/integrations/google_calendar/callback');

      const oauth2Client = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        googleCalendarRedirectUri
      );
      oauth2Client.setCredentials(tokens);

      // Listen for token refresh events and save them back to database
      oauth2Client.on('tokens', async (newTokens) => {
        logger.info(
          `[CalendarCreator] Google Calendar OAuth tokens refreshed for user: ${userId}`
        );
        const updatedTokens = { ...tokens, ...newTokens };
        await prisma.integration.update({
          where: {
            userId_provider: {
              userId,
              provider: 'google_calendar',
            },
          },
          data: {
            encryptedTokens: encrypt(JSON.stringify(updatedTokens)), // Re-encrypt new tokens
          },
        });
      });

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      // 4. Construct event resource
      const eventResource = {
        summary: eventData.title,
        location: eventData.location || 'Online',
        description: `Meeting link: ${eventData.meetingLink || 'None'}\nCreated automatically via InboxOS.`,
        start: {
          dateTime: eventData.startTime.toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: eventData.endTime.toISOString(),
          timeZone: 'UTC',
        },
        attendees: eventData.attendees.map((email) => ({ email })),
      };

      // 5. Check if we already have an existing CalendarEvent for this email (idempotency)
      const existingEvent = await prisma.calendarEvent.findFirst({
        where: {
          userId,
          emailId,
        },
      });

      let response: any;
      if (existingEvent && existingEvent.googleEventId) {
        // Update existing event in Google Calendar
        logger.info(
          `[CalendarCreator] Updating existing Google Calendar event: ${existingEvent.googleEventId}`
        );
        response = await calendar.events.update({
          calendarId: 'primary',
          eventId: existingEvent.googleEventId,
          requestBody: eventResource,
        });
      } else {
        // Insert new event in Google Calendar
        logger.info(
          '[CalendarCreator] Inserting new event into Google Calendar'
        );
        response = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: eventResource,
        });
      }

      const googleEventId = response.data.id;

      // 6. Upsert matching record in the database
      const savedEvent = await prisma.calendarEvent.upsert({
        where: {
          googleEventId: googleEventId || '',
        },
        update: {
          title: eventData.title,
          startTime: eventData.startTime,
          endTime: eventData.endTime,
          location: eventData.location,
          attendees: eventData.attendees,
          meetingLink: eventData.meetingLink,
          status: 'created',
        },
        create: {
          userId,
          emailId,
          title: eventData.title,
          startTime: eventData.startTime,
          endTime: eventData.endTime,
          location: eventData.location,
          attendees: eventData.attendees,
          meetingLink: eventData.meetingLink,
          googleEventId,
          status: 'created',
        },
      });

      logger.info(
        `[CalendarCreator] Successfully synchronized CalendarEvent ${savedEvent.id} with Google Calendar ID ${googleEventId}`
      );
      return savedEvent;
    } catch (err: any) {
      logger.error(
        '[CalendarCreator] Event creation failed:',
        err.message || err
      );

      // Save/Update the event with status failed in the database
      try {
        await prisma.calendarEvent.upsert({
          where: {
            googleEventId: 'failed_' + emailId,
          },
          update: {
            status: 'failed',
          },
          create: {
            userId,
            emailId,
            title: eventData.title,
            startTime: eventData.startTime,
            endTime: eventData.endTime,
            location: eventData.location,
            attendees: eventData.attendees,
            meetingLink: eventData.meetingLink,
            googleEventId: 'failed_' + emailId,
            status: 'failed',
          },
        });
      } catch (dbErr) {
        logger.error(
          '[CalendarCreator] Failed to save error status to database:',
          dbErr
        );
      }

      throw err;
    }
  }
}
