// tests/admin/admin.test.ts
import bcrypt from 'bcrypt';
import request from 'supertest';
import app from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { createAuthenticatedAdmin } from '../helpers/auth.js';

describe('GET /api/admin/users — role-based access', () => {
  it('allows access for an ADMIN user', async () => {
    const { accessToken } = await createAuthenticatedAdmin();

    const response = await request(app)
      .get('/api/admin/users')
      .set('Cookie', `accessToken=${accessToken}`);

    expect(response.status).toBe(200);
  });
});

describe('POST /api/admin/users — create user', () => {
  it('creates a new user and never returns the password field', async () => {
    const { accessToken } = await createAuthenticatedAdmin();

    const response = await request(app)
      .post('/api/admin/users')
      .set('Cookie', `accessToken=${accessToken}`)
      .send({
        name: 'New Guy',
        email: 'new.guy@example.com',
        password: 'StrongPass123!',
        role: 'USER',
      });

    expect(response.status).toBe(201);
    expect(response.body.data.email).toBe('new.guy@example.com');
    expect(response.body.data.password).toBeUndefined();

    const inDb = await prisma.user.findUnique({ where: { email: 'new.guy@example.com' } });
    expect(inDb).not.toBeNull();
    expect(inDb?.password).not.toBe('StrongPass123!'); // must be hashed, not stored raw
  });

  it('returns 400 when the email is already in use', async () => {
    const { accessToken } = await createAuthenticatedAdmin();

    await prisma.user.create({
      data: {
        name: 'Existing',
        email: 'taken@example.com',
        password: await bcrypt.hash('whatever', 10),
        role: 'USER',
      },
    });

    const response = await request(app)
      .post('/api/admin/users')
      .set('Cookie', `accessToken=${accessToken}`)
      .send({
        name: 'Duplicate',
        email: 'taken@example.com',
        password: 'AnotherPass123!',
        role: 'USER',
      });

    expect(response.status).toBe(400);
  });
});

describe('GET /api/admin/users/:id — get single user', () => {
  it("returns a user's details by id", async () => {
    const { accessToken } = await createAuthenticatedAdmin();

    const target = await prisma.user.create({
      data: {
        name: 'Target User',
        email: 'target@example.com',
        password: await bcrypt.hash('whatever', 10),
        role: 'USER',
      },
    });
    const response = await request(app)
      .get(`/api/admin/users/${target.id}`)
      .set('Cookie', `accessToken=${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(target.id);
    expect(response.body.data.password).toBeUndefined();
  });

  it('returns 404 for a non-existent user id', async () => {
    const { accessToken } = await createAuthenticatedAdmin();

    const response = await request(app)
      .get('/api/admin/users/8c3fdd33-e413-4c2c-9fa3-2332fe2cb6b0')
      .set('Cookie', `accessToken=${accessToken}`);

    expect(response.status).toBe(404);
  });
});

describe('PATCH /api/admin/users/:id — update user', () => {
  it("updates a user's role", async () => {
    const { accessToken } = await createAuthenticatedAdmin();

    const target = await prisma.user.create({
      data: {
        name: 'Promote Me',
        email: 'promote@example.com',
        password: await bcrypt.hash('whatever', 10),
        role: 'USER',
      },
    });

    const response = await request(app)
      .patch(`/api/admin/users/${target.id}`)
      .set('Cookie', `accessToken=${accessToken}`)
      .send({ role: 'ADMIN' });

    expect(response.status).toBe(200);
    expect(response.body.data.role).toBe('ADMIN');

    const inDb = await prisma.user.findUnique({ where: { id: target.id } });
    expect(inDb?.role).toBe('ADMIN');
  });

  it('returns 404 when updating a non-existent user', async () => {
    const { accessToken } = await createAuthenticatedAdmin();

    const response = await request(app)
      .patch('/api/admin/users/8c3fdd33-e413-4c2c-9fa3-2332fe2cb6b0')
      .set('Cookie', `accessToken=${accessToken}`)
      .send({ role: 'ADMIN' });

    expect(response.status).toBe(404);
  });
});

describe('DELETE /api/admin/users/:id — delete user', () => {
  it('deletes the user and removes it from the database', async () => {
    const { accessToken } = await createAuthenticatedAdmin();

    const target = await prisma.user.create({
      data: {
        name: 'Delete Me',
        email: 'delete.me@example.com',
        password: await bcrypt.hash('whatever', 10),
        role: 'USER',
      },
    });

    const response = await request(app)
      .delete(`/api/admin/users/${target.id}`)
      .set('Cookie', `accessToken=${accessToken}`);

    expect(response.status).toBe(200);
    const inDb = await prisma.user.findUnique({ where: { id: target.id } });
    expect(inDb).toBeNull();
  });

  it('returns 404 when deleting a non-existent user', async () => {
    const { accessToken } = await createAuthenticatedAdmin();

    const response = await request(app)
      .delete('/api/admin/users/8c3fdd33-e413-4c2c-9fa3-2332fe2cb6b0')
      .set('Cookie', `accessToken=${accessToken}`);
    expect(response.status).toBe(404);
  });
});
