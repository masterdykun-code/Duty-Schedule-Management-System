import { Router } from "express";
import { authenticateToken, authorizeRoles } from "../auth/auth.middleware.js";
import { roles } from "../auth/roles.js";
import { createUser } from "./user.controller.js";

const router = Router();

router.post("/users", authenticateToken, authorizeRoles(roles.ADMIN), createUser);

export default router;
