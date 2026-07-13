import request from 'supertest';
import { app, server, prisma } from '../server';
import { AuthService } from '../services/auth.service';
import { EventBus } from '../services/event-bus.service';

describe('Calendar Routes', () => {
  afterAll(async () => {
    // Clean up server resources, db client and event bus to allow Jest to exit cleanly
    server.close();
    await prisma.$disconnect();
    await EventBus.disconnect();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/actions/calendar/events/:emailId', () => {
    it('should return 401 if unauthorized', async () => {
      await request(app)
        .get(
          '/api/actions/calendar/events/e18b8de3-568b-4b13-8fb5-3f3604f86d88'
        )
        .expect(401);
    });

    it('should return 200 and list of events for the emailId', async () => {
      const mockUserId = 'test-user-id';
      const mockEmailId = 'e18b8de3-568b-4b13-8fb5-3f3604f86d88';
      const mockEvents = [
        {
          id: 'event-1',
          userId: mockUserId,
          emailId: mockEmailId,
          title: 'Meeting 1',
          startTime: new Date('2026-07-10T15:00:00Z'),
          endTime: new Date('2026-07-10T16:00:00Z'),
          status: 'created',
        },
      ];

      const findManySpy = jest
        .spyOn(prisma.calendarEvent, 'findMany')
        .mockResolvedValue(mockEvents as any);

      const token = AuthService.generateToken(mockUserId, 'user@example.com');

      const res = await request(app)
        .get(`/api/actions/calendar/events/${mockEmailId}`)
        .set('Cookie', [`token=${token}`])
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('Meeting 1');
      expect(findManySpy).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          emailId: mockEmailId,
        },
        orderBy: { startTime: 'asc' },
      });
    });
  });
});
