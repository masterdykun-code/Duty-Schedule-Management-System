import { Router } from "express";
import { authenticateToken } from "../../../middlewares/auth.middleware.js";
import {
  changePassword,
  getCurrentUser,
  login,
  updateCurrentUserProfile,
} from "../controllers/auth.controller.js";

const router = Router();

router.post("/login", login);
router.get("/me", authenticateToken, getCurrentUser);
router.patch("/profile", authenticateToken, updateCurrentUserProfile);
router.patch("/change-password", authenticateToken, changePassword);

export default router;
