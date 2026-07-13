import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export class FeedbackCollectorService {
  /**
   * Record AI feedback from the user (thumbs up/down).
   * Logs it for future AI model fine-tuning.
   */
  public static async record(params: {
    userId: string;
    feedbackType: 'thumbs_up' | 'thumbs_down';
    feature?: string;
    emailId?: string;
    comment?: string;
  }): Promise<{ id: string }> {
    const { userId, feedbackType, feature, emailId, comment } = params;

    const feedback = await prisma.userFeedback.create({
      data: { userId, feedbackType, feature, emailId, comment },
    });

    // Log for potential AI training data collection
    logger.info('[FeedbackCollector] Feedback recorded', {
      id: feedback.id,
      userId,
      feedbackType,
      feature,
    });

    return { id: feedback.id };
  }

  /**
   * Get aggregated feedback statistics for a user.
   */
  public static async getStats(userId: string): Promise<{
    total: number;
    thumbsUp: number;
    thumbsDown: number;
    byFeature: Record<string, { thumbsUp: number; thumbsDown: number }>;
  }> {
    const feedbacks = await prisma.userFeedback.findMany({
      where: { userId },
      select: { feedbackType: true, feature: true },
    });

    const stats = {
      total: feedbacks.length,
      thumbsUp: 0,
      thumbsDown: 0,
      byFeature: {} as Record<string, { thumbsUp: number; thumbsDown: number }>,
    };

    for (const fb of feedbacks) {
      if (fb.feedbackType === 'thumbs_up') {
        stats.thumbsUp++;
      } else {
        stats.thumbsDown++;
      }

      if (fb.feature) {
        if (!stats.byFeature[fb.feature]) {
          stats.byFeature[fb.feature] = { thumbsUp: 0, thumbsDown: 0 };
        }
        if (fb.feedbackType === 'thumbs_up') {
          stats.byFeature[fb.feature].thumbsUp++;
        } else {
          stats.byFeature[fb.feature].thumbsDown++;
        }
      }
    }

    return stats;
  }
}
