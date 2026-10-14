import { Router } from "express";
import {
  ShareController,
  shareResourceSchema,
  revokeShareSchema,
  createShareLinkSchema
} from "../controllers/share.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";

const router = Router();

// Public link resolution does NOT require authentication
router.get("/link/:token", ShareController.resolveLink);

// Authenticated routes
router.use(authenticate);

router.post("/", validate(shareResourceSchema), ShareController.share);
router.delete("/", validate(revokeShareSchema), ShareController.revoke);
router.post("/link", validate(createShareLinkSchema), ShareController.createLink);
router.get("/shared-with-me", ShareController.listShared);

export default router;
