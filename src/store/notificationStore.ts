import { create } from "zustand";

const READ_IDS_KEY = "kirnagram:readNotifications";

const loadReadIds = (): Set<string> => {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(READ_IDS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id) => typeof id === "string"));
  } catch {
    return new Set();
  }
};

const saveReadIds = (ids: Set<string>) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(READ_IDS_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // ignore storage errors
  }
};

export interface Notification {
  id: string;
  user_id: string;
  user_name: string;
  user_image: string | null;
  action: string;
  description: string;
  timestamp: string;
  read: boolean;
}

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  removeNotification: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  unreadCount: 0,

  setNotifications: (notifications) => {
    const readIds = loadReadIds();
    const merged = notifications.map((n) => ({
      ...n,
      read: n.read || readIds.has(n.id),
    }));
    const unreadCount = merged.filter((n) => !n.read).length;
    set({ notifications: merged, unreadCount });
  },

  addNotification: (notification) => {
    set((state) => {
      const newNotif = { ...notification, read: false };
      const newNotifications = [newNotif, ...state.notifications];
      const unreadCount = newNotifications.filter((n) => !n.read).length;
      return {
        notifications: newNotifications,
        unreadCount,
      };
    });
  },

  markAsRead: (id) => {
    set((state) => {
      const readIds = loadReadIds();
      readIds.add(id);
      saveReadIds(readIds);
      const notifications = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      const unreadCount = notifications.filter((n) => !n.read).length;
      return { notifications, unreadCount };
    });
  },

  removeNotification: (id) => {
    set((state) => {
      const readIds = loadReadIds();
      readIds.delete(id);
      saveReadIds(readIds);
      const notifications = state.notifications.filter((n) => n.id !== id);
      const unreadCount = notifications.filter((n) => !n.read).length;
      return { notifications, unreadCount };
    });
  },

  markAllAsRead: () => {
    set((state) => {
      const readIds = loadReadIds();
      state.notifications.forEach((n) => readIds.add(n.id));
      saveReadIds(readIds);
      const notifications = state.notifications.map((n) => ({ ...n, read: true }));
      return { notifications, unreadCount: 0 };
    });
  },

  clearAll: () => {
    saveReadIds(new Set());
    set({ notifications: [], unreadCount: 0 });
  },
}));
