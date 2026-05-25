import { Router } from "express";
import { authenticateToken, authorizeRoles } from "../auth/auth.middleware.js";
import { roles } from "../auth/roles.js";
import {
  createEmployee,
  createShift,
  deactivateEmployee,
  deactivateShift,
  listDepartments,
  listEmployees,
  listRooms,
  listShifts,
  updateEmployee,
  updateShift,
} from "./admin.controller.js";

const router = Router();

router.use(authenticateToken, authorizeRoles(roles.ADMIN));

router.get("/departments", listDepartments);
router.get("/rooms", listRooms);

router.get("/employees", listEmployees);
router.post("/employees", createEmployee);
router.patch("/employees/:id", updateEmployee);
router.delete("/employees/:id", deactivateEmployee);

router.get("/shifts", listShifts);
router.post("/shifts", createShift);
router.patch("/shifts/:id", updateShift);
router.delete("/shifts/:id", deactivateShift);

export default router;
