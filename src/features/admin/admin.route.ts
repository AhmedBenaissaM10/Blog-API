import { RequestHandler, Router } from 'express';
import { validate } from '@middlewares/validate';
import * as AdminController from './admin.controller';
import * as AdminValidator from './admin.validator';
import { requireAuth, authorize } from '@middlewares/auth';
const router = Router();

router.use(requireAuth);
router.use(authorize('ADMIN'));

router.get('/users', AdminController.getUsers as RequestHandler);

router.post(
  '/users',
  validate(AdminValidator.addUserSchema),
  AdminController.addUser as RequestHandler
);

router.get(
  '/users/:id',
  validate(AdminValidator.idParamsSchema),
  AdminController.getUser as RequestHandler
);

router.patch(
  '/users/:id',
  validate(AdminValidator.updateUserSchema),
  AdminController.updateUser as RequestHandler
);

router.delete(
  '/users/:id',
  validate(AdminValidator.idParamsSchema),
  AdminController.deleteUser as RequestHandler
);

export default router;
