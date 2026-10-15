import { Router } from "express";
import {
  AuthController,
  registerSchema,
  loginSchema,
  googleAuthSchema
} from "../controllers/auth.controller";
import { validate } from "../middlewares/validate.middleware";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.post("/register", validate(registerSchema), AuthController.register);
router.post("/login", validate(loginSchema), AuthController.login);
router.post("/google", validate(googleAuthSchema), AuthController.googleAuth);
router.get("/profiles", AuthController.getPublicProfiles);
router.post("/quick-login", AuthController.quickLogin);
router.get("/me", authenticate, AuthController.getProfile);

export default router;
