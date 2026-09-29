import bcrypt from 'bcrypt';
import * as errors from '@errors/ErrorIndex';
import { sendOTPEmail } from '@lib/mailer';
import { prisma } from '@lib/prisma';
import redisClient from '@lib/redis';
import { createAccessToken, createRefreshToken, verifyRefreshToken } from '@utils/jwtUtils';
interface UpdateProfileInput {
  name?: string;
  email?: string;
}
const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
};

export const createTokens = async (userId: string, email: string, role: 'ADMIN' | 'USER') => {
  const accessToken = createAccessToken(userId, email, role);
  const refreshToken = createRefreshToken(userId, email, role);
  await redisClient.set(`refresh:${userId}`, refreshToken, { EX: 7 * 24 * 60 * 60 });
  return { accessToken, refreshToken };
};
export const sendOTP = async (id: string, email: string) => {
  const codeOtp = Math.floor(100000 + Math.random() * 900000).toString();
  await redisClient.set(`otp:${id}`, codeOtp, { EX: 10 * 60 });
  await sendOTPEmail(email, codeOtp, 'Verify your email');
};

export const createUser = async (email: string, name: string, password: string) => {
  const existingUser = await prisma.user.findUnique({ where: { email: email } });
  if (existingUser) throw errors.badRequest('Email already in use');
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, name, password: hashedPassword },
    select: safeUserSelect,
  });
  const { accessToken, refreshToken } = await createTokens(user.id, user.email, user.role);
  return { user, accessToken, refreshToken };
};

export const login = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.googleId) throw errors.badRequest('Invalid credentials');
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw errors.badRequest('Invalid credentials');
  const { accessToken, refreshToken } = await createTokens(user.id, user.email, user.role);
  return { user, accessToken, refreshToken };
};
export const logout = async (refreshToken: string) => {
  const refreshDecoded = verifyRefreshToken(refreshToken);
  await redisClient.del(`refresh:${refreshDecoded.id}`);
  return { id: refreshDecoded.id, email: refreshDecoded.email };
};

export const refresh = async (refreshToken: string) => {
  const refreshDecoded = verifyRefreshToken(refreshToken);
  const storedToken = await redisClient.get(`refresh:${refreshDecoded.id}`);
  if (!storedToken) throw errors.unauthorized('Refresh token not found');
  if (storedToken !== refreshToken) throw errors.unauthorized('Refresh token does not match');

  const { accessToken, refreshToken: newRefreshToken } = await createTokens(
    refreshDecoded.id,
    refreshDecoded.email,
    refreshDecoded.role
  );

  return { email: refreshDecoded.email, newRefreshToken, accessToken };
};
export const getProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: safeUserSelect,
  });
  if (!user) throw errors.notFound('User not found');
  return user;
};

export const updateProfile = async (userId: string, updateData: UpdateProfileInput) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: safeUserSelect,
  });
  if (!user) throw errors.notFound('User not found');
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(updateData.name !== undefined && { name: updateData.name }),
      ...(updateData.email !== undefined && { email: updateData.email }),
    },
    select: safeUserSelect,
  });
  return updatedUser;
};

export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw errors.badRequest('Invalid credentials');
  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) throw errors.badRequest('Current password is incorrect, please try again');
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { password: hashedPassword } });
};

export const forgotPassword = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;
  const codeOtp = Math.floor(100000 + Math.random() * 900000).toString();
  await redisClient.set(`reset:${user.id}`, codeOtp, { EX: 10 * 60 });
  await sendOTPEmail(email, codeOtp, 'Reset your password');
};
export const resetPassword = async (email: string, code: string, newPassword: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;
  const storedCode = await redisClient.get(`reset:${user.id}`);
  if (!storedCode) throw errors.badRequest('Reset code expired');
  if (storedCode !== code) throw errors.badRequest('Invalid reset code');
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { password: hashedPassword } });
  await redisClient.del(`reset:${user.id}`);
};

export const googleAuthService = async (email: string, googleId: string, name: string) => {
  let user = await prisma.user.findUnique({ where: { googleId } });
  if (user) return user; // If user already exists, return the user
  user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    return await prisma.user.update({ where: { email }, data: { googleId, provider: 'google' } });
  }
  return await prisma.user.create({
    data: { email, googleId, provider: 'google', name, password: '' },
  });
};
