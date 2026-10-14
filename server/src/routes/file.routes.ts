import { Router } from "express";
import {
  FileController,
  renameFileSchema,
  moveFileSchema
} from "../controllers/file.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { upload } from "../middlewares/upload.middleware";
import { validate } from "../middlewares/validate.middleware";

const router = Router();

router.use(authenticate);

router.post("/upload", upload.single("file"), FileController.upload);
router.get("/:id/download", FileController.download);
router.patch("/:id/rename", validate(renameFileSchema), FileController.rename);
router.patch("/:id/move", validate(moveFileSchema), FileController.move);
router.post("/:id/versions", upload.single("file"), FileController.uploadVersion);
router.post("/:id/versions/:version/restore", FileController.restoreVersion);
router.delete("/:id", FileController.delete);

export default router;
