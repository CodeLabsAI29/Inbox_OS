import { PrismaClient } from '@prisma/client';

export class FeedbackCollectorService {
  public static prisma = new PrismaClient();

  /**
   * Helper to get start of the current week (Monday) in YYYY-MM-DD format.
   */
  public static getStartOfWeek(): string {
    const now = new Date();
    const day = now.getDay();
    // Adjust to get the Monday of the current week (getDay returns 0 for Sunday)
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);

    const year = monday.getFullYear();
    const month = String(monday.getMonth() + 1).padStart(2, '0');
    const date = String(monday.getDate()).padStart(2, '0');
    return `${year}-${month}-${date}`;
  }

  /**
   * Records user feedback on email classifications and updates learned preferences.
   */
  public static async recordFeedback(
    userId: string,
    emailId: string,
    feedbackType: 'thumbs_up' | 'thumbs_down' | 'category_correction' | 'priority_adjustment',
    correctedValue?: string
  ): Promise<void> {
    // 1. Fetch email by emailId
    const email = await this.prisma.email.findUnique({
      where: { id: emailId },
    });

    // 2. If email is not found, handle gracefully (ignore, don't crash)
    if (!email) {
      console.warn(`[FeedbackCollector] Email not found for feedback (emailId: ${emailId}). Ignoring feedback.`);
      return;
    }

    // 3. Determine original value
    let originalValue = email.category || 'unclassified';

    // 4. Save feedback in the database
    await this.prisma.userFeedback.create({
      data: {
        userId,
        emailId,
        feedbackType,
        originalValue,
        correctedValue: correctedValue || null,
      },
    });

    // 5. Fetch or initialize UserSettings
    let settings = await this.prisma.userSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await this.prisma.userSettings.create({
        data: {
          userId,
          theme: 'dark',
          signature: null,
          autoReply: false,
        },
      });
    }

    // 6. Parse and update aiPreferenceProfile
    let profile: { weekly?: Record<string, any> } = {};
    if (settings.aiPreferenceProfile) {
      try {
        profile = JSON.parse(settings.aiPreferenceProfile);
      } catch (e) {
        console.error('[FeedbackCollector] Failed to parse aiPreferenceProfile JSON, reinitializing profile.', e);
      }
    }

    if (!profile.weekly) {
      profile.weekly = {};
    }

    const weekKey = this.getStartOfWeek();
    if (!profile.weekly[weekKey]) {
      profile.weekly[weekKey] = {
        categoryCorrections: {},
        preferredSenders: {},
        ignoredCategories: {},
        priorityAdjustments: {},
      };
    }

    const weekProfile = profile.weekly[weekKey];
    if (!weekProfile.categoryCorrections) weekProfile.categoryCorrections = {};
    if (!weekProfile.preferredSenders) weekProfile.preferredSenders = {};
    if (!weekProfile.ignoredCategories) weekProfile.ignoredCategories = {};
    if (!weekProfile.priorityAdjustments) weekProfile.priorityAdjustments = {};

    // Incremental update based on feedback type
    if (feedbackType === 'category_correction' && correctedValue) {
      const correctionKey = `${originalValue}->${correctedValue}`;
      weekProfile.categoryCorrections[correctionKey] = (weekProfile.categoryCorrections[correctionKey] || 0) + 1;
    } else if (feedbackType === 'thumbs_up') {
      if (email.sender) {
        weekProfile.preferredSenders[email.sender] = (weekProfile.preferredSenders[email.sender] || 0) + 1;
      }
    } else if (feedbackType === 'thumbs_down') {
      if (originalValue) {
        weekProfile.ignoredCategories[originalValue] = (weekProfile.ignoredCategories[originalValue] || 0) + 1;
      }
    } else if (feedbackType === 'priority_adjustment' && correctedValue) {
      const adjustmentKey = `${originalValue}->${correctedValue}`;
      weekProfile.priorityAdjustments[adjustmentKey] = (weekProfile.priorityAdjustments[adjustmentKey] || 0) + 1;
    }

    // 7. Save updated profile as JSON string
    await this.prisma.userSettings.update({
      where: { userId },
      data: {
        aiPreferenceProfile: JSON.stringify(profile),
      },
    });
  }
}
