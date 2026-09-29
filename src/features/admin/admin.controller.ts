import type { Request, Response } from 'express';
import catchAsync from '@utils/catchAsync';
import logger from '@utils/logger';
import { sendSuccess } from '@utils/response';
import * as adminService from './admin.service';

// GET /users
export const getUsers = catchAsync(async (req: Request, res: Response) => {
  const users = await adminService.getUsers();
  logger.info('Admin : Users retrieved successfully.');
  sendSuccess(res, { data: users, message: 'Users retrieved successfully' });
});

// GET /users/:id
export const getUser = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const user = await adminService.getUser(id);
  logger.info(`Admin : User with ID ${id} retrieved successfully.`);
  sendSuccess(res, { data: user, message: 'User retrieved successfully' });
});

// POST /users
export const addUser = catchAsync(async (req: Request, res: Response) => {
  const user = await adminService.createUser(req.body);
  logger.info(`Admin : User ${user.email} created successfully.`);
  sendSuccess(res, { data: user, statusCode: 201, message: 'User created successfully' });
});

// DELETE /users/:id
export const deleteUser = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const user = await adminService.deleteUser(id);
  logger.info(`Admin : User with email ${user.email} deleted successfully.`);
  sendSuccess(res, { message: 'User deleted successfully', data: user });
});

// PATCH /users/:id
export const updateUser = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { name, email, role, password } = req.body;
  const user = await adminService.updateUser(id, { name, email, role, password });
  logger.info(`Admin : User with email ${user.email} updated successfully.`);
  sendSuccess(res, { data: user, message: 'User updated successfully' });
});
