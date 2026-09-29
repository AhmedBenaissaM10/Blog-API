// tests/health/ready.test.ts
import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/lib/prisma'; // adjust to your actual export

describe('GET health/ready', () => {
  it('returns 200 when the database is reachable', async () => {
    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('returns 503 when the database is unreachable', async () => {
    const spy = vi
      .spyOn(prisma, '$queryRaw')
      .mockRejectedValueOnce(new Error('connection refused'));

    const res = await request(app).get('/health/ready');

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: 'error' });

    spy.mockRestore(); // put the real $queryRaw back — don't leak this fake into other tests
  });
});
