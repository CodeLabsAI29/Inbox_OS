import { EmailCategory } from './ai.service';

export class KeywordFilter {
  // Known spam and newsletter keywords compiled into Regex for fast text scanning
  // case-insensitive matches using the 'i' flag
  private static readonly NEWSLETTER_KEYWORDS: RegExp[] = [
    /unsubscribe/i,
    /view (in|online) browser/i,
    /opt-out/i,
    /opt out/i,
    /mailing list/i,
    /manage subscription/i,
    /subscription preferences/i,
    /click here to/i,
    /weekly digest/i,
    /monthly digest/i,
    /newsletter/i
  ];

  private static readonly SPAM_KEYWORDS: RegExp[] = [
    /buy now/i,
    /earn money/i,
    /make money/i,
    /work from home/i,
    /lottery winner/i,
    /risk-free/i,
    /satisfaction guaranteed/i,
    /special promotion/i,
    /free trial/i,
    /gift card/i,
    /eliminate debt/i,
    /lowest price/i,
    /get rich/i,
    /100% free/i,
    /casino/i,
    /viagra/i
  ];

  /**
   * Scans the email body text using fast regex matching.
   * Returns a category ('newsletter', 'spam') if a threshold of keywords is hit.
   * Returns null if no threshold is met.
   * 
   * @param body The email body content.
   * @param threshold The number of unique keyword matches required to trigger the classification (default: 1).
   */
  public static classify(body: string, threshold: number = 1): EmailCategory | null {
    if (!body) {
      return null;
    }

    // Scan for newsletter keywords
    let newsletterCount = 0;
    for (const regex of this.NEWSLETTER_KEYWORDS) {
      if (regex.test(body)) {
        newsletterCount++;
        if (newsletterCount >= threshold) {
          return 'newsletter';
        }
      }
    }

    // Scan for spam keywords
    let spamCount = 0;
    for (const regex of this.SPAM_KEYWORDS) {
      if (regex.test(body)) {
        spamCount++;
        if (spamCount >= threshold) {
          return 'spam';
        }
      }
    }

    return null;
  }
}
