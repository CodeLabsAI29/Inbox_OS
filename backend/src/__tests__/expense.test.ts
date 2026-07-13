import { ExpenseExtractorService } from '../services/actions/expense-extractor.service';
import { AIService } from '../services/ai.service';
import { PrismaClient } from '@prisma/client';

// Mock PrismaClient
jest.mock('@prisma/client', () => {
  const mPrisma = {
    email: {
      findUnique: jest.fn(),
    },
    expense: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn().mockImplementation(() => mPrisma),
  };
});

// Mock AIService
jest.mock('../services/ai.service', () => ({
  AIService: {
    getOpenAI: jest.fn(),
  },
}));

const prisma = new PrismaClient();

describe('ExpenseExtractorService tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Keyword filtering', () => {
    it('should return null immediately if subject or body does not contain receipt keywords', async () => {
      (prisma.email.findUnique as jest.Mock).mockResolvedValue({
        id: 'email-1',
        userId: 'user-1',
        subject: 'Weekly status report from team',
        body: 'Here are the updates for this week. No blockages reported.',
        sender: 'pm@company.com',
        createdAt: new Date(),
      });

      const expense = await ExpenseExtractorService.extractExpense('email-1');

      expect(expense).toBeNull();
      expect(AIService.getOpenAI).not.toHaveBeenCalled();
    });
  });

  describe('Merchant normalization', () => {
    it('should strip common business suffixes and standardize merchant names', () => {
      expect(
        ExpenseExtractorService.normalizeMerchantName('Uber Technologies Inc')
      ).toBe('Uber');
      expect(
        ExpenseExtractorService.normalizeMerchantName('Amazon Corp.')
      ).toBe('Amazon');
      expect(ExpenseExtractorService.normalizeMerchantName('Netflix LLC')).toBe(
        'Netflix'
      );
      expect(ExpenseExtractorService.normalizeMerchantName('Spotify Co.')).toBe(
        'Spotify'
      );
      expect(
        ExpenseExtractorService.normalizeMerchantName('Acme Solutions Ltd.')
      ).toBe('Acme');
    });
  });

  describe('Currency conversion', () => {
    it('should convert amounts correctly using static rates fallback', async () => {
      jest
        .spyOn(ExpenseExtractorService, 'fetchExchangeRates')
        .mockResolvedValue({
          USD: 1.0,
          EUR: 1.09,
          GBP: 1.27,
          JPY: 0.0062,
          CAD: 0.73,
          INR: 0.012,
        });

      const valEur = await ExpenseExtractorService.convertToUsd(100, 'EUR');
      expect(valEur).toBeCloseTo(109); // 100 * 1.09

      const valGbp = await ExpenseExtractorService.convertToUsd(100, 'GBP');
      expect(valGbp).toBeCloseTo(127); // 100 * 1.27

      const valJpy = await ExpenseExtractorService.convertToUsd(1000, 'JPY');
      expect(valJpy).toBeCloseTo(6.2); // 1000 * 0.0062
    });
  });

  describe('Recurring detection', () => {
    it('should return true if there is a similar amount and date interval of weekly/monthly/yearly cycles', async () => {
      const currentDate = new Date('2026-07-31T08:00:00Z');
      const pastDate = new Date('2026-07-01T08:00:00Z'); // 30 days gap

      (prisma.expense.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'past-exp-1',
          amount: 50.0,
          date: pastDate,
        },
      ]);

      const isRecurring = await ExpenseExtractorService.checkIsRecurring(
        'user-1',
        'Netflix',
        52.0, // within 10% of 50.0 (52.0 - 50.0 = 2, which is <= 5.0)
        currentDate
      );

      expect(isRecurring).toBe(true);
    });

    it('should return false if there is no similar amount', async () => {
      const currentDate = new Date('2026-07-31T08:00:00Z');
      const pastDate = new Date('2026-07-01T08:00:00Z');

      (prisma.expense.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'past-exp-1',
          amount: 15.0,
          date: pastDate,
        },
      ]);

      const isRecurring = await ExpenseExtractorService.checkIsRecurring(
        'user-1',
        'Netflix',
        50.0, // outside 10% threshold of 15.0
        currentDate
      );

      expect(isRecurring).toBe(false);
    });
  });

  describe('Regex fallback', () => {
    it('should extract simple amount patterns and sender merchant when OpenAI fails', () => {
      const subject = 'Your invoice #12345';
      const body = 'Thanks for your payment of €99.99 for your subscription.';
      const sender = 'support@netflix.com';
      const emailDate = new Date();

      const result = ExpenseExtractorService.parseWithRegex(
        subject,
        body,
        sender,
        emailDate
      );

      expect(result.amount).toBe(99.99);
      expect(result.currency).toBe('EUR');
      expect(result.merchantName).toBe('Netflix');
      expect(result.category).toBe('other');
    });
  });

  describe('LLM Extraction and receipt splitting', () => {
    it('should call OpenAI and split multiple receipts into database records', async () => {
      (prisma.email.findUnique as jest.Mock).mockResolvedValue({
        id: 'email-2',
        userId: 'user-1',
        subject: 'Amazon order confirmations',
        body: 'You ordered a Wireless Mouse for $29.99 and a Keyboard for $45.50.',
        sender: 'auto-confirm@amazon.com',
        createdAt: new Date(),
      });

      const mockOpenAIClient = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      receipts: [
                        {
                          amount: 29.99,
                          currency: 'USD',
                          merchantName: 'Amazon',
                          category: 'shopping',
                          date: '2026-07-01T12:00:00Z',
                          paymentMethod: 'Visa',
                          items: [
                            {
                              name: 'Wireless Mouse',
                              quantity: 1,
                              unitPrice: 29.99,
                            },
                          ],
                        },
                        {
                          amount: 45.5,
                          currency: 'USD',
                          merchantName: 'Amazon',
                          category: 'shopping',
                          date: '2026-07-01T12:05:00Z',
                          paymentMethod: 'Visa',
                          items: [
                            { name: 'Keyboard', quantity: 1, unitPrice: 45.5 },
                          ],
                        },
                      ],
                    }),
                  },
                },
              ],
            }),
          },
        },
      };

      (AIService.getOpenAI as jest.Mock).mockReturnValue(mockOpenAIClient);
      (prisma.expense.findMany as jest.Mock).mockResolvedValue([]); // no past expenses for recurring check

      (prisma.expense.create as jest.Mock)
        .mockResolvedValueOnce({
          id: 'exp-mouse',
          amount: 29.99,
          merchantName: 'Amazon',
        })
        .mockResolvedValueOnce({
          id: 'exp-keyboard',
          amount: 45.5,
          merchantName: 'Amazon',
        });

      const firstExpense =
        await ExpenseExtractorService.extractExpense('email-2');

      expect(firstExpense).toBeDefined();
      expect(firstExpense?.id).toBe('exp-mouse');
      expect(prisma.expense.create).toHaveBeenCalledTimes(2);
      expect(prisma.expense.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          data: expect.objectContaining({
            amount: 29.99,
            merchantName: 'Amazon',
            category: 'shopping',
          }),
        })
      );
      expect(prisma.expense.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          data: expect.objectContaining({
            amount: 45.5,
            merchantName: 'Amazon',
            category: 'shopping',
          }),
        })
      );
    });
  });
});
