import { Router } from "express";
import { authenticateToken } from "../../../middlewares/auth.middleware.js";
import {
  listMyNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../controllers/notification.controller.js";

const router = Router();

router.use(authenticateToken);

router.get("/", listMyNotifications);
router.patch("/read-all", markAllNotificationsAsRead);
router.patch("/:notificationId/read", markNotificationAsRead);

export default router;
