// src/features/notifications/api.js
export {
  fetchNotifications,
  unreadCount,
  markAsRead,
  markAllRead,
  getNotificationPrefs,
  updateNotificationPrefs,
  isDndActive,
  setDndUntil,
  clearDnd,
  isSnoozed,
  setSnoozeUntil,
  clearSnooze,
  createNotification,
} from "@/lib/services/notificationsService";
// Type exports removed
