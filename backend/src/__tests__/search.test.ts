import request from 'supertest';
import { app, server, prisma } from '../server';
import { AuthService } from '../services/auth.service';
import { EventBus } from '../services/event-bus.service';

describe('GET /api/emails/search', () => {
  afterAll(async () => {
    // Clean up server resources, db client and event bus to allow Jest to exit cleanly
    server.close();
    await prisma.$disconnect();
    await EventBus.disconnect();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return 401 if no token is provided', async () => {
    await request(app)
      .get('/api/emails/search?q=test')
      .expect(401);
  });

  it('should return 400 if search query q is missing', async () => {
    const token = AuthService.generateToken('test-user-id', 'test@example.com');

    const res = await request(app)
      .get('/api/emails/search')
      .set('Cookie', [`token=${token}`])
      .expect(400);

    expect(res.body).toEqual({
      error: 'Query parameter "q" is required and cannot be empty',
    });
  });

  it('should return 400 if search query q is empty spaces', async () => {
    const token = AuthService.generateToken('test-user-id', 'test@example.com');

    const res = await request(app)
      .get('/api/emails/search?q=%20%20')
      .set('Cookie', [`token=${token}`])
      .expect(400);

    expect(res.body).toEqual({
      error: 'Query parameter "q" is required and cannot be empty',
    });
  });

  it('should return 200 and paginated list of matching emails with default parameters (limit=20, offset=0)', async () => {
    const userId = 'test-user-id';
    const token = AuthService.generateToken(userId, 'test@example.com');

    const mockEmails = [
      {
        id: 'email-1',
        messageId: 'msg-1',
        sender: 'sender@example.com',
        recipient: 'test@example.com',
        subject: 'Welcome to InboxOS',
        body: 'This is a test email body.',
        status: 'UNREAD',
        userId,
        threadId: 'thread-1',
        createdAt: new Date(),
      },
    ];

    const countSpy = jest.spyOn(prisma.email, 'count').mockResolvedValue(1);
    const findManySpy = jest.spyOn(prisma.email, 'findMany').mockResolvedValue(mockEmails as any);

    const res = await request(app)
      .get('/api/emails/search?q=welcome')
      .set('Cookie', [`token=${token}`])
      .expect(200);

    expect(res.body.emails).toHaveLength(1);
    expect(res.body.emails[0].id).toBe('email-1');
    expect(res.body.pagination).toEqual({
      total: 1,
      limit: 20,
      offset: 0,
    });

    expect(countSpy).toHaveBeenCalledWith({
      where: {
        userId,
        OR: [
          { subject: { contains: 'welcome' } },
          { body: { contains: 'welcome' } },
        ],
      },
    });

    expect(findManySpy).toHaveBeenCalledWith({
      where: {
        userId,
        OR: [
          { subject: { contains: 'welcome' } },
          { body: { contains: 'welcome' } },
        ],
      },
      take: 20,
      skip: 0,
      orderBy: { createdAt: 'desc' },
    });
  });

  it('should apply custom limit and offset and cap limit at 20', async () => {
    const userId = 'test-user-id';
    const token = AuthService.generateToken(userId, 'test@example.com');

    const countSpy = jest.spyOn(prisma.email, 'count').mockResolvedValue(50);
    const findManySpy = jest.spyOn(prisma.email, 'findMany').mockResolvedValue([]);

    const res = await request(app)
      .get('/api/emails/search?q=test&limit=30&offset=5')
      .set('Cookie', [`token=${token}`])
      .expect(200);

    expect(res.body.pagination).toEqual({
      total: 50,
      limit: 20, // capped at 20
      offset: 5,
    });

    expect(findManySpy).toHaveBeenCalledWith({
      where: {
        userId,
        OR: [
          { subject: { contains: 'test' } },
          { body: { contains: 'test' } },
        ],
      },
      take: 20, // capped
      skip: 5,
      orderBy: { createdAt: 'desc' },
    });
  });

  it('should default to limit=20 and offset=0 if invalid values are passed', async () => {
    const userId = 'test-user-id';
    const token = AuthService.generateToken(userId, 'test@example.com');

    const countSpy = jest.spyOn(prisma.email, 'count').mockResolvedValue(10);
    const findManySpy = jest.spyOn(prisma.email, 'findMany').mockResolvedValue([]);

    const res = await request(app)
      .get('/api/emails/search?q=test&limit=-10&offset=invalid')
      .set('Cookie', [`token=${token}`])
      .expect(200);

    expect(res.body.pagination).toEqual({
      total: 10,
      limit: 20,
      offset: 0,
    });
  });
});
