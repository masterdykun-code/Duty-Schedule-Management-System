import { Router } from "express";
import { authenticateToken } from "./auth.middleware.js";
import { changePassword, getCurrentUser, login } from "./auth.controller.js";

const router = Router();

router.post("/login", login);
router.get("/me", authenticateToken, getCurrentUser);
router.patch("/change-password", authenticateToken, changePassword);

export default router;
