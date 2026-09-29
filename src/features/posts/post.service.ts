import { Prisma, Role } from '@generated/prisma/client';
import { prisma } from '../../lib/prisma';
import * as errors from '../../errors/ErrorIndex';

const postSelect = {
  id: true,
  title: true,
  content: true,
  authorId: true,
  createdAt: true,
  updatedAt: true,
} as const;

interface ListPostsInput {
  page: number;
  limit: number;
}

export const getPosts = async ({ page, limit }: ListPostsInput) => {
  const [items, totalItems] = await prisma.$transaction([
    prisma.post.findMany({
      select: postSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.post.count(),
  ]);

  return {
    items,
    meta: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) },
  };
};

export const getPost = async (id: string) => {
  const post = await prisma.post.findUnique({ where: { id }, select: postSelect });
  if (!post) throw errors.notFound('Post');
  return post;
};

interface CreatePostInput {
  title: string;
  content: string;
  authorId: string;
}

export const createPost = async (input: CreatePostInput) => {
  return await prisma.post.create({ data: input, select: postSelect });
};

interface ModifyPostInput {
  id: string;
  userId: string;
  role: Role;
}

// Owner or ADMIN only. Needs the fetched authorId, so an explicit lookup is used here.
const assertCanModifyPost = async ({ id, userId, role }: ModifyPostInput) => {
  const post = await prisma.post.findUnique({ where: { id }, select: { authorId: true } });
  if (!post) throw errors.notFound('Post');
  if (post.authorId !== userId && role !== Role.ADMIN) {
    throw errors.forbidden('You do not have permission to modify this post.');
  }
};

interface UpdatePostInput extends ModifyPostInput {
  data: {
    title?: string;
    content?: string;
  };
}

export const updatePost = async ({ id, userId, role, data }: UpdatePostInput) => {
  await assertCanModifyPost({ id, userId, role });
  try {
    return await prisma.post.update({ where: { id }, data, select: postSelect });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw errors.notFound('Post');
    }
    throw err;
  }
};

export const deletePost = async (input: ModifyPostInput) => {
  await assertCanModifyPost(input);
  try {
    // Comments are removed by the onDelete: Cascade relation.
    await prisma.post.delete({ where: { id: input.id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw errors.notFound('Post');
    }
    throw err;
  }
};
