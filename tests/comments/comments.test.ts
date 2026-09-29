import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../../src/app.js';
import { createAuthenticatedAdmin, createAuthenticatedUser } from '../helpers/auth.js';
import { prisma } from '../helpers/db.js';

// The DB is cleared by clearDatabase() in the setup file, so no cleanup is needed here.

const authCookie = (accessToken: string) => [`accessToken=${accessToken}`];

const createUser = (name: string) =>
  createAuthenticatedUser({ name, email: `${name.toLowerCase()}@example.com` });

const createPost = (authorId: string) =>
  prisma.post.create({ data: { title: 'Test title', content: 'Test content', authorId } });

const createComment = (
  postId: string,
  authorId: string,
  data: Partial<{ content: string; createdAt: Date }> = {}
) =>
  prisma.comment.create({
    data: {
      content: data.content ?? 'Test comment',
      postId,
      authorId,
      ...(data.createdAt && { createdAt: data.createdAt }),
    },
  });

const contents = (comments: { content: string }[]) => comments.map((c) => c.content);

describe('Comment API', () => {
  describe('GET /api/posts/:postId/comments', () => {
    it('is public and returns an empty page when the post has no comments', async () => {
      const { user } = await createUser('Alice');
      const post = await createPost(user.id);

      const res = await request(app).get(`/api/posts/${post.id}/comments`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta).toEqual({ page: 1, limit: 20, totalItems: 0, totalPages: 0 });
    });

    it('returns comments oldest first', async () => {
      const { user } = await createUser('Alice');
      const post = await createPost(user.id);
      await createComment(post.id, user.id, {
        content: 'Second',
        createdAt: new Date('2026-01-02T00:00:00Z'),
      });
      await createComment(post.id, user.id, {
        content: 'Third',
        createdAt: new Date('2026-01-03T00:00:00Z'),
      });
      await createComment(post.id, user.id, {
        content: 'First',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      });

      const res = await request(app).get(`/api/posts/${post.id}/comments`);

      expect(res.status).toBe(200);
      expect(contents(res.body.data)).toEqual(['First', 'Second', 'Third']);
      expect(res.body.data[0]).toMatchObject({ postId: post.id, authorId: user.id });
    });

    it('only returns comments that belong to the requested post', async () => {
      const { user } = await createUser('Alice');
      const post = await createPost(user.id);
      const otherPost = await createPost(user.id);
      await createComment(post.id, user.id, { content: 'Mine' });
      await createComment(otherPost.id, user.id, { content: 'Not mine' });

      const res = await request(app).get(`/api/posts/${post.id}/comments`);

      expect(contents(res.body.data)).toEqual(['Mine']);
      expect(res.body.meta.totalItems).toBe(1);
    });

    it('paginates with page and limit', async () => {
      const { user } = await createUser('Alice');
      const post = await createPost(user.id);
      await createComment(post.id, user.id, {
        content: 'First',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      });
      await createComment(post.id, user.id, {
        content: 'Second',
        createdAt: new Date('2026-01-02T00:00:00Z'),
      });
      await createComment(post.id, user.id, {
        content: 'Third',
        createdAt: new Date('2026-01-03T00:00:00Z'),
      });

      const page1 = await request(app).get(`/api/posts/${post.id}/comments?page=1&limit=2`);
      const page2 = await request(app).get(`/api/posts/${post.id}/comments?page=2&limit=2`);

      expect(contents(page1.body.data)).toEqual(['First', 'Second']);
      expect(contents(page2.body.data)).toEqual(['Third']);
      expect(page1.body.meta).toEqual({ page: 1, limit: 2, totalItems: 3, totalPages: 2 });
      expect(page2.body.meta).toEqual({ page: 2, limit: 2, totalItems: 3, totalPages: 2 });
    });

    it('returns 404 when the post does not exist', async () => {
      const res = await request(app).get(`/api/posts/${randomUUID()}/comments`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 for a malformed post id', async () => {
      const res = await request(app).get('/api/posts/not-a-uuid/comments');

      expect(res.status).toBe(400);
    });

    it.each(['page=0', 'page=abc', 'limit=0', 'limit=101', 'limit=abc'])(
      'returns 400 for invalid query (%s)',
      async (query) => {
        const { user } = await createUser('Alice');
        const post = await createPost(user.id);

        const res = await request(app).get(`/api/posts/${post.id}/comments?${query}`);

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
      }
    );
  });

  describe('POST /api/posts/:postId/comments', () => {
    it('returns 401 when not authenticated', async () => {
      const { user } = await createUser('Alice');
      const post = await createPost(user.id);

      const res = await request(app)
        .post(`/api/posts/${post.id}/comments`)
        .send({ content: 'Hello' });

      expect(res.status).toBe(401);
      expect(await prisma.comment.count()).toBe(0);
    });

    it('creates a comment on the post, owned by the authenticated user', async () => {
      const alice = await createUser('Alice');
      const bob = await createUser('Bob');
      const post = await createPost(alice.user.id);

      const res = await request(app)
        .post(`/api/posts/${post.id}/comments`)
        .set('Cookie', authCookie(bob.accessToken))
        .send({ content: 'Nice post!' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        content: 'Nice post!',
        postId: post.id,
        authorId: bob.user.id,
      });
      expect(res.body.data.id).toEqual(expect.any(String));

      const saved = await prisma.comment.findUnique({ where: { id: res.body.data.id } });
      expect(saved).not.toBeNull();
    });

    it('ignores authorId and postId sent in the body', async () => {
      const alice = await createUser('Alice');
      const bob = await createUser('Bob');
      const post = await createPost(alice.user.id);
      const otherPost = await createPost(alice.user.id);

      const res = await request(app)
        .post(`/api/posts/${post.id}/comments`)
        .set('Cookie', authCookie(bob.accessToken))
        .send({ content: 'Hello', authorId: alice.user.id, postId: otherPost.id });

      expect(res.status).toBe(201);
      expect(res.body.data.authorId).toBe(bob.user.id);
      expect(res.body.data.postId).toBe(post.id);
    });

    it.each([
      ['missing content', {}],
      ['empty content', { content: '' }],
      ['whitespace-only content', { content: '   ' }],
    ])('returns 400 for %s', async (_label, body) => {
      const { user, accessToken } = await createUser('Alice');
      const post = await createPost(user.id);

      const res = await request(app)
        .post(`/api/posts/${post.id}/comments`)
        .set('Cookie', authCookie(accessToken))
        .send(body);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(await prisma.comment.count()).toBe(0);
    });

    it('returns 404 when the post does not exist', async () => {
      const { accessToken } = await createUser('Alice');

      const res = await request(app)
        .post(`/api/posts/${randomUUID()}/comments`)
        .set('Cookie', authCookie(accessToken))
        .send({ content: 'Hello' });

      expect(res.status).toBe(404);
      expect(await prisma.comment.count()).toBe(0);
    });

    it('returns 400 for a malformed post id', async () => {
      const { accessToken } = await createUser('Alice');

      const res = await request(app)
        .post('/api/posts/not-a-uuid/comments')
        .set('Cookie', authCookie(accessToken))
        .send({ content: 'Hello' });

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/comments/:id', () => {
    it('returns 401 when not authenticated', async () => {
      const { user } = await createUser('Alice');
      const post = await createPost(user.id);
      const comment = await createComment(post.id, user.id);

      const res = await request(app).patch(`/api/comments/${comment.id}`).send({ content: 'New' });

      expect(res.status).toBe(401);
    });

    it('lets the owner update their comment', async () => {
      const { user, accessToken } = await createUser('Alice');
      const post = await createPost(user.id);
      const comment = await createComment(post.id, user.id, { content: 'Old' });

      const res = await request(app)
        .patch(`/api/comments/${comment.id}`)
        .set('Cookie', authCookie(accessToken))
        .send({ content: 'New' });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        id: comment.id,
        content: 'New',
        postId: post.id,
        authorId: user.id,
      });

      const saved = await prisma.comment.findUniqueOrThrow({ where: { id: comment.id } });
      expect(saved.content).toBe('New');
    });

    it('returns 403 for a user who is not the owner', async () => {
      const alice = await createUser('Alice');
      const bob = await createUser('Bob');
      const post = await createPost(alice.user.id);
      const comment = await createComment(post.id, alice.user.id, { content: 'Old' });

      const res = await request(app)
        .patch(`/api/comments/${comment.id}`)
        .set('Cookie', authCookie(bob.accessToken))
        .send({ content: 'Hacked' });

      expect(res.status).toBe(403);
      const saved = await prisma.comment.findUniqueOrThrow({ where: { id: comment.id } });
      expect(saved.content).toBe('Old');
    });

    it("returns 403 for an admin editing someone else's comment (owner only)", async () => {
      const { user } = await createUser('Alice');
      const admin = await createAuthenticatedAdmin();
      const post = await createPost(user.id);
      const comment = await createComment(post.id, user.id, { content: 'Old' });

      const res = await request(app)
        .patch(`/api/comments/${comment.id}`)
        .set('Cookie', authCookie(admin.accessToken))
        .send({ content: 'Edited by admin' });

      expect(res.status).toBe(403);
      const saved = await prisma.comment.findUniqueOrThrow({ where: { id: comment.id } });
      expect(saved.content).toBe('Old');
    });

    it('returns 404 when the comment does not exist', async () => {
      const { accessToken } = await createUser('Alice');

      const res = await request(app)
        .patch(`/api/comments/${randomUUID()}`)
        .set('Cookie', authCookie(accessToken))
        .send({ content: 'New' });

      expect(res.status).toBe(404);
    });

    it.each([
      ['an empty body', {}],
      ['empty content', { content: '' }],
    ])('returns 400 for %s', async (_label, body) => {
      const { user, accessToken } = await createUser('Alice');
      const post = await createPost(user.id);
      const comment = await createComment(post.id, user.id);

      const res = await request(app)
        .patch(`/api/comments/${comment.id}`)
        .set('Cookie', authCookie(accessToken))
        .send(body);

      expect(res.status).toBe(400);
    });

    it('returns 400 for a malformed id', async () => {
      const { accessToken } = await createUser('Alice');

      const res = await request(app)
        .patch('/api/comments/not-a-uuid')
        .set('Cookie', authCookie(accessToken))
        .send({ content: 'New' });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/comments/:id', () => {
    it('returns 401 when not authenticated', async () => {
      const { user } = await createUser('Alice');
      const post = await createPost(user.id);
      const comment = await createComment(post.id, user.id);

      const res = await request(app).delete(`/api/comments/${comment.id}`);

      expect(res.status).toBe(401);
      expect(await prisma.comment.count()).toBe(1);
    });

    it('lets the owner delete their comment', async () => {
      const { user, accessToken } = await createUser('Alice');
      const post = await createPost(user.id);
      const comment = await createComment(post.id, user.id);

      const res = await request(app)
        .delete(`/api/comments/${comment.id}`)
        .set('Cookie', authCookie(accessToken));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeNull();
      expect(await prisma.comment.count()).toBe(0);
    });

    it("lets an admin delete someone else's comment", async () => {
      const { user } = await createUser('Alice');
      const admin = await createAuthenticatedAdmin();
      const post = await createPost(user.id);
      const comment = await createComment(post.id, user.id);

      const res = await request(app)
        .delete(`/api/comments/${comment.id}`)
        .set('Cookie', authCookie(admin.accessToken));

      expect(res.status).toBe(200);
      expect(await prisma.comment.count()).toBe(0);
    });

    it('returns 403 for a user who is not the owner', async () => {
      const alice = await createUser('Alice');
      const bob = await createUser('Bob');
      const post = await createPost(alice.user.id);
      const comment = await createComment(post.id, alice.user.id);

      const res = await request(app)
        .delete(`/api/comments/${comment.id}`)
        .set('Cookie', authCookie(bob.accessToken));

      expect(res.status).toBe(403);
      expect(await prisma.comment.count()).toBe(1);
    });

    it("returns 403 when the post owner deletes another user's comment", async () => {
      const alice = await createUser('Alice');
      const bob = await createUser('Bob');
      const post = await createPost(alice.user.id);
      const comment = await createComment(post.id, bob.user.id);

      const res = await request(app)
        .delete(`/api/comments/${comment.id}`)
        .set('Cookie', authCookie(alice.accessToken));

      expect(res.status).toBe(403);
      expect(await prisma.comment.count()).toBe(1);
    });

    it('returns 404 when the comment does not exist', async () => {
      const { accessToken } = await createUser('Alice');

      const res = await request(app)
        .delete(`/api/comments/${randomUUID()}`)
        .set('Cookie', authCookie(accessToken));

      expect(res.status).toBe(404);
    });

    it('returns 400 for a malformed id', async () => {
      const { accessToken } = await createUser('Alice');

      const res = await request(app)
        .delete('/api/comments/not-a-uuid')
        .set('Cookie', authCookie(accessToken));

      expect(res.status).toBe(400);
    });
  });
});
