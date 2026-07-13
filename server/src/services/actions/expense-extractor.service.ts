import { PrismaClient, Expense } from '@prisma/client';
import { AIService } from '../ai.service';
import { logger } from '../../utils/logger';

const prisma = new PrismaClient();

const STATIC_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 1.09,
  GBP: 1.27,
  JPY: 0.0062,
  CAD: 0.73,
  INR: 0.012,
  AUD: 0.67,
  CNY: 0.14,
};

export class ExpenseExtractorService {
  /**
   * Normalize merchant name to standard form.
   */
  public static normalizeMerchantName(name: string): string {
    if (!name) return 'Unknown';
    let n = name.trim();
    // Strip common suffixes
    n = n.replace(
      /\b(inc|corp|co|ltd|llc|plc|technologies|solutions|group|intl|international|asia|usa)\b\.?/gi,
      ''
    );
    n = n.replace(/\s+/g, ' ').trim();

    const lower = n.toLowerCase();
    if (lower.startsWith('uber')) return 'Uber';
    if (lower.startsWith('amazon')) return 'Amazon';
    if (lower.startsWith('netflix')) return 'Netflix';
    if (lower.startsWith('spotify')) return 'Spotify';
    if (lower.startsWith('apple')) return 'Apple';
    if (lower.startsWith('google')) return 'Google';
    if (lower.startsWith('microsoft')) return 'Microsoft';
    if (lower.startsWith('steam')) return 'Steam';
    if (lower.startsWith('github')) return 'GitHub';

    return n.charAt(0).toUpperCase() + n.slice(1);
  }

  /**
   * Fetch latest USD exchange rates with fallback.
   */
  public static async fetchExchangeRates(): Promise<Record<string, number>> {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 1000); // 1s timeout

      const response = await fetch('https://open.er-api.com/v6/latest/USD', {
        signal: controller.signal,
      });
      clearTimeout(id);

      if (response.ok) {
        const data = (await response.json()) as any;
        if (data && data.rates) {
          // Convert rates format to USD per currency
          const rates: Record<string, number> = {};
          for (const [currency, rate] of Object.entries(data.rates)) {
            // exchange rate API returns currency_per_USD, so: 1 / rate = USD_per_currency
            rates[currency] = 1 / (rate as number);
          }
          rates['USD'] = 1.0;
          return rates;
        }
      }
    } catch (err: any) {
      logger.warn(
        '[ExpenseExtractor] Failed to fetch exchange rates, using static fallback:',
        err.message || err
      );
    }
    return STATIC_RATES;
  }

  /**
   * Perform currency conversion to USD.
   */
  public static async convertToUsd(
    amount: number,
    currency: string
  ): Promise<number> {
    const rates = await this.fetchExchangeRates();
    const cleanCurrency = (currency || 'USD').toUpperCase();
    const rate = rates[cleanCurrency] || STATIC_RATES[cleanCurrency] || 1.0;
    return amount * rate;
  }

  /**
   * Check if a merchant transaction is recurring.
   */
  public static async checkIsRecurring(
    userId: string,
    merchantName: string,
    amount: number,
    date: Date
  ): Promise<boolean> {
    const normalized = this.normalizeMerchantName(merchantName);

    // Fetch past expenses for the same user and merchant
    const pastExpenses = await prisma.expense.findMany({
      where: {
        userId,
        merchantName: {
          equals: normalized,
          mode: 'insensitive',
        },
      },
      orderBy: {
        date: 'desc',
      },
      take: 10,
    });

    if (pastExpenses.length === 0) return false;

    for (const past of pastExpenses) {
      if (!past.amount || !past.date) continue;

      // 1. Check similar amount (within ±10%)
      const amountDiff = Math.abs(past.amount - amount);
      const isSimilarAmount = amountDiff <= 0.1 * amount;

      // 2. Check regular interval (within ±3 days of weekly/monthly/yearly cycles)
      const diffTime = Math.abs(date.getTime() - past.date.getTime());
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      const isRegularInterval = [7, 14, 28, 30, 31, 90, 365].some(
        (cycle) => Math.abs(diffDays - cycle) <= 3
      );

      if (isSimilarAmount && isRegularInterval) {
        return true;
      }
    }

    return false;
  }

  /**
   * Fallback regex parsing of email subject/body.
   */
  public static parseWithRegex(
    subject: string,
    body: string,
    sender: string,
    emailDate: Date
  ): {
    amount: number;
    currency: string;
    merchantName: string;
    category: string;
    date: Date;
    paymentMethod: string;
    items: any[];
  } {
    const text = `${subject}\n${body}`;
    let amount = 0;
    let currency = 'USD';

    // Search patterns: $XX.XX, €XX.XX, £XX.XX, etc.
    const usdMatch = text.match(/\$([0-9,]+\.[0-9]{2})/);
    const eurMatch = text.match(/[€e]([0-9,]+[.,][0-9]{2})/i);
    const gbpMatch = text.match(/[£g]([0-9,]+\.[0-9]{2})/i);
    const jpyMatch = text.match(/[¥￥]([0-9,]+)/);

    if (usdMatch) {
      amount = parseFloat(usdMatch[1].replace(/,/g, ''));
      currency = 'USD';
    } else if (eurMatch) {
      amount = parseFloat(eurMatch[1].replace(/,/g, '').replace(/,/g, '.'));
      currency = 'EUR';
    } else if (gbpMatch) {
      amount = parseFloat(gbpMatch[1].replace(/,/g, ''));
      currency = 'GBP';
    } else if (jpyMatch) {
      amount = parseFloat(jpyMatch[1].replace(/,/g, ''));
      currency = 'JPY';
    } else {
      // General float pattern
      const floatMatch = text.match(/\b([0-9,]+\.[0-9]{2})\b/);
      if (floatMatch) {
        amount = parseFloat(floatMatch[1].replace(/,/g, ''));
      }
    }

    // Extract merchant name from sender
    let merchantName = 'Unknown';
    if (sender) {
      const cleanSender = sender.includes('<')
        ? sender.match(/<([^>]+)>/)?.[1] || sender
        : sender;
      const parts = cleanSender.split('@');
      const domain = parts[1] || parts[0];
      if (domain) {
        const domainName = domain.split('.')[0];
        merchantName = this.normalizeMerchantName(domainName);
      }
    }

    return {
      amount,
      currency,
      merchantName,
      category: 'other',
      date: emailDate,
      paymentMethod: 'Unknown',
      items: [],
    };
  }

  /**
   * Main entry method: extract structured expense data from receipt/invoice email.
   */
  public static async extractExpense(emailId: string): Promise<Expense | null> {
    logger.info(
      `[ExpenseExtractor] Initiating extraction for email: ${emailId}`
    );

    try {
      // 1. Fetch Email
      const email = await prisma.email.findUnique({
        where: { id: emailId },
      });

      if (!email) {
        logger.error(`[ExpenseExtractor] Email not found: ${emailId}`);
        return null;
      }

      const subject = email.subject || '';
      const body = email.body || '';
      const sender = email.sender || '';
      const emailDate = email.createdAt || new Date();

      // 2. Keyword Filter (Save LLM Costs)
      const lowercaseContent = `${subject} ${body}`.toLowerCase();
      const keywords = [
        'receipt',
        'invoice',
        'order confirmation',
        'payment received',
        'your order',
      ];
      const matchesKeyword = keywords.some((k) => lowercaseContent.includes(k));

      if (!matchesKeyword) {
        logger.info(
          `[ExpenseExtractor] Email ${emailId} did not match invoice/receipt keywords. Skipping extraction.`
        );
        return null;
      }

      let parsedReceipts: any[] = [];
      let llmFailed = false;

      // 3. OpenAI Call (Structured Outputs Schema)
      try {
        const openai = AIService.getOpenAI();
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                'You are an expert expense parser. Analyze the receipt/invoice email and extract receipt records. Support multiple receipts in a single email if present.',
            },
            {
              role: 'user',
              content: `Sender: ${sender}\nSubject: ${subject}\nBody:\n${body}`,
            },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'expense_extraction',
              strict: true,
              schema: {
                type: 'object',
                properties: {
                  receipts: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        amount: { type: 'number' },
                        currency: { type: 'string' },
                        merchantName: { type: 'string' },
                        category: { type: 'string' },
                        date: { type: 'string' },
                        paymentMethod: { type: 'string' },
                        items: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              name: { type: 'string' },
                              quantity: { type: 'number' },
                              unitPrice: { type: 'number' },
                            },
                            required: ['name', 'quantity', 'unitPrice'],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: [
                        'amount',
                        'currency',
                        'merchantName',
                        'category',
                        'date',
                        'paymentMethod',
                        'items',
                      ],
                      additionalProperties: false,
                    },
                  },
                },
                required: ['receipts'],
                additionalProperties: false,
              },
            },
          },
        });

        const jsonRaw = response.choices[0]?.message?.content || '{}';
        const result = JSON.parse(jsonRaw);
        parsedReceipts = result.receipts || [];
      } catch (err: any) {
        logger.warn(
          '[ExpenseExtractor] OpenAI structured output failed. Falling back to regex:',
          err.message || err
        );
        llmFailed = true;
      }

      // 4. Fallback to Regex
      if (llmFailed || parsedReceipts.length === 0) {
        const fallback = this.parseWithRegex(subject, body, sender, emailDate);
        if (fallback.amount > 0) {
          parsedReceipts.push(fallback);
        }
      }

      if (parsedReceipts.length === 0) {
        logger.info('[ExpenseExtractor] No receipts extracted from email.');
        return null;
      }

      // 5. Normalize, Convert Currencies, Detect Recurring, & Save Expenses
      const savedExpenses: Expense[] = [];

      for (const receipt of parsedReceipts) {
        const originalAmount = receipt.amount || 0;
        const currency = (receipt.currency || 'USD').toUpperCase();
        const merchantName = this.normalizeMerchantName(receipt.merchantName);
        const category = receipt.category || 'other';
        const paymentMethod = receipt.paymentMethod || 'Unknown';
        const items = receipt.items || [];

        let parsedDate = emailDate;
        if (receipt.date) {
          const tryDate = new Date(receipt.date);
          if (!isNaN(tryDate.getTime())) {
            parsedDate = tryDate;
          }
        }

        // Convert original currency to USD equivalent
        const amountUsd = await this.convertToUsd(originalAmount, currency);

        // Check if transaction is a recurring billing/subscription
        const isRecurring = await this.checkIsRecurring(
          email.userId,
          merchantName,
          originalAmount,
          parsedDate
        );

        // Save record to DB
        const saved = await prisma.expense.create({
          data: {
            userId: email.userId,
            emailId: email.id,
            amount: originalAmount,
            amountUsd,
            currency,
            merchantName,
            category,
            date: parsedDate,
            paymentMethod,
            items: items as any,
            isRecurring,
          },
        });

        savedExpenses.push(saved);
      }

      logger.info(
        `[ExpenseExtractor] Successfully saved ${savedExpenses.length} expense records.`
      );
      return savedExpenses[0] || null;
    } catch (err: any) {
      logger.error(
        '[ExpenseExtractor] Unhandled extraction error:',
        err.message || err
      );
      return null;
    }
  }
}
