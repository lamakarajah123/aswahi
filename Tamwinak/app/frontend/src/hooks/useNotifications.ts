import { useState, useEffect, useCallback, useRef } from 'react';
import { apiCall } from '../lib/axios';

export interface AppNotification {
  id: number;
  title: string;
  body: string;
  type: string;
  order_id: number | null;
  is_read: boolean;
  created_at: string | null;
}

// Request browser notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

// Show a browser notification
function showBrowserNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/images/Notification.jpg',
        badge: '/images/Notification.jpg',
        tag: `grocergo-${Date.now()}`,
      });
    } catch {
      // Silently fail if notification can't be shown
    }
  }
}

export function useNotifications(isAuthenticated: boolean) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const prevUnreadRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [countRes, listRes] = await Promise.all([
        apiCall.invoke({
          url: '/api/v1/grocery/notifications/unread-count',
          method: 'GET',
          data: {},
        }),
        apiCall.invoke({
          url: '/api/v1/grocery/notifications/recent',
          method: 'GET',
          data: { limit: 20 },
        }),
      ]);

      const newUnread = countRes?.data?.unread_count ?? 0;
      const notifList: AppNotification[] = Array.isArray(listRes?.data) ? listRes.data : [];

      // Show browser notification for new unread items
      if (newUnread > prevUnreadRef.current && notifList.length > 0) {
        const newest = notifList[0];
        if (newest && !newest.is_read) {
          showBrowserNotification(newest.title, newest.body);
        }
      }
      prevUnreadRef.current = newUnread;

      setUnreadCount(newUnread);
      setNotifications(notifList);
    } catch {
      // Silently fail polling
    }
  }, [isAuthenticated]);

  const markAllRead = useCallback(async () => {
    try {
      await apiCall.invoke({
        url: '/api/v1/grocery/notifications/mark-all-read',
        method: 'PUT',
        data: {},
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      prevUnreadRef.current = 0;
    } catch {
      // Silently fail
    }
  }, []);

  const markOneRead = useCallback(async (id: number) => {
    try {
      await apiCall.invoke({
        url: `/api/v1/grocery/notifications/${id}/read`,
        method: 'PUT',
        data: {},
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Silently fail
    }
  }, []);

  // Start polling when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    setLoading(true);
    fetchNotifications().finally(() => setLoading(false));

    // Poll every 15 seconds
    intervalRef.current = setInterval(fetchNotifications, 15000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isAuthenticated, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAllRead,
    markOneRead,
  };
}
