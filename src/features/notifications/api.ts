// src/features/notifications/api.ts
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

export type {
  Notification,
  NotificationPrefs,
} from "@/lib/services/notificationsService";
