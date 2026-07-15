import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import apiClient from "../lib/apiClient";
import { useAuth } from "./AuthContext";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  isRead: boolean;
  isArchived?: boolean;
  actionUrl?: string;
  actionText?: string;
  createdAt: string;
}

interface NotificationContextProps {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  archive: (id: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextProps>({} as NotificationContextProps);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { isAuthenticated } = useAuth();

  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    try {
      // Only fetch the latest page for context. The actual NotificationsPage component will fetch its own paginated data.
      const { data: response } = await apiClient.get("/notifications?page=1&limit=20");
      setNotifications(response.data || []);
      setUnreadCount(response.unreadCount || 0);
    } catch (error: any) {
      if (error?.response?.status === 401) {
        // Silently return as this is handled by the auth interceptor / login state
        return;
      }
      console.error("Failed to fetch notifications", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    if (isAuthenticated) {
      const interval = setInterval(fetchNotifications, 30000); // Simple polling every 30s
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const markAsRead = async (id: string) => {
    try {
      await apiClient.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      if (error?.response?.status !== 401) console.error(error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.put(`/notifications/read-all`);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      if (error?.response?.status !== 401) console.error(error);
    }
  };

  const archive = async (id: string) => {
    try {
      await apiClient.put(`/notifications/${id}/archive`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (error) {
      if (error?.response?.status !== 401) console.error(error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await apiClient.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (error) {
      if (error?.response?.status !== 401) console.error(error);
    }
  };

  // unreadCount is now managed by state from backend

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        archive,
        deleteNotification,
        refresh: fetchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
