import request from 'supertest';
import { app, server, prisma } from '../server';
import { AuthService } from '../services/auth.service';
import { EventBus } from '../services/event-bus.service';

describe('GET /api/users/profile', () => {
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
      .get('/api/users/profile')
      .expect(401);
  });

  it('should return 200 and the user profile (excluding passwordHash) if authenticated and user exists', async () => {
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      createdAt: new Date(),
    };

    const findUniqueSpy = jest
      .spyOn(prisma.user, 'findUnique')
      .mockResolvedValue(mockUser as any);

    const token = AuthService.generateToken(mockUser.id, mockUser.email);

    const res = await request(app)
      .get('/api/users/profile')
      .set('Cookie', [`token=${token}`])
      .expect(200);

    expect(res.body).toEqual({
      id: mockUser.id,
      email: mockUser.email,
      createdAt: mockUser.createdAt.toISOString(),
    });
    // Ensure the passwordHash is excluded
    expect(res.body).not.toHaveProperty('passwordHash');

    expect(findUniqueSpy).toHaveBeenCalledWith({
      where: { id: mockUser.id },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });
  });

  it('should return 404 if the user is not found in database', async () => {
    const findUniqueSpy = jest
      .spyOn(prisma.user, 'findUnique')
      .mockResolvedValue(null);

    const token = AuthService.generateToken('non-existent-id', 'test@example.com');

    const res = await request(app)
      .get('/api/users/profile')
      .set('Cookie', [`token=${token}`])
      .expect(404);

    expect(res.body).toEqual({ error: 'User not found' });
    expect(findUniqueSpy).toHaveBeenCalled();
  });
});
