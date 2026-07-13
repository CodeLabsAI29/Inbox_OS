import { LinkAttachmentExtractorService } from '../services/parser/link-attachment-extractor.service';
import { ParsedMail } from 'mailparser';
import { AIService } from '../services/ai.service';

// We will use jest.spyOn for testing the LLM fallback

describe('LinkAttachmentExtractorService', () => {
  describe('extractLinks', () => {
    it('should extract and categorize links correctly', async () => {
      const htmlBody = `
        <p>Hi there,</p>
        <p>Please <a href="https://example.com/confirm?token=123" class="btn-primary" style="background-color: blue; padding: 10px;">confirm your account</a>.</p>
        <p>Join the team meeting here: <a href="https://zoom.us/j/123456789">Zoom Link</a>.</p>
        <p>If you no longer want to receive these emails, <a href="https://example.com/unsubscribe">unsubscribe here</a>.</p>
      `;

      const links = await LinkAttachmentExtractorService.extractLinks(htmlBody);

      expect(links).toHaveLength(3);

      // Confirm Link
      const confirmLink = links.find((l) => l.url.includes('confirm'));
      expect(confirmLink).toBeDefined();
      expect(confirmLink?.category).toBe('confirm');
      expect(confirmLink?.isButton).toBe(true);
      expect(confirmLink?.suspicious).toBe(false);

      // Meeting Link
      const meetingLink = links.find((l) => l.url.includes('zoom.us'));
      expect(meetingLink).toBeDefined();
      expect(meetingLink?.category).toBe('meeting');
      expect(meetingLink?.isButton).toBe(false);
      expect(meetingLink?.suspicious).toBe(false);

      // Unsubscribe Link
      const unsubLink = links.find((l) => l.url.includes('unsubscribe'));
      expect(unsubLink).toBeDefined();
      expect(unsubLink?.category).toBe('unsubscribe');
      expect(unsubLink?.isButton).toBe(false);
      expect(unsubLink?.suspicious).toBe(false);
    });

    it('should detect suspicious phishing links (domain mismatch)', async () => {
      const htmlBody = `
        <p>Please log in to your bank account: <a href="https://secure-phishingsite.com/login">https://paypal.com/login</a></p>
      `;

      const links = await LinkAttachmentExtractorService.extractLinks(htmlBody);
      expect(links).toHaveLength(1);
      expect(links[0].suspicious).toBe(true);
      expect(links[0].url).toBe('https://secure-phishingsite.com/login');
      expect(links[0].text).toBe('https://paypal.com/login');
    });

    it('should trigger LLM fallback for ambiguous links when requested', async () => {
      const htmlBody = `
        <p>Check out this <a href="https://example.com/something-ambiguous">awesome link</a>.</p>
      `;

      // Spy on AIService.categorizeLink
      const spy = jest
        .spyOn(AIService, 'categorizeLink')
        .mockResolvedValue('meeting');

      // Without LLM fallback, it should default to 'other'
      const linksNoLlm =
        await LinkAttachmentExtractorService.extractLinks(htmlBody);
      expect(linksNoLlm[0].category).toBe('other');

      // With LLM fallback, it should call AIService.categorizeLink and update category
      const linksWithLlm = await LinkAttachmentExtractorService.extractLinks(
        htmlBody,
        { useLlmFallback: true }
      );
      expect(spy).toHaveBeenCalledWith(
        'https://example.com/something-ambiguous',
        'awesome link'
      );
      expect(linksWithLlm[0].category).toBe('meeting'); // Spy mocked return value

      // Clean up spy
      spy.mockRestore();
    });
  });

  describe('extractAttachments', () => {
    it('should extract attachment metadata including inline flags and MD5 checksums', () => {
      const mockParsedMail = {
        attachments: [
          {
            filename: 'invoice.pdf',
            contentType: 'application/pdf',
            size: 12345,
            contentId: 'inv-123',
            contentDisposition: 'attachment',
            content: Buffer.from('mock pdf content'),
          },
          {
            filename: 'logo.png',
            contentType: 'image/png',
            size: 450,
            contentId: 'logo-img',
            contentDisposition: 'inline',
            content: Buffer.from('mock image content'),
          },
        ],
      } as unknown as ParsedMail;

      const attachments =
        LinkAttachmentExtractorService.extractAttachments(mockParsedMail);

      expect(attachments).toHaveLength(2);

      // PDF Attachment
      const pdf = attachments.find((a) => a.filename === 'invoice.pdf');
      expect(pdf).toBeDefined();
      expect(pdf?.contentType).toBe('application/pdf');
      expect(pdf?.byteSize).toBe(12345);
      expect(pdf?.contentId).toBe('inv-123');
      expect(pdf?.inline).toBe(true); // Since it has contentId, it counts as inline/referenceable
      expect(pdf?.md5).toBeDefined();
      expect(pdf?.md5.length).toBe(32); // Valid MD5 hex string length

      // Image Attachment
      const png = attachments.find((a) => a.filename === 'logo.png');
      expect(png).toBeDefined();
      expect(png?.contentType).toBe('image/png');
      expect(png?.byteSize).toBe(450);
      expect(png?.contentId).toBe('logo-img');
      expect(png?.inline).toBe(true);
      expect(png?.md5).toBeDefined();
    });
  });
});
