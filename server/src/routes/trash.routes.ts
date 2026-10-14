import { Router } from "express";
import { TrashController, restoreSchema } from "../controllers/trash.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";

const router = Router();

router.use(authenticate);

router.get("/", TrashController.list);
router.post("/restore", validate(restoreSchema), TrashController.restore);
router.delete("/empty", TrashController.empty);

export default router;
