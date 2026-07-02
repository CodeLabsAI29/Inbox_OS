import request from 'supertest';
import { app, server, prisma } from '../server';
import { EventBus } from '../services/event-bus.service';

describe('GET /api/health', () => {
  afterAll(async () => {
    // Clean up server resources, db client and event bus to allow Jest to exit cleanly
    server.close();
    await prisma.$disconnect();
    await EventBus.disconnect();
  });

  it('should return 200 OK and status ok with timestamp', async () => {
    const res = await request(app)
      .get('/api/health')
      .expect(200);

    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('timestamp');
    
    // Validate that timestamp is a valid ISO date string
    const date = new Date(res.body.timestamp);
    expect(date.getTime()).not.toBeNaN();
  });
});
