import { Router } from "express";
import { authenticateToken } from "../auth/auth.middleware.js";
import {
  listMyNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "./notification.controller.js";

const router = Router();

router.use(authenticateToken);

router.get("/", listMyNotifications);
router.patch("/read-all", markAllNotificationsAsRead);
router.patch("/:notificationId/read", markNotificationAsRead);

export default router;
