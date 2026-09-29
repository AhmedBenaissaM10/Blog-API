import type { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import logger from '../../utils/logger';
import { sendSuccess } from '../../utils/response';
import * as postService from './post.service';
import type { PaginationQuery } from './post.validator';

export const getPosts = catchAsync(async (req: Request, res: Response) => {
  // `validate` has already coerced/defaulted the query; Express just types it loosely.
  const { page, limit } = req.query as unknown as PaginationQuery;
  const { items, meta } = await postService.getPosts({ page, limit });
  sendSuccess(res, { data: items, meta, message: 'Posts retrieved successfully' });
});

export const getPost = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const post = await postService.getPost(id);
  sendSuccess(res, { data: post, message: 'Post retrieved successfully' });
});

export const createPost = catchAsync(async (req: Request, res: Response) => {
  const post = await postService.createPost({ ...req.body, authorId: req.user!.id });
  logger.info(`Post ${post.id} created successfully.`);
  sendSuccess(res, { data: post, statusCode: 201, message: 'Post created successfully' });
});

export const updatePost = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const post = await postService.updatePost({
    id,
    userId: req.user!.id,
    role: req.user!.role,
    data: req.body,
  });
  logger.info(`Post ${post.id} updated successfully.`);
  sendSuccess(res, { data: post, message: 'Post updated successfully' });
});

export const deletePost = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  await postService.deletePost({ id, userId: req.user!.id, role: req.user!.role });
  logger.info(`Post ${id} deleted successfully.`);
  sendSuccess(res, { data: null, message: 'Post deleted successfully' });
});
