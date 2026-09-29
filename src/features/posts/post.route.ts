import { Router } from 'express';
import type { RequestHandler } from 'express';
import { validate } from '../../middlewares/validate';
import { requireAuth } from '../../middlewares/auth';
import * as postController from './post.controller';
import * as postValidator from './post.validator';

const router = Router();

// Public: list posts
router.get(
  '/',
  validate(postValidator.listPostsSchema),
  postController.getPosts as RequestHandler
);

// Authenticated: create post
router.post(
  '/',
  requireAuth,
  validate(postValidator.createPostSchema),
  postController.createPost as RequestHandler
);

// Public: get post by ID
router.get(
  '/:id',
  validate(postValidator.idParamsSchema),
  postController.getPost as RequestHandler
);

// Authenticated (owner or admin): update post
router.patch(
  '/:id',
  requireAuth,
  validate(postValidator.updatePostSchema),
  postController.updatePost as RequestHandler
);

// Authenticated (owner or admin): delete post
router.delete(
  '/:id',
  requireAuth,
  validate(postValidator.idParamsSchema),
  postController.deletePost as RequestHandler
);

export default router;
