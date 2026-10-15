import { Router } from "express";
import {
  ShareController,
  shareResourceSchema,
  revokeShareSchema,
  createShareLinkSchema,
  inviteShareSchema
} from "../controllers/share.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";

const router = Router();

// Public link resolution & downloading do NOT require authentication
router.get("/link/:token", ShareController.resolveLink);
router.get("/link/:token/download", ShareController.downloadShared);

// Authenticated routes
router.use(authenticate);

router.post("/", validate(shareResourceSchema), ShareController.share);
router.post("/invite", validate(inviteShareSchema), ShareController.invite);
router.delete("/", validate(revokeShareSchema), ShareController.revoke);
router.post("/link", validate(createShareLinkSchema), ShareController.createLink);
router.get("/shared-with-me", ShareController.listShared);

export default router;
