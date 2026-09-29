import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { Role } from '@generated/prisma/client';
import { prisma } from '@lib/prisma';
import app from '../../src/app.js';

const PASSWORD = 'Passw0rd!123';

interface TestUser {
  id: string;
  cookies: string[];
}

// Sign up through the real API, optionally promote to another role, then log in
// so the access token cookie reflects the final role.
const createUser = async (role: Role = Role.USER): Promise<TestUser> => {
  const email = `${randomUUID()}@test.com`;

  await request(app)
    .post('/api/auth/signup')
    .send({ name: 'Test User', email, password: PASSWORD })
    .expect(201);

  if (role !== Role.USER) {
    await prisma.user.update({ where: { email }, data: { role } });
  }

  const login = await request(app)
    .post('/api/auth/login')
    .send({ email, password: PASSWORD })
    .expect(200);

  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  return { id: user.id, cookies: login.headers['set-cookie'] as unknown as string[] };
};

const createPost = (
  authorId: string,
  data: Partial<{ title: string; content: string; createdAt: Date }> = {}
) =>
  prisma.post.create({
    data: {
      title: data.title ?? 'Test title',
      content: data.content ?? 'Test content',
      authorId,
      ...(data.createdAt && { createdAt: data.createdAt }),
    },
  });

describe('Post API', () => {
  beforeEach(async () => {
    await prisma.comment.deleteMany();
    await prisma.post.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/posts', () => {
    it('returns 401 when not authenticated', async () => {
      const res = await request(app).post('/api/posts').send({ title: 'T', content: 'C' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('creates a post owned by the authenticated user', async () => {
      const user = await createUser();

      const res = await request(app)
        .post('/api/posts')
        .set('Cookie', user.cookies)
        .send({ title: 'Hello', content: 'World' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        title: 'Hello',
        content: 'World',
        authorId: user.id,
      });
      expect(res.body.data.id).toEqual(expect.any(String));

      const saved = await prisma.post.findUnique({ where: { id: res.body.data.id } });
      expect(saved).not.toBeNull();
    });

    it('ignores an authorId sent in the body', async () => {
      const user = await createUser();
      const other = await createUser();

      const res = await request(app)
        .post('/api/posts')
        .set('Cookie', user.cookies)
        .send({ title: 'Hello', content: 'World', authorId: other.id });

      expect(res.status).toBe(201);
      expect(res.body.data.authorId).toBe(user.id);
    });

    it.each([
      ['missing title', { content: 'World' }],
      ['empty title', { title: '   ', content: 'World' }],
      ['missing content', { title: 'Hello' }],
      ['empty content', { title: 'Hello', content: '' }],
      ['empty body', {}],
    ])('returns 400 for %s', async (_label, body) => {
      const user = await createUser();

      const res = await request(app).post('/api/posts').set('Cookie', user.cookies).send(body);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(await prisma.post.count()).toBe(0);
    });
  });

  describe('GET /api/posts', () => {
    it('is public and returns an empty page when there are no posts', async () => {
      const res = await request(app).get('/api/posts');

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta).toEqual({ page: 1, limit: 20, totalItems: 0, totalPages: 0 });
    });

    it('returns posts newest first', async () => {
      const user = await createUser();
      await createPost(user.id, { title: 'First', createdAt: new Date('2026-01-01T00:00:00Z') });
      await createPost(user.id, { title: 'Second', createdAt: new Date('2026-01-02T00:00:00Z') });
      await createPost(user.id, { title: 'Third', createdAt: new Date('2026-01-03T00:00:00Z') });

      const res = await request(app).get('/api/posts');

      expect(res.status).toBe(200);
      expect(res.body.data.map((p: { title: string }) => p.title)).toEqual([
        'Third',
        'Second',
        'First',
      ]);
    });

    it('paginates with page and limit', async () => {
      const user = await createUser();
      await createPost(user.id, { title: 'First', createdAt: new Date('2026-01-01T00:00:00Z') });
      await createPost(user.id, { title: 'Second', createdAt: new Date('2026-01-02T00:00:00Z') });
      await createPost(user.id, { title: 'Third', createdAt: new Date('2026-01-03T00:00:00Z') });

      const page1 = await request(app).get('/api/posts?page=1&limit=2');
      const page2 = await request(app).get('/api/posts?page=2&limit=2');

      expect(page1.body.data.map((p: { title: string }) => p.title)).toEqual(['Third', 'Second']);
      expect(page2.body.data.map((p: { title: string }) => p.title)).toEqual(['First']);
      expect(page1.body.meta).toEqual({ page: 1, limit: 2, totalItems: 3, totalPages: 2 });
      expect(page2.body.meta).toEqual({ page: 2, limit: 2, totalItems: 3, totalPages: 2 });
    });

    it.each(['page=0', 'page=abc', 'limit=0', 'limit=101', 'limit=abc'])(
      'returns 400 for invalid query (%s)',
      async (query) => {
        const res = await request(app).get(`/api/posts?${query}`);

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
      }
    );
  });

  describe('GET /api/posts/:id', () => {
    it('is public and returns the post', async () => {
      const user = await createUser();
      const post = await createPost(user.id, { title: 'Hello', content: 'World' });

      const res = await request(app).get(`/api/posts/${post.id}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        id: post.id,
        title: 'Hello',
        content: 'World',
        authorId: user.id,
      });
    });

    it('returns 404 when the post does not exist', async () => {
      const res = await request(app).get(`/api/posts/${randomUUID()}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 for a malformed id', async () => {
      const res = await request(app).get('/api/posts/not-a-uuid');

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/posts/:id', () => {
    it('returns 401 when not authenticated', async () => {
      const owner = await createUser();
      const post = await createPost(owner.id);

      const res = await request(app).patch(`/api/posts/${post.id}`).send({ title: 'New' });

      expect(res.status).toBe(401);
    });

    it('lets the owner update only the provided fields', async () => {
      const owner = await createUser();
      const post = await createPost(owner.id, { title: 'Old', content: 'Keep me' });

      const res = await request(app)
        .patch(`/api/posts/${post.id}`)
        .set('Cookie', owner.cookies)
        .send({ title: 'New' });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ id: post.id, title: 'New', content: 'Keep me' });

      const saved = await prisma.post.findUniqueOrThrow({ where: { id: post.id } });
      expect(saved.title).toBe('New');
      expect(saved.content).toBe('Keep me');
    });

    it("lets an admin update someone else's post", async () => {
      const owner = await createUser();
      const admin = await createUser(Role.ADMIN);
      const post = await createPost(owner.id, { title: 'Old' });

      const res = await request(app)
        .patch(`/api/posts/${post.id}`)
        .set('Cookie', admin.cookies)
        .send({ title: 'Moderated' });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Moderated');
      expect(res.body.data.authorId).toBe(owner.id);
    });

    it('returns 403 for a user who is not the owner', async () => {
      const owner = await createUser();
      const stranger = await createUser();
      const post = await createPost(owner.id, { title: 'Old' });

      const res = await request(app)
        .patch(`/api/posts/${post.id}`)
        .set('Cookie', stranger.cookies)
        .send({ title: 'Hacked' });

      expect(res.status).toBe(403);
      const saved = await prisma.post.findUniqueOrThrow({ where: { id: post.id } });
      expect(saved.title).toBe('Old');
    });

    it('returns 404 when the post does not exist', async () => {
      const user = await createUser();

      const res = await request(app)
        .patch(`/api/posts/${randomUUID()}`)
        .set('Cookie', user.cookies)
        .send({ title: 'New' });

      expect(res.status).toBe(404);
    });

    it('returns 400 for an empty body', async () => {
      const owner = await createUser();
      const post = await createPost(owner.id);

      const res = await request(app)
        .patch(`/api/posts/${post.id}`)
        .set('Cookie', owner.cookies)
        .send({});

      expect(res.status).toBe(400);
    });

    it('returns 400 for an invalid field value', async () => {
      const owner = await createUser();
      const post = await createPost(owner.id);

      const res = await request(app)
        .patch(`/api/posts/${post.id}`)
        .set('Cookie', owner.cookies)
        .send({ title: '' });

      expect(res.status).toBe(400);
    });

    it('returns 400 for a malformed id', async () => {
      const user = await createUser();

      const res = await request(app)
        .patch('/api/posts/not-a-uuid')
        .set('Cookie', user.cookies)
        .send({ title: 'New' });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/posts/:id', () => {
    it('returns 401 when not authenticated', async () => {
      const owner = await createUser();
      const post = await createPost(owner.id);

      const res = await request(app).delete(`/api/posts/${post.id}`);

      expect(res.status).toBe(401);
      expect(await prisma.post.count()).toBe(1);
    });

    it('lets the owner delete their post', async () => {
      const owner = await createUser();
      const post = await createPost(owner.id);

      const res = await request(app).delete(`/api/posts/${post.id}`).set('Cookie', owner.cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeNull();

      const after = await request(app).get(`/api/posts/${post.id}`);
      expect(after.status).toBe(404);
    });

    it("lets an admin delete someone else's post", async () => {
      const owner = await createUser();
      const admin = await createUser(Role.ADMIN);
      const post = await createPost(owner.id);

      const res = await request(app).delete(`/api/posts/${post.id}`).set('Cookie', admin.cookies);

      expect(res.status).toBe(200);
      expect(await prisma.post.count()).toBe(0);
    });

    it('returns 403 for a user who is not the owner', async () => {
      const owner = await createUser();
      const stranger = await createUser();
      const post = await createPost(owner.id);

      const res = await request(app)
        .delete(`/api/posts/${post.id}`)
        .set('Cookie', stranger.cookies);

      expect(res.status).toBe(403);
      expect(await prisma.post.count()).toBe(1);
    });

    it('returns 404 when the post does not exist', async () => {
      const user = await createUser();

      const res = await request(app)
        .delete(`/api/posts/${randomUUID()}`)
        .set('Cookie', user.cookies);

      expect(res.status).toBe(404);
    });

    it('returns 400 for a malformed id', async () => {
      const user = await createUser();

      const res = await request(app).delete('/api/posts/not-a-uuid').set('Cookie', user.cookies);

      expect(res.status).toBe(400);
    });

    it("cascades to the post's comments", async () => {
      const owner = await createUser();
      const post = await createPost(owner.id);
      await prisma.comment.createMany({
        data: [
          { content: 'One', postId: post.id, authorId: owner.id },
          { content: 'Two', postId: post.id, authorId: owner.id },
        ],
      });

      await request(app).delete(`/api/posts/${post.id}`).set('Cookie', owner.cookies).expect(200);

      expect(await prisma.comment.count({ where: { postId: post.id } })).toBe(0);
    });
  });
});
