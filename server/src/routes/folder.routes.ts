import { Router } from "express";
import {
  FolderController,
  createFolderSchema,
  renameFolderSchema,
  moveFolderSchema
} from "../controllers/folder.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";

const router = Router();

router.use(authenticate);

router.post("/", validate(createFolderSchema), FolderController.create);
router.get("/all", FolderController.getAll);
router.get("/", FolderController.list);
router.patch("/:id/rename", validate(renameFolderSchema), FolderController.rename);
router.patch("/:id/move", validate(moveFolderSchema), FolderController.move);
router.delete("/:id", FolderController.delete);

export default router;
