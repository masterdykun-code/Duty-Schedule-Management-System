import { Router } from "express";
import { authenticateToken, authorizeRoles } from "../auth/auth.middleware.js";
import { roles } from "../auth/roles.js";
import {
  autoAssignSchedule,
  getAssignmentSchedule,
  resetAssignmentSchedule,
  saveAssignmentCell,
  validateAssignmentSchedule,
} from "./assignment/assignment.controller.js";
import { getGeneralSchedule } from "./general/general.controller.js";
import { getMySchedule } from "./personal/personal.controller.js";
import {
  getScheduleDetail,
  getSwapRequests,
  getSwapOptions,
  respondSwapRequest,
  reviewSwapRequestByHead,
  sendSwapRequest,
} from "./swap/swap.controller.js";

const router = Router();

router.get(
  "/assignment",
  authenticateToken,
  authorizeRoles(roles.ADMIN),
  getAssignmentSchedule,
);

router.put(
  "/assignment/cell",
  authenticateToken,
  authorizeRoles(roles.ADMIN),
  saveAssignmentCell,
);

router.post(
  "/assignment/validate",
  authenticateToken,
  authorizeRoles(roles.ADMIN),
  validateAssignmentSchedule,
);

router.post(
  "/assignment/auto",
  authenticateToken,
  authorizeRoles(roles.ADMIN),
  autoAssignSchedule,
);

router.post(
  "/assignment/reset",
  authenticateToken,
  authorizeRoles(roles.ADMIN),
  resetAssignmentSchedule,
);

router.get(
  "/general",
  authenticateToken,
  authorizeRoles(roles.ADMIN, roles.MEDICAL_STAFF, roles.DEPARTMENT_HEAD, roles.OFFICE),
  getGeneralSchedule,
);

router.get(
  "/me/schedules/:scheduleId",
  authenticateToken,
  authorizeRoles(roles.MEDICAL_STAFF, roles.DEPARTMENT_HEAD),
  getScheduleDetail,
);

router.get(
  "/me/swap-options",
  authenticateToken,
  authorizeRoles(roles.MEDICAL_STAFF, roles.DEPARTMENT_HEAD),
  getSwapOptions,
);

router.get(
  "/me/swap-requests",
  authenticateToken,
  authorizeRoles(roles.MEDICAL_STAFF, roles.DEPARTMENT_HEAD),
  getSwapRequests,
);

router.post(
  "/me/swap-requests",
  authenticateToken,
  authorizeRoles(roles.MEDICAL_STAFF, roles.DEPARTMENT_HEAD),
  sendSwapRequest,
);

router.post(
  "/me/swap-requests/:requestId/respond",
  authenticateToken,
  authorizeRoles(roles.MEDICAL_STAFF, roles.DEPARTMENT_HEAD),
  respondSwapRequest,
);

router.post(
  "/me/swap-requests/:requestId/review",
  authenticateToken,
  authorizeRoles(roles.DEPARTMENT_HEAD),
  reviewSwapRequestByHead,
);

router.get(
  "/me",
  authenticateToken,
  authorizeRoles(roles.MEDICAL_STAFF, roles.DEPARTMENT_HEAD),
  getMySchedule,
);

export default router;
