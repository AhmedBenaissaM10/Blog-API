import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export type PaginationQuery = z.infer<typeof paginationSchema>;

export interface PaginationParams {
  skip: number;
  take: number;
  page: number;
  limit: number;
}

export const getPagination = (query: PaginationQuery): PaginationParams => {
  const { page, limit } = query;
  const skip = (page - 1) * limit;

  return { skip, take: limit, page, limit };
};

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const getPaginationMeta = (total: number, page: number, limit: number): PaginationMeta => {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
};
