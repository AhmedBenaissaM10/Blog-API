import { z } from 'zod';

export const idParamsSchema = z.object({
  params: z.object({ id: z.uuid('Invalid ID format') }),
});

export const paginationQuerySchema = z.object({
  page: z.coerce
    .number()
    .int('Page must be an integer')
    .min(1, 'Page must be at least 1')
    .default(1),
  limit: z.coerce
    .number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(20),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const listPostsSchema = z.object({
  query: paginationQuerySchema,
});

export const createPostSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1, 'Title is required'),
    content: z.string().trim().min(1, 'Content is required'),
  }),
});

export const updatePostSchema = z
  .object({
    body: createPostSchema.shape.body.partial(),
    params: idParamsSchema.shape.params,
  })
  .refine((data) => Object.keys(data.body).length > 0, {
    message: 'At least one field must be provided for update',
    path: ['body'],
  });
