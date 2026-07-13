import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  requireAuth,
  AuthenticatedRequest,
} from '../middleware/auth.middleware';
import { ExpenseExtractorService } from '../services/actions/expense-extractor.service';
import { logger } from '../utils/logger';

export const expensesRouter = Router();
const prisma = new PrismaClient();

/**
 * GET /api/expenses
 * List expenses for the authenticated user
 */
expensesRouter.get(
  '/',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const category = req.query.category as string | undefined;

      const where: any = { userId };
      if (category) where.category = category;

      const [expenses, total] = await Promise.all([
        prisma.expense.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.expense.count({ where }),
      ]);

      logger.info('[Expenses] Fetched expenses', { userId, total });
      return res.json({ expenses, total, limit, offset });
    } catch (err: any) {
      logger.error('[Expenses] GET / error:', err.message);
      return res.status(500).json({ error: 'Failed to fetch expenses' });
    }
  }
);

/**
 * POST /api/expenses/extract/:emailId
 * Use AI to extract expense/receipt data from an email
 */
expensesRouter.post(
  '/extract/:emailId',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const emailId = req.params.emailId as string;

      const email = await prisma.email.findFirst({
        where: { id: emailId, userId },
      });
      if (!email) {
        return res.status(404).json({ error: 'Email not found' });
      }

      logger.info('[Expenses] Extracting expense from email', {
        emailId,
        userId,
      });
      const expense = await ExpenseExtractorService.extractExpense(emailId);

      if (!expense) {
        return res
          .status(422)
          .json({ error: 'No expense/receipt data found in this email' });
      }

      logger.info('[Expenses] Expense extracted and saved', {
        id: expense.id,
        userId,
      });
      return res.status(201).json(expense);
    } catch (err: any) {
      logger.error('[Expenses] POST /extract/:emailId error:', err.message);
      return res
        .status(500)
        .json({ error: 'Failed to extract expense', message: err.message });
    }
  }
);

/**
 * GET /api/expenses/email/:emailId
 * Fetch expenses extracted from a specific email
 */
expensesRouter.get(
  '/email/:emailId',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const emailId = req.params.emailId as string;
      const expenses = await prisma.expense.findMany({
        where: { emailId, userId },
        orderBy: { createdAt: 'asc' },
      });

      return res.json(expenses);
    } catch (err: any) {
      logger.error('[Expenses] GET /email/:emailId error:', err.message);
      return res.status(500).json({ error: 'Failed to fetch email expenses' });
    }
  }
);

/**
 * GET /api/expenses/:id
 * Get a single expense by ID
 */
expensesRouter.get(
  '/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const id = req.params.id as string;
      const expense = await prisma.expense.findUnique({ where: { id } });

      if (!expense || expense.userId !== userId) {
        return res.status(404).json({ error: 'Expense not found' });
      }

      return res.json(expense);
    } catch (err: any) {
      logger.error('[Expenses] GET /:id error:', err.message);
      return res.status(500).json({ error: 'Failed to fetch expense' });
    }
  }
);
