import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, ExternalLink, Trash2 } from "lucide-react";
import {
  deleteAllNotifications,
  deleteNotification,
  getNotifications,
  getUnreadCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../../services/notification";
import "../../styles/notifications.css";
import { getStoredToken } from "../../utils/auth";

const NotificationBell = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const isAuthenticated = Boolean(getStoredToken());

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const response = await getNotifications();
      setNotifications(response.data.data.notifications);
      setUnreadCount(response.data.data.unreadCount);
    } catch (error) {
      if (error.response?.status !== 401) {
        setErrorMessage("Notifications could not be loaded.");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await getUnreadCount();
      setUnreadCount(response.data.data.unreadCount);
    } catch (error) {
      if (error.response?.status === 401) {
        setUnreadCount(0);
        setNotifications([]);
        setShowDropdown(false);
        return;
      }

      setErrorMessage("Notification updates are temporarily unavailable.");
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      return undefined;
    }

    fetchUnreadCount();

    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  useEffect(() => {
    if (showDropdown) {
      fetchNotifications();
    }
  }, [showDropdown]);

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

  const handleDeleteNotification = async (notificationId) => {
    try {
      await deleteNotification(notificationId);
      await fetchNotifications();
    } catch {
      setErrorMessage("The notification could not be deleted.");
    }
  };

  const handleDeleteAllNotifications = async () => {
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

  const getNotificationIcon = (type) => {
    switch (type) {
      case "complaint_created":
        return "New";
      case "worker_assigned":
        return "Task";
      case "status_updated":
        return "Update";
      case "complaint_resolved":
        return "Done";
      default:
        return "Info";
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="notification-bell-container">
      <button
        className="notification-bell"
        onClick={() => setShowDropdown((value) => !value)}
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </button>

      {showDropdown && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            <div className="notification-actions">
              <button
                className="action-btn"
                onClick={() => {
                  setShowDropdown(false);
                  navigate("/notifications");
                }}
                title="View all notifications"
              >
                <ExternalLink size={14} />
              </button>
              {notifications.length > 0 && unreadCount > 0 && (
                <button
                  className="action-btn"
                  onClick={handleMarkAllAsRead}
                  title="Mark all as read"
                >
                  <Check size={14} />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  className="action-btn delete-btn"
                  onClick={handleDeleteAllNotifications}
                  title="Delete all"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="notification-list">
            {errorMessage && <p role="alert" className="notification-error">{errorMessage}</p>}
            {loading ? (
              <p className="loading">Loading...</p>
            ) : notifications.length === 0 ? (
              <p className="empty-state">No notifications yet</p>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`notification-item ${
                    notification.read ? "read" : "unread"
                  }`}
                >
                  <span className="notification-icon">
                    {getNotificationIcon(notification.type)}
                  </span>
                  <div className="notification-content">
                    <p className="notification-title">{notification.title}</p>
                    <p className="notification-message">
                      {notification.message}
                    </p>
                    <span className="notification-time">
                      {new Date(notification.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="notification-actions-item">
                    {!notification.read && (
                      <button
                        className="action-btn"
                        onClick={() => handleMarkAsRead(notification._id)}
                        title="Mark as read"
                      >
                        <Check size={14} />
                      </button>
                    )}
                    <button
                      className="action-btn delete-btn"
                      onClick={() => handleDeleteNotification(notification._id)}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
