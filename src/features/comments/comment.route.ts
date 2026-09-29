import { Router } from 'express';
import type { RequestHandler } from 'express';
import { validate } from '@middlewares/validate';
import { requireAuth } from '@middlewares/auth';
import * as commentController from './comment.controller';
import * as commentValidator from './comment.validator';

const router = Router();

// Public: list comments on a post
router.get(
  '/posts/:postId/comments',
  validate(commentValidator.listPostCommentsSchema) as RequestHandler,
  commentController.getPostComments as RequestHandler
);

// Authenticated: add a comment to a post
router.post(
  '/posts/:postId/comments',
  requireAuth,
  validate(commentValidator.createCommentSchema) as RequestHandler,
  commentController.createComment as RequestHandler
);

// Authenticated (owner only): update comment
router.patch(
  '/comments/:id',
  requireAuth,
  validate(commentValidator.updateCommentSchema) as RequestHandler,
  commentController.updateComment as RequestHandler
);

// Authenticated (owner or admin): delete comment
router.delete(
  '/comments/:id',
  requireAuth,
  validate(commentValidator.idParamsSchema) as RequestHandler,
  commentController.deleteComment as RequestHandler
);

export default router;
