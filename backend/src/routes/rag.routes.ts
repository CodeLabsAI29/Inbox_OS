import { Router, Response } from 'express';
import {
  requireAuth,
  AuthenticatedRequest,
} from '../middleware/auth.middleware';
import { AIService } from '../services/ai.service';
import { indexEmailsQueue } from '../jobs/index-emails.job';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const ragRouter = Router();

/**
 * POST /api/rag/index
 * Trigger embedding for a specific email, or trigger background job for all unindexed emails.
 */
ragRouter.post(
  '/api/rag/index',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { emailId } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return res
          .status(401)
          .json({ error: 'Unauthorized: Missing user info' });
      }

      if (emailId) {
        // Find the email and ensure it belongs to the authenticated user
        const email = await prisma.email.findFirst({
          where: { id: emailId, userId },
        });

        if (!email) {
          return res
            .status(404)
            .json({ error: 'Email not found or access denied' });
        }

        if (!email.body || !email.body.trim()) {
          return res
            .status(400)
            .json({ error: 'Cannot index email with empty body' });
        }

        await AIService.embedEmail(emailId);
        return res
          .status(200)
          .json({ success: true, message: 'Email indexed successfully' });
      } else {
        // Trigger background BullMQ job to index all unindexed emails for the user
        await indexEmailsQueue.add('indexEmails', { userId });
        return res
          .status(202)
          .json({ success: true, message: 'Batch indexing job queued' });
      }
    } catch (error: any) {
      console.error('[RAG Router] Indexing failed:', error);
      return res.status(500).json({
        error: error.message || 'Internal server error during indexing',
      });
    }
  }
);

/**
 * POST /api/rag/search
 * Semantic similarity search over the user's emails.
 */
ragRouter.post(
  '/api/rag/search',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { query, limit } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return res
          .status(401)
          .json({ error: 'Unauthorized: Missing user info' });
      }

      if (!query || typeof query !== 'string' || !query.trim()) {
        return res.status(400).json({ error: 'Missing search query' });
      }

      const searchLimit = typeof limit === 'number' && limit > 0 ? limit : 5;

      const results = await AIService.searchSimilarEmails(
        query,
        searchLimit,
        userId
      );
      return res.status(200).json(results);
    } catch (error: any) {
      console.error('[RAG Router] Search failed:', error);
      return res.status(500).json({
        error: error.message || 'Internal server error during semantic search',
      });
    }
  }
);
