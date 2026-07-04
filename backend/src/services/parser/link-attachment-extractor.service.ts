import * as cheerio from 'cheerio';
import * as crypto from 'crypto';
import { ParsedMail } from 'mailparser';
import { AIService } from '../ai.service';

export interface LinkMetadata {
  url: string;
  text: string;
  isButton: boolean;
  category: 'unsubscribe' | 'confirm' | 'download' | 'meeting' | 'payment' | 'other';
  suspicious: boolean;
}

export interface AttachmentMetadata {
  filename: string;
  contentType: string;
  byteSize: number;
  contentId: string | null;
  inline: boolean;
  md5: string;
}

export class LinkAttachmentExtractorService {
  /**
   * Extracts links from an HTML body, categorizes them, detects if styled as button, and flags phishing indicators.
   */
  public static async extractLinks(
    htmlBody: string,
    options?: { useLlmFallback?: boolean }
  ): Promise<LinkMetadata[]> {
    if (!htmlBody) {
      return [];
    }

    const $ = cheerio.load(htmlBody);
    const links: LinkMetadata[] = [];

    $('a[href]').each((_: number, el: any) => {
      const href = $(el).attr('href')?.trim();
      if (!href) return;

      const text = $(el).text().trim() || '';

      // 1. Detect if styled as button
      const className = $(el).attr('class') || '';
      const styleAttr = $(el).attr('style') || '';
      const hasButtonInside = $(el).find('button').length > 0;
      
      const isButton =
        /button|btn|cta/i.test(className) ||
        /background-color|background|border-radius|padding/i.test(styleAttr) ||
        hasButtonInside;

      // 2. Suspicious domain mismatch check (Phishing indicator)
      const suspicious = this.detectSuspiciousLink(href, text);

      // 3. Categorization (heuristic first)
      const category = this.categorizeLinkHeuristic(href, text);

      links.push({
        url: href,
        text,
        isButton,
        category,
        suspicious,
      });
    });

    // 4. Optional LLM fallback for ambiguous cases
    if (options?.useLlmFallback) {
      for (const link of links) {
        if (link.category === 'other') {
          try {
            const llmCategory = await AIService.categorizeLink(link.url, link.text);
            if (llmCategory && llmCategory !== 'other') {
              link.category = llmCategory as any;
            }
          } catch (e) {
            console.error('[LinkAttachmentExtractor] LLM fallback failed for link:', link.url, e);
          }
        }
      }
    }

    return links;
  }

  /**
   * Extracts attachment metadata from mailparser ParsedMail structure.
   */
  public static extractAttachments(rawEmail: ParsedMail): AttachmentMetadata[] {
    if (!rawEmail || !rawEmail.attachments) {
      return [];
    }

    return rawEmail.attachments.map((attachment) => {
      const filename = attachment.filename || 'unnamed_attachment';
      const contentType = attachment.contentType || 'application/octet-stream';
      const byteSize = attachment.size || 0;
      const contentId = attachment.contentId || null;
      
      // Inline vs Attached
      const inline = attachment.contentDisposition === 'inline' || !!attachment.contentId;

      // MD5 generation
      let md5 = '';
      if (attachment.content) {
        md5 = crypto.createHash('md5').update(attachment.content).digest('hex');
      } else {
        md5 = crypto
          .createHash('md5')
          .update(`${filename}-${contentType}-${byteSize}`)
          .digest('hex');
      }

      return {
        filename,
        contentType,
        byteSize,
        contentId,
        inline,
        md5,
      };
    });
  }

  /**
   * Helper to detect link / anchor text URL mismatch (phishing detection)
   */
  private static detectSuspiciousLink(href: string, text: string): boolean {
    const cleanHref = href.trim();
    const cleanText = text.trim();

    // Check if the display text looks like a URL/domain
    const urlLikeRegex = /^(https?:\/\/)?(www\.)?([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/i;
    const matchText = cleanText.match(urlLikeRegex);
    if (!matchText) {
      return false;
    }

    try {
      let hrefHost = '';
      if (cleanHref.startsWith('http://') || cleanHref.startsWith('https://')) {
        hrefHost = new URL(cleanHref).hostname;
      } else if (cleanHref.startsWith('//')) {
        hrefHost = new URL('https:' + cleanHref).hostname;
      } else {
        return false;
      }

      const textHost = matchText[3];
      const normHrefHost = hrefHost.toLowerCase().replace(/^www\./, '');
      const normTextHost = textHost.toLowerCase().replace(/^www\./, '');

      return normHrefHost !== normTextHost;
    } catch (e) {
      return false;
    }
  }

  /**
   * Heuristic rules to categorize links
   */
  private static categorizeLinkHeuristic(
    href: string,
    text: string
  ): 'unsubscribe' | 'confirm' | 'download' | 'meeting' | 'payment' | 'other' {
    const lowerHref = href.toLowerCase();
    const lowerText = text.toLowerCase();

    // Unsubscribe heuristic
    if (
      lowerHref.includes('unsubscribe') ||
      lowerHref.includes('optout') ||
      lowerHref.includes('opt-out') ||
      lowerHref.includes('unsub') ||
      lowerText.includes('unsubscribe') ||
      lowerText.includes('opt out') ||
      lowerText.includes('opt-out') ||
      lowerText.includes('stop receiving')
    ) {
      return 'unsubscribe';
    }

    // Confirm heuristic
    if (
      lowerHref.includes('confirm') ||
      lowerHref.includes('verify') ||
      lowerHref.includes('activate') ||
      lowerHref.includes('approve') ||
      lowerHref.includes('validate') ||
      lowerText.includes('confirm') ||
      lowerText.includes('verify') ||
      lowerText.includes('activate') ||
      lowerText.includes('approve') ||
      lowerText.includes('validate') ||
      lowerText.includes('yes,')
    ) {
      return 'confirm';
    }

    // Meeting heuristic
    if (
      lowerHref.includes('zoom.us') ||
      lowerHref.includes('meet.google.com') ||
      lowerHref.includes('teams.microsoft.com') ||
      lowerHref.includes('calendly.com') ||
      lowerHref.includes('cal.com') ||
      lowerText.includes('join meeting') ||
      lowerText.includes('zoom') ||
      lowerText.includes('google meet') ||
      lowerText.includes('calendly') ||
      lowerText.includes('schedule') ||
      lowerText.includes('book a time')
    ) {
      return 'meeting';
    }

    // Download heuristic
    if (
      lowerHref.includes('.pdf') ||
      lowerHref.includes('.zip') ||
      lowerHref.includes('.dmg') ||
      lowerHref.includes('.exe') ||
      lowerHref.includes('.docx') ||
      lowerHref.includes('.xlsx') ||
      lowerHref.includes('download') ||
      lowerHref.includes('attachment') ||
      lowerText.includes('download') ||
      lowerText.includes('get the file') ||
      lowerText.includes('view pdf')
    ) {
      return 'download';
    }

    // Payment heuristic
    if (
      lowerHref.includes('stripe.com') ||
      lowerHref.includes('paypal.com') ||
      lowerHref.includes('checkout') ||
      lowerHref.includes('pay') ||
      lowerHref.includes('invoice') ||
      lowerHref.includes('billing') ||
      lowerText.includes('pay') ||
      lowerText.includes('invoice') ||
      lowerText.includes('checkout') ||
      lowerText.includes('billing') ||
      lowerText.includes('buy') ||
      lowerText.includes('purchase')
    ) {
      return 'payment';
    }

    return 'other';
  }
}
