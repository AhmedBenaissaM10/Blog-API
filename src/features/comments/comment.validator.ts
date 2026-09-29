import { z } from 'zod';
import { paginationQuerySchema } from '../posts/post.validator';

export const idParamsSchema = z.object({
  params: z.object({ id: z.uuid('Invalid ID format') }),
});

export const postIdParamsSchema = z.object({
  params: z.object({ postId: z.uuid('Invalid post ID format') }),
});

export const listPostCommentsSchema = z.object({
  params: postIdParamsSchema.shape.params,
  query: paginationQuerySchema,
});

export const createCommentSchema = z.object({
  body: z.object({
    content: z.string().trim().min(1, 'Content is required'),
  }),
  params: postIdParamsSchema.shape.params,
});

export const updateCommentSchema = z
  .object({
    body: createCommentSchema.shape.body.partial(),
    params: idParamsSchema.shape.params,
  })
  .refine((data) => Object.keys(data.body).length > 0, {
    message: 'At least one field must be provided for update',
    path: ['body'],
  });
