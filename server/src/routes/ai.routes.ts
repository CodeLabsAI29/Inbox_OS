import { Router, Response } from 'express';
import {
  requireAuth,
  AuthenticatedRequest,
} from '../middleware/auth.middleware';
import { AIService } from '../services/ai.service';
import { logger } from '../utils/logger';
import { z } from 'zod';

export const aiRouter = Router();

const emailBodySchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
});

const replySchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
  tone: z
    .enum(['professional', 'friendly', 'concise'])
    .optional()
    .default('professional'),
});

/**
 * POST /api/ai/classify
 * Test email classification
 */
aiRouter.post(
  '/classify',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validation = emailBodySchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.error.flatten(),
        });
      }
      const { subject, body } = validation.data;
      logger.info('[AI] Classify request', { userId: req.user?.userId });
      const result = await AIService.classifyEmail(subject, body);
      return res.json(result);
    } catch (err: any) {
      logger.error('[AI] Classification error:', err.message);
      return res
        .status(500)
        .json({ error: 'Classification failed', message: err.message });
    }
  }
);

/**
 * POST /api/ai/summarize
 * Generate a summary for a thread or email body
 */
aiRouter.post(
  '/summarize',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { threadId, emailId } = req.body;
      if (!threadId && !emailId) {
        return res
          .status(400)
          .json({ error: 'threadId or emailId is required' });
      }
      logger.info('[AI] Summarize request', {
        userId: req.user?.userId,
        threadId,
        emailId,
      });
      const summary = await AIService.generateSummary(threadId || emailId);
      return res.json({ summary });
    } catch (err: any) {
      logger.error('[AI] Summarize error:', err.message);
      return res
        .status(500)
        .json({ error: 'Summarization failed', message: err.message });
    }
  }
);

/**
 * POST /api/ai/generate-reply
 * Generate an AI draft reply for an email
 */
aiRouter.post(
  '/generate-reply',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validation = replySchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.error.flatten(),
        });
      }
      const { subject, body, tone } = validation.data;
      logger.info('[AI] Generate reply request', { userId: req.user?.userId });

      const prompt = `You are a professional email assistant. Generate a ${tone} reply to the following email.\n\nSubject: ${subject}\n\nEmail:\n${body}\n\nReply:`;
      const reply = await AIService.generateReply(prompt);
      return res.json({ reply });
    } catch (err: any) {
      logger.error('[AI] Generate reply error:', err.message);
      return res
        .status(500)
        .json({ error: 'Reply generation failed', message: err.message });
    }
  }
);

/**
 * POST /api/ai/extract-actions
 * Extract action items from an email
 */
aiRouter.post(
  '/extract-actions',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validation = emailBodySchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.error.flatten(),
        });
      }
      const { subject, body } = validation.data;
      logger.info('[AI] Extract actions request', { userId: req.user?.userId });
      const actionItems = await AIService.extractActionItems(subject, body);
      return res.json({ actionItems });
    } catch (err: any) {
      logger.error('[AI] Extract actions error:', err.message);
      return res
        .status(500)
        .json({ error: 'Action extraction failed', message: err.message });
    }
  }
);
