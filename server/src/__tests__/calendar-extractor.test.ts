import { CalendarExtractorService } from '../services/actions/calendar-extractor.service';

describe('CalendarExtractorService', () => {
  describe('detectMeetingLink', () => {
    it('should detect Zoom link', () => {
      const text = 'Here is the link: https://zoom.us/j/123456789?pwd=abc';
      expect(CalendarExtractorService.detectMeetingLink(text)).toBe(
        'https://zoom.us/j/123456789?pwd=abc'
      );
    });

    it('should detect Google Meet link', () => {
      const text = 'Meeting on: https://meet.google.com/abc-defg-hij';
      expect(CalendarExtractorService.detectMeetingLink(text)).toBe(
        'https://meet.google.com/abc-defg-hij'
      );
    });

    it('should detect Teams link', () => {
      const text =
        'Join Microsoft Teams meeting at https://teams.microsoft.com/l/meetup-join/19%3ameeting_xyz';
      expect(CalendarExtractorService.detectMeetingLink(text)).toBe(
        'https://teams.microsoft.com/l/meetup-join/19%3ameeting_xyz'
      );
    });

    it('should return undefined if no meeting link is present', () => {
      const text = 'No link here, just regular email text.';
      expect(CalendarExtractorService.detectMeetingLink(text)).toBeUndefined();
    });
  });

  describe('extractEventDetails', () => {
    const referenceDate = new Date('2026-07-04T12:00:00Z'); // Saturday

    it('should extract meeting details from email body with absolute date', () => {
      const email = {
        subject: 'Project Kickoff Meeting',
        body: 'Let us meet on July 10, 2026 at 3 PM to start the project. We will use https://meet.google.com/abc-defg-hij.',
        sender: 'alice@company.com',
        recipient: 'bob@company.com',
        createdAt: referenceDate,
      };

      const result = CalendarExtractorService.extractEventDetails(email);
      expect(result).not.toBeNull();
      expect(result?.title).toBe('Project Kickoff Meeting');
      expect(result?.meetingLink).toBe('https://meet.google.com/abc-defg-hij');
      expect(result?.location).toBe('https://meet.google.com/abc-defg-hij');
      expect(result?.attendees).toEqual([
        'alice@company.com',
        'bob@company.com',
      ]);
      expect(result?.startTime.getFullYear()).toBe(2026);
      expect(result?.startTime.getMonth()).toBe(6); // July
      expect(result?.startTime.getDate()).toBe(10);
      expect(result?.startTime.getHours()).toBe(15);
    });

    it('should handle ambiguous dates like next Friday relative to email received date', () => {
      const email = {
        subject: 'Interview Invitation',
        body: 'We would love to interview you next Friday at 2 PM. Please join: https://zoom.us/j/987654321.',
        sender: 'hr@startup.co',
        recipient: 'candidate@inboxos.dev',
        createdAt: referenceDate, // 2026-07-04 (Saturday) -> Next Friday is 2026-07-10
      };

      const result = CalendarExtractorService.extractEventDetails(email);
      expect(result).not.toBeNull();
      expect(result?.startTime.getFullYear()).toBe(2026);
      expect(result?.startTime.getMonth()).toBe(6); // July
      expect(result?.startTime.getDate()).toBe(10);
      expect(result?.startTime.getHours()).toBe(14);
    });
  });
});
