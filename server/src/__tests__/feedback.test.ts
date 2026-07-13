import request from 'supertest';
import { app, server, prisma } from '../server';
import { AuthService } from '../services/auth.service';
import { EventBus } from '../services/event-bus.service';
import { FeedbackCollectorService } from '../services/ai/feedback-collector.service';

describe('Feedback Collection API and Service', () => {
  afterAll(async () => {
    server.close();
    await prisma.$disconnect();
    try {
      await EventBus.disconnect();
    } catch (e) {
      // Ignore disconnect error if not connected
    }
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const mockUserId = 'user-123';
  const mockEmailId = 'e18b8de3-568b-4b13-8fb5-3f3604f86d88';
  const mockToken = AuthService.generateToken(mockUserId, 'user@example.com');

  describe('POST /api/feedback', () => {
    it('should return 401 if unauthorized', async () => {
      await request(app)
        .post('/api/feedback')
        .send({
          emailId: mockEmailId,
          feedbackType: 'thumbs_up',
        })
        .expect(401);
    });

    it('should return 400 if validation fails', async () => {
      await request(app)
        .post('/api/feedback')
        .set('Cookie', [`token=${mockToken}`])
        .send({
          emailId: '', // invalid
          feedbackType: 'invalid_type', // invalid enum
        })
        .expect(400);
    });

    it('should enforce rate limit of 100 feedbacks per day', async () => {
      jest.spyOn(prisma.userFeedback, 'count').mockResolvedValue(100);

      const res = await request(app)
        .post('/api/feedback')
        .set('Cookie', [`token=${mockToken}`])
        .send({
          emailId: mockEmailId,
          feedbackType: 'thumbs_up',
        })
        .expect(429);

      expect(res.body).toEqual({ error: 'Rate limit exceeded: 100 feedbacks per day' });
    });

    it('should successfully record feedback and return 201', async () => {
      jest.spyOn(prisma.userFeedback, 'count').mockResolvedValue(45);
      
      const recordFeedbackSpy = jest
        .spyOn(FeedbackCollectorService, 'recordFeedback')
        .mockResolvedValue(undefined);

      await request(app)
        .post('/api/feedback')
        .set('Cookie', [`token=${mockToken}`])
        .send({
          emailId: mockEmailId,
          feedbackType: 'thumbs_up',
        })
        .expect(201);

      expect(recordFeedbackSpy).toHaveBeenCalledWith(mockUserId, mockEmailId, 'thumbs_up', undefined);
    });
  });

  describe('GET /api/users/me/ai-profile', () => {
    it('should return 401 if unauthorized', async () => {
      await request(app)
        .get('/api/users/me/ai-profile')
        .expect(401);
    });

    it('should return empty weekly profile if settings do not exist', async () => {
      jest.spyOn(prisma.userSettings, 'findUnique').mockResolvedValue(null);

      const res = await request(app)
        .get('/api/users/me/ai-profile')
        .set('Cookie', [`token=${mockToken}`])
        .expect(200);

      expect(res.body).toEqual({ weekly: {} });
    });

    it('should return parsed profile settings if they exist', async () => {
      const mockProfile = {
        weekly: {
          '2026-06-29': {
            categoryCorrections: { 'newsletter->urgent': 1 },
            preferredSenders: {},
            ignoredCategories: {},
            priorityAdjustments: {},
          },
        },
      };

      jest.spyOn(prisma.userSettings, 'findUnique').mockResolvedValue({
        id: 'settings-123',
        userId: mockUserId,
        theme: 'dark',
        signature: null,
        autoReply: false,
        aiPreferenceProfile: JSON.stringify(mockProfile),
      } as any);

      const res = await request(app)
        .get('/api/users/me/ai-profile')
        .set('Cookie', [`token=${mockToken}`])
        .expect(200);

      expect(res.body).toEqual(mockProfile);
    });
  });

  describe('FeedbackCollectorService logic', () => {
    it('should handle deleted emails gracefully without crashing', async () => {
      jest.spyOn(FeedbackCollectorService.prisma.email, 'findUnique').mockResolvedValue(null);
      const userFeedbackCreateSpy = jest.spyOn(FeedbackCollectorService.prisma.userFeedback, 'create');

      await expect(
        FeedbackCollectorService.recordFeedback(mockUserId, 'non-existent-email', 'thumbs_up')
      ).resolves.not.toThrow();

      expect(userFeedbackCreateSpy).not.toHaveBeenCalled();
    });

    it('should incrementally update weekly profiles for category corrections', async () => {
      const mockEmail = {
        id: mockEmailId,
        category: 'newsletter',
        sender: 'news@example.com',
      };

      const mockSettings = {
        id: 'settings-123',
        userId: mockUserId,
        theme: 'dark',
        signature: null,
        autoReply: false,
        aiPreferenceProfile: JSON.stringify({
          weekly: {
            [FeedbackCollectorService.getStartOfWeek()]: {
              categoryCorrections: { 'newsletter->urgent': 1 },
            },
          },
        }),
      };

      jest.spyOn(FeedbackCollectorService.prisma.email, 'findUnique').mockResolvedValue(mockEmail as any);
      jest.spyOn(FeedbackCollectorService.prisma.userFeedback, 'create').mockResolvedValue({} as any);
      jest.spyOn(FeedbackCollectorService.prisma.userSettings, 'findUnique').mockResolvedValue(mockSettings as any);
      const settingsUpdateSpy = jest.spyOn(FeedbackCollectorService.prisma.userSettings, 'update').mockResolvedValue({} as any);

      await FeedbackCollectorService.recordFeedback(mockUserId, mockEmailId, 'category_correction', 'urgent');

      expect(settingsUpdateSpy).toHaveBeenCalled();
      const updatedData = JSON.parse(settingsUpdateSpy.mock.calls[0][0].data.aiPreferenceProfile as string);
      
      const weekKey = FeedbackCollectorService.getStartOfWeek();
      expect(updatedData.weekly[weekKey].categoryCorrections['newsletter->urgent']).toBe(2);
    });

    it('should incrementally update preferred senders on thumbs_up', async () => {
      const mockEmail = {
        id: mockEmailId,
        category: 'newsletter',
        sender: 'sender@example.com',
      };

      const mockSettings = {
        id: 'settings-123',
        userId: mockUserId,
        theme: 'dark',
        signature: null,
        autoReply: false,
        aiPreferenceProfile: null,
      };

      jest.spyOn(FeedbackCollectorService.prisma.email, 'findUnique').mockResolvedValue(mockEmail as any);
      jest.spyOn(FeedbackCollectorService.prisma.userFeedback, 'create').mockResolvedValue({} as any);
      jest.spyOn(FeedbackCollectorService.prisma.userSettings, 'findUnique').mockResolvedValue(mockSettings as any);
      const settingsUpdateSpy = jest.spyOn(FeedbackCollectorService.prisma.userSettings, 'update').mockResolvedValue({} as any);

      await FeedbackCollectorService.recordFeedback(mockUserId, mockEmailId, 'thumbs_up');

      expect(settingsUpdateSpy).toHaveBeenCalled();
      const updatedData = JSON.parse(settingsUpdateSpy.mock.calls[0][0].data.aiPreferenceProfile as string);
      
      const weekKey = FeedbackCollectorService.getStartOfWeek();
      expect(updatedData.weekly[weekKey].preferredSenders['sender@example.com']).toBe(1);
    });
  });
});
