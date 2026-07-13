import * as chrono from 'chrono-node';
import { logger } from '../../utils/logger';

export interface CalendarEventData {
  title: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees: string[];
  meetingLink?: string;
}

export class CalendarExtractorService {
  /**
   * Detects meeting links from email body.
   * Supports Zoom, Google Meet, Microsoft Teams, and Webex.
   */
  public static detectMeetingLink(text: string): string | undefined {
    const zoomRegex =
      /https?:\/\/[a-zA-Z0-9.-]*zoom\.us\/j\/[a-zA-Z0-9?=&-_]+/i;
    const meetRegex =
      /https?:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i;
    const teamsRegex =
      /https?:\/\/teams\.microsoft\.com\/l\/meetup-join\/[a-zA-Z0-9%?=&-./_]+/i;
    const webexRegex =
      /https?:\/\/[a-zA-Z0-9.-]*webex\.com\/[a-zA-Z0-9?=&-_/]+/i;

    const zoomMatch = text.match(zoomRegex);
    if (zoomMatch) return zoomMatch[0];

    const meetMatch = text.match(meetRegex);
    if (meetMatch) return meetMatch[0];

    const teamsMatch = text.match(teamsRegex);
    if (teamsMatch) return teamsMatch[0];

    const webexMatch = text.match(webexRegex);
    if (webexMatch) return webexMatch[0];

    return undefined;
  }

  /**
   * Extracts meeting details from an email or email analysis record.
   * Uses chrono-node to parse date/time relative to email's received date.
   */
  public static extractEventDetails(
    emailAnalysis: any
  ): CalendarEventData | null {
    try {
      logger.info(
        '[CalendarExtractor] Extracting event details from email/analysis'
      );

      // Resolve nested email object if passed EmailAnalysis, otherwise fallback to the object itself
      const email = emailAnalysis?.email || emailAnalysis;
      if (!email || (!email.body && !email.body_text) || !email.subject) {
        logger.warn(
          '[CalendarExtractor] Missing subject or body in email data'
        );
        return null;
      }

      const bodyText = email.body_text || email.body || '';
      const subjectText = email.subject || '';

      // Determine reference date (received date of the email)
      const refDate = email.createdAt
        ? new Date(email.createdAt)
        : email.received_at
          ? new Date(email.received_at)
          : new Date();

      // 1. Parse date and time using chrono-node
      // Try body first, then fallback to subject
      let parsedResults = chrono.parse(bodyText, refDate);
      if (!parsedResults || parsedResults.length === 0) {
        parsedResults = chrono.parse(subjectText, refDate);
      }

      if (!parsedResults || parsedResults.length === 0) {
        logger.info(
          '[CalendarExtractor] No dates/times detected in email content'
        );
        return null;
      }

      // Take the first detected date/time result
      const result = parsedResults[0];
      const startTime = result.start.date();

      // If end date/time is not provided, default to 1 hour after start
      const endTime = result.end
        ? result.end.date()
        : new Date(startTime.getTime() + 60 * 60 * 1000);

      // 2. Detect meeting links
      const meetingLink = this.detectMeetingLink(`${subjectText}\n${bodyText}`);

      // Determine location
      const location = meetingLink || 'Online';

      // 3. Extract attendees (sender & recipient)
      const attendees: string[] = [];
      if (email.sender) {
        attendees.push(email.sender);
      }
      if (email.recipient) {
        attendees.push(email.recipient);
      }

      // Title is subject (fallback to 'Meeting')
      const title = subjectText || 'Meeting';

      return {
        title,
        startTime,
        endTime,
        location,
        attendees,
        meetingLink,
      };
    } catch (err: any) {
      logger.error('[CalendarExtractor] Extraction failed:', err);
      return null;
    }
  }
}
