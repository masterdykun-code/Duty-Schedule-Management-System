import { Router } from "express";
import { authenticateToken, authorizeRoles } from "../../../middlewares/auth.middleware.js";
import { roles } from "../../../config/roles.js";
import { createUser } from "../controllers/user.controller.js";

const router = Router();

router.post("/users", authenticateToken, authorizeRoles(roles.ADMIN), createUser);

export default router;
