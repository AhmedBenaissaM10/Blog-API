import {Router} from 'express';
import {signup, login, logout, getUserProfile, updateUser, getAllUsers, deleteUser, refresh} from './authControllers'
import { protect, authorize } from "../../middlewares/auth";
import  { validate, validateId } from '../../middlewares/validate';
import { signupSchema, loginSchema } from './authValidators';

const router = Router();


router.post("/login", validate(loginSchema), login)

router.post("/signup", validate(signupSchema), signup)

router.post("/refresh", refresh)

router.post("/logout",logout)

router.get("/users/:id",validateId, getUserProfile)

router.patch("/users/:id",validateId, protect,  updateUser)

router.get("/users", protect, authorize("admin"), getAllUsers)

router.delete("/users/:id", validateId,protect, authorize("admin"),  deleteUser)

export default router;


