import { Router } from "express";
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,
  getUnreadCount,
} from "../controllers/notification.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const notificationRouter = Router();

// Apply JWT verification to all routes
notificationRouter.use(verifyJWT);

notificationRouter.get("/", getUserNotifications);

notificationRouter.get("/unread-count", getUnreadCount);

notificationRouter.patch("/mark-all/read", markAllNotificationsAsRead);

notificationRouter.patch("/:notificationId/read", markNotificationAsRead);

notificationRouter.delete("/:notificationId", deleteNotification);

notificationRouter.delete("/", deleteAllNotifications);

export default notificationRouter;
