import { Notification } from "../models/notification.model.js";

const createNotification = async ({
  userId,
  role,
  title,
  message,
  type,
  relatedComplaintId = null,
}) =>
  Notification.create({
    userId,
    role,
    title,
    message,
    type,
    relatedComplaintId,
  });

export { createNotification };
