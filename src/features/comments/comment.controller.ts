import type { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import logger from '../../utils/logger';
import { sendSuccess } from '../../utils/response';
import * as commentService from './comment.service';
import type { PaginationQuery } from '../posts/post.validator';

export const getPostComments = catchAsync(async (req: Request, res: Response) => {
  const { postId } = req.params as { postId: string };
  // `validate` has already coerced/defaulted the query; Express just types it loosely.
  const { page, limit } = req.query as unknown as PaginationQuery;
  const { items, meta } = await commentService.getPostComments({ postId, page, limit });
  sendSuccess(res, { data: items, meta, message: 'Comments retrieved successfully' });
});

export const createComment = catchAsync(async (req: Request, res: Response) => {
  const { postId } = req.params;
  const comment = await commentService.createComment({
    ...req.body,
    postId,
    authorId: req.user!.id,
  });
  logger.info(`Comment ${comment.id} created on post ${postId}.`);
  sendSuccess(res, { data: comment, statusCode: 201, message: 'Comment created successfully' });
});

export const updateComment = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const comment = await commentService.updateComment({
    id,
    userId: req.user!.id,
    data: req.body,
  });
  logger.info(`Comment ${comment.id} updated successfully.`);
  sendSuccess(res, { data: comment, message: 'Comment updated successfully' });
});

export const deleteComment = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  await commentService.deleteComment({ id, userId: req.user!.id, role: req.user!.role });
  logger.info(`Comment ${id} deleted successfully.`);
  sendSuccess(res, { data: null, message: 'Comment deleted successfully' });
});
