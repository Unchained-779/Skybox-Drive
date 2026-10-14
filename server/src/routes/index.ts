import { Router } from "express";
import authRoutes from "./auth.routes";
import userRoutes from "./user.routes";
import folderRoutes from "./folder.routes";
import fileRoutes from "./file.routes";
import shareRoutes from "./share.routes";
import trashRoutes from "./trash.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/folders", folderRoutes);
router.use("/files", fileRoutes);
router.use("/shares", shareRoutes);
router.use("/trash", trashRoutes);

export default router;
