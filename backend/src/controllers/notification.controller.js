import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Notification } from "../models/notification.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { assertValidObjectId } from "../validators/request.validator.js";

const getUserNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { read } = req.query;

  if (read !== undefined && !["true", "false"].includes(read)) {
    throw new ApiError(400, "read must be true or false");
  }

  let query = { userId };

  if (read !== undefined) {
    query.read = read === "true";
  }

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(100)
    .populate("relatedComplaintId", "title status category");

  const unreadCount = await Notification.countDocuments({
    userId,
    read: false,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        notifications,
        unreadCount,
      },
      "Notifications fetched successfully",
    ),
  );
});

const markNotificationAsRead = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;
  assertValidObjectId(notificationId, "notificationId");

  const notification = await Notification.findById(notificationId);

  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }

  if (notification.userId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized");
  }

  notification.read = true;
  await notification.save();

  return res
    .status(200)
    .json(new ApiResponse(200, notification, "Notification marked as read"));
});

const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  await Notification.updateMany({ userId, read: false }, { read: true });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "All notifications marked as read"));
});

const deleteNotification = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;
  assertValidObjectId(notificationId, "notificationId");

  const notification = await Notification.findById(notificationId);

  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }

  if (notification.userId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized");
  }

  await Notification.findByIdAndDelete(notificationId);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Notification deleted successfully"));
});

const deleteAllNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  await Notification.deleteMany({ userId });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "All notifications deleted successfully"));
});

const getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const unreadCount = await Notification.countDocuments({
    userId,
    read: false,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { unreadCount }, "Unread count fetched"));
});

export {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,
  getUnreadCount,
};
