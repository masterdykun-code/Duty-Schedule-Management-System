import { Router } from "express";
import { authenticateToken, authorizeRoles } from "../auth/auth.middleware.js";
import { roles } from "../auth/roles.js";
import { getGeneralSchedule, getMySchedule } from "./schedule.controller.js";

const router = Router();

router.get(
  "/general",
  authenticateToken,
  authorizeRoles(roles.ADMIN, roles.MEDICAL_STAFF, roles.DEPARTMENT_HEAD, roles.OFFICE),
  getGeneralSchedule,
);

router.get(
  "/me",
  authenticateToken,
  authorizeRoles(roles.MEDICAL_STAFF, roles.DEPARTMENT_HEAD),
  getMySchedule,
);

export default router;
