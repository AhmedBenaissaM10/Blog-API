import { Prisma, Role } from '@generated/prisma/client';
import { prisma } from '../../lib/prisma';
import * as errors from '../../errors/ErrorIndex';

const commentSelect = {
  id: true,
  content: true,
  postId: true,
  authorId: true,
  createdAt: true,
  updatedAt: true,
} as const;

interface ListPostCommentsInput {
  postId: string;
  page: number;
  limit: number;
}

export const getPostComments = async ({ postId, page, limit }: ListPostCommentsInput) => {
  const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
  if (!post) throw errors.notFound('Post');

  const [items, totalItems] = await prisma.$transaction([
    prisma.comment.findMany({
      where: { postId },
      select: commentSelect,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.comment.count({ where: { postId } }),
  ]);

  return {
    items,
    meta: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) },
  };
};

interface CreateCommentInput {
  postId: string;
  authorId: string;
  content: string;
}

export const createComment = async (input: CreateCommentInput) => {
  try {
    return await prisma.comment.create({ data: input, select: commentSelect });
  } catch (err) {
    // Foreign key violation: the target post doesn't exist.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
      throw errors.notFound('Post');
    }
    throw err;
  }
};

const getCommentAuthorId = async (id: string) => {
  const comment = await prisma.comment.findUnique({ where: { id }, select: { authorId: true } });
  if (!comment) throw errors.notFound('Comment');
  return comment.authorId;
};

interface UpdateCommentInput {
  id: string;
  userId: string;
  data: {
    content?: string;
  };
}

// Owner only (admins can delete, but not edit, other people's comments).
export const updateComment = async ({ id, userId, data }: UpdateCommentInput) => {
  const authorId = await getCommentAuthorId(id);
  if (authorId !== userId) {
    throw errors.forbidden('You do not have permission to modify this comment.');
  }

  try {
    return await prisma.comment.update({ where: { id }, data, select: commentSelect });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw errors.notFound('Comment');
    }
    throw err;
  }
};

interface DeleteCommentInput {
  id: string;
  userId: string;
  role: Role;
}

// Owner or ADMIN.
export const deleteComment = async ({ id, userId, role }: DeleteCommentInput) => {
  const authorId = await getCommentAuthorId(id);
  if (authorId !== userId && role !== Role.ADMIN) {
    throw errors.forbidden('You do not have permission to delete this comment.');
  }

  try {
    await prisma.comment.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw errors.notFound('Comment');
    }
    throw err;
  }
};
