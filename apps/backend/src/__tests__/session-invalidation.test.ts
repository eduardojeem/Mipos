import request from 'supertest';
import app, { prisma } from '../../src/index';

describe('Session invalidation endpoints', () => {
  let userId: string;
  let sessionId: string;

  beforeAll(async () => {
    (process.env as any).NODE_ENV = 'development';
    (process.env as any).MOCK_AUTH = 'true';
    const user = await prisma.user.create({
      data: {
        email: `test-user-${Date.now()}@example.com`,
        fullName: 'Test User',
        role: 'ADMIN',
      }
    });
    userId = user.id;

    const session = await prisma.userSession.create({
      data: {
        userId,
        supabaseSessionId: `sup-${Date.now()}`,
        isActive: true,
      }
    });
    sessionId = session.id;
  });

  afterAll(async () => {
    try { await prisma.userSession.delete({ where: { id: sessionId } }); } catch {}
    try { await prisma.user.delete({ where: { id: userId } }); } catch {}
  });

  test('Invalidate all sessions for a user', async () => {
    const res = await request(app)
      .post(`/api/sessions/invalidate/user/${userId}`)
      .set('Content-Type', 'application/json')
      .send({});

    expect(res.status).toBe(200);
    const updated = await prisma.userSession.findUnique({ where: { id: sessionId } });
    expect(updated?.isActive).toBe(false);
  });

  test('Invalidate a single session by id', async () => {
    // Recreate session active
    const session = await prisma.userSession.create({
      data: { userId, supabaseSessionId: `sup-${Date.now()}`, isActive: true }
    });

    const res = await request(app)
      .post('/api/sessions/invalidate/session')
      .set('Content-Type', 'application/json')
      .send({ sessionId: session.id });

    expect(res.status).toBe(200);
    const updated = await prisma.userSession.findUnique({ where: { id: session.id } });
    expect(updated?.isActive).toBe(false);
  });
});