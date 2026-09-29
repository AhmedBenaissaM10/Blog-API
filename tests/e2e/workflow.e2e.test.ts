import request from 'supertest';
import setCookie from 'set-cookie-parser';
import { describe, expect, it } from 'vitest';
import app from '../../src/app.js';
import { createAuthenticatedUser } from '../helpers/auth.js';
import { prisma } from '../helpers/db.js';

// The DB is cleared by clearDatabase() in the setup file, so each flow starts clean.
// Every step goes through the real HTTP API, like a client would.

const PASSWORD = 'SuperSecret123!';

// Sign up through the API and keep the session cookies for the rest of the flow.
const signup = async (name: string, email: string) => {
  const res = await request(app).post('/api/auth/signup').send({ name, email, password: PASSWORD });
  expect(res.status).toBe(201);

  const cookies = setCookie.parse(res, { map: true });
  return {
    user: res.body.data.user as { id: string; email: string; role: string },
    cookies: [
      `accessToken=${cookies.accessToken.value}`,
      `refreshToken=${cookies.refreshToken.value}`,
    ],
  };
};

describe('E2E: blog flows', () => {
  it('signup -> create post -> update post -> delete post -> logout', async () => {
    // 1. Signup
    const { user, cookies } = await signup('Alice', 'alice@example.com');

    // 2. Create a post
    const created = await request(app)
      .post('/api/posts')
      .set('Cookie', cookies)
      .send({ title: 'My first post', content: 'Hello world' });

    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      title: 'My first post',
      content: 'Hello world',
      authorId: user.id,
    });
    const postId = created.body.data.id as string;

    // The post is publicly readable, and shows up in the list
    const fetched = await request(app).get(`/api/posts/${postId}`);
    expect(fetched.status).toBe(200);
    expect(fetched.body.data.title).toBe('My first post');

    const list = await request(app).get('/api/posts');
    expect(list.body.data.map((p: { id: string }) => p.id)).toEqual([postId]);

    // 3. Update the post
    const updated = await request(app)
      .patch(`/api/posts/${postId}`)
      .set('Cookie', cookies)
      .send({ title: 'My edited post', content: 'Edited content' });

    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({
      id: postId,
      title: 'My edited post',
      content: 'Edited content',
      authorId: user.id,
    });

    const afterUpdate = await request(app).get(`/api/posts/${postId}`);
    expect(afterUpdate.body.data).toMatchObject({
      title: 'My edited post',
      content: 'Edited content',
    });

    // 4. Delete the post
    const deleted = await request(app).delete(`/api/posts/${postId}`).set('Cookie', cookies);
    expect(deleted.status).toBe(200);
    expect(deleted.body.success).toBe(true);

    const afterDelete = await request(app).get(`/api/posts/${postId}`);
    expect(afterDelete.status).toBe(404);

    const emptyList = await request(app).get('/api/posts');
    expect(emptyList.body.data).toEqual([]);

    // 5. Logout
    const logout = await request(app).post('/api/auth/logout').set('Cookie', cookies);
    expect(logout.status).toBe(200);
  });

  it('signup -> add comment to a post -> update comment -> delete comment -> logout', async () => {
    // A post written by someone else for Alice to comment on
    const author = await createAuthenticatedUser({ name: 'Bob', email: 'bob@example.com' });
    const post = await prisma.post.create({
      data: { title: "Bob's post", content: 'Please comment', authorId: author.user.id },
    });

    // 1. Signup
    const { user, cookies } = await signup('Alice', 'alice@example.com');

    // 2. Add a comment to the post
    const created = await request(app)
      .post(`/api/posts/${post.id}/comments`)
      .set('Cookie', cookies)
      .send({ content: 'Nice post!' });

    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      content: 'Nice post!',
      postId: post.id,
      authorId: user.id,
    });
    const commentId = created.body.data.id as string;

    // The comment is publicly listed under the post
    const list = await request(app).get(`/api/posts/${post.id}/comments`);
    expect(list.status).toBe(200);
    expect(list.body.data.map((c: { id: string }) => c.id)).toEqual([commentId]);
    expect(list.body.meta.totalItems).toBe(1);

    // 3. Update the comment
    const updated = await request(app)
      .patch(`/api/comments/${commentId}`)
      .set('Cookie', cookies)
      .send({ content: 'Nice post! (edited)' });

    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({
      id: commentId,
      content: 'Nice post! (edited)',
      postId: post.id,
      authorId: user.id,
    });

    const afterUpdate = await request(app).get(`/api/posts/${post.id}/comments`);
    expect(afterUpdate.body.data[0].content).toBe('Nice post! (edited)');

    // 4. Delete the comment
    const deleted = await request(app).delete(`/api/comments/${commentId}`).set('Cookie', cookies);
    expect(deleted.status).toBe(200);
    expect(deleted.body.success).toBe(true);

    const afterDelete = await request(app).get(`/api/posts/${post.id}/comments`);
    expect(afterDelete.body.data).toEqual([]);
    expect(afterDelete.body.meta.totalItems).toBe(0);

    // The post itself is untouched
    const postStillThere = await request(app).get(`/api/posts/${post.id}`);
    expect(postStillThere.status).toBe(200);

    // 5. Logout
    const logout = await request(app).post('/api/auth/logout').set('Cookie', cookies);
    expect(logout.status).toBe(200);
  });
});
