import API from "./api";

export const getNotifications = (read) => {
  const params = read !== undefined ? `?read=${read}` : "";
  return API.get(`/notifications${params}`);
};

export const getUnreadCount = () => {
  return API.get("/notifications/unread-count");
};

export const markNotificationAsRead = (notificationId) => {
  return API.patch(`/notifications/${notificationId}/read`);
};

export const markAllNotificationsAsRead = () => {
  return API.patch("/notifications/mark-all/read");
};

export const deleteNotification = (notificationId) => {
  return API.delete(`/notifications/${notificationId}`);
};

export const deleteAllNotifications = () => {
  return API.delete("/notifications");
};
