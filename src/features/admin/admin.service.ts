import * as errors from '@errors/ErrorIndex';
import { prisma } from '@lib/prisma';
import bcrypt from 'bcrypt';

const userSelect = { id: true, name: true, email: true, role: true, createdAt: true } as const;

interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'USER';
}

export const createUser = async ({ name, email, password, role }: CreateUserInput) => {
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) throw errors.badRequest('Email already in use');

  const hashedPassword = await bcrypt.hash(password, 10);

  return await prisma.user.create({
    data: { email, name, password: hashedPassword, role },
    select: userSelect,
  });
};

export const getUsers = async () => {
  return await prisma.user.findMany({ select: userSelect });
};

export const getUser = async (id: string) => {
  const user = await prisma.user.findUnique({ where: { id }, select: userSelect });
  if (!user) throw errors.notFound('User not found');
  return user;
};

export const deleteUser = async (id: string) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw errors.notFound('User not found');

  return await prisma.user.delete({ where: { id }, select: userSelect });
};

export const updateUser = async (
  id: string,
  data: { name?: string; email?: string; role?: 'ADMIN' | 'USER'; password?: string }
) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw errors.notFound('User not found');
  const updateData = { ...data };
  if (updateData.password) {
    updateData.password = await bcrypt.hash(updateData.password, 10);
  }
  return await prisma.user.update({
    where: { id },
    data: updateData,
    select: userSelect,
  });
};
