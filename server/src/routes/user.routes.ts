import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/me/storage-stats", UserController.getStorageStats);
router.get("/search", UserController.searchUsers);

export default router;
