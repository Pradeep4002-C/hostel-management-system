import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import RoleNavbar from "../components/navigation/RoleNavbar";
import {
  deleteAllNotifications,
  deleteNotification,
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../services/notification";
import { clearStoredAuth, getStoredUser } from "../utils/auth";

function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [unreadCount, setUnreadCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();
  const user = getStoredUser();

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const response = await getNotifications(
        filter === "all" ? undefined : filter === "unread" ? false : true,
      );
      setNotifications(response.data.data.notifications);
      setUnreadCount(response.data.data.unreadCount);
    } catch (error) {
      if (error.response?.status === 401) {
        clearStoredAuth();
        navigate("/", { replace: true });
        return;
      }

      setErrorMessage("Notifications could not be loaded. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [filter, navigate]);

  useEffect(() => {
    if (!user) {
      navigate("/", { replace: true });
      return;
    }

    fetchNotifications();
  }, [fetchNotifications, navigate, user]);

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markNotificationAsRead(notificationId);
      await fetchNotifications();
    } catch {
      setErrorMessage("The notification could not be updated.");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      await fetchNotifications();
    } catch {
      setErrorMessage("Notifications could not be updated.");
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await deleteNotification(notificationId);
      await fetchNotifications();
    } catch {
      setErrorMessage("The notification could not be deleted.");
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm("Are you sure you want to delete all notifications?")) {
      return;
    }

    try {
      await deleteAllNotifications();
      await fetchNotifications();
    } catch {
      setErrorMessage("Notifications could not be deleted.");
    }
  };

  const getNotificationLabel = (type) => {
    switch (type) {
      case "complaint_created":
        return "New complaint";
      case "worker_assigned":
        return "Worker assigned";
      case "status_updated":
        return "Status update";
      case "complaint_resolved":
        return "Resolved";
      default:
        return "Notification";
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case "complaint_created":
        return "bg-blue-50 border-l-4 border-blue-500";
      case "worker_assigned":
        return "bg-green-50 border-l-4 border-green-500";
      case "status_updated":
        return "bg-yellow-50 border-l-4 border-yellow-500";
      case "complaint_resolved":
        return "bg-purple-50 border-l-4 border-purple-500";
      default:
        return "bg-gray-50 border-l-4 border-gray-500";
    }
  };

  return (
    <>
      <RoleNavbar role={user?.role || "student"} />

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-600 mt-2">
              You have {unreadCount} unread notification
              {unreadCount !== 1 ? "s" : ""}
            </p>
          </div>

          {errorMessage && (
            <p role="alert" className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </p>
          )}

          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter("all")}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    filter === "all"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter("unread")}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    filter === "unread"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                  }`}
                >
                  Unread ({unreadCount})
                </button>
                <button
                  onClick={() => setFilter("read")}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    filter === "read"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                  }`}
                >
                  Read
                </button>
              </div>

              {notifications.length > 0 && (
                <div className="flex gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                    >
                      Mark All as Read
                    </button>
                  )}
                  <button
                    onClick={handleDeleteAll}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
                  >
                    Delete All
                  </button>
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-md">
              <p className="text-gray-600 text-lg">No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`${getNotificationColor(
                    notification.type,
                  )} rounded-lg shadow-md p-6 transition hover:shadow-lg`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4 flex-1">
                      <span className="text-sm font-semibold text-gray-600 flex-shrink-0">
                        {getNotificationLabel(notification.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-gray-900">
                          {notification.title}
                        </h3>
                        <p className="text-gray-700 mt-2 line-clamp-2">
                          {notification.message}
                        </p>
                        {notification.relatedComplaintId && (
                          <p className="text-sm text-gray-600 mt-2">
                            Related to: {notification.relatedComplaintId.title}
                          </p>
                        )}
                        <p className="text-sm text-gray-500 mt-3">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-shrink-0">
                      {!notification.read && (
                        <button
                          onClick={() => handleMarkAsRead(notification._id)}
                          className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                          title="Mark as read"
                        >
                          Mark Read
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(notification._id)}
                        className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
                        title="Delete"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {!notification.read && (
                    <span className="inline-block mt-4 px-3 py-1 bg-blue-200 text-blue-800 rounded-full text-xs font-semibold">
                      Unread
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default NotificationsPage;
