import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/config';
import { NotificationItem } from '../types';
import { DEMO_NOTIFICATIONS } from '../lib/demoData';

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(DEMO_NOTIFICATIONS);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    try {
      const notifRef = collection(db, 'notifications');
      const q = query(notifRef, orderBy('createdAt', 'desc'), limit(30));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!isMounted) return;
          const items = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as NotificationItem[];
          setNotifications(items.length > 0 ? items : DEMO_NOTIFICATIONS);
          setLoading(false);
        },
        (err) => {
          if (!isMounted) return;
          if (err?.code === 'permission-denied') {
            // Handled gracefully: Fall back to demo notifications
            setNotifications(DEMO_NOTIFICATIONS);
          } else {
            console.warn('Notifications snapshot issue:', err.message);
          }
          setLoading(false);
        }
      );

      return () => {
        isMounted = false;
        unsubscribe();
      };
    } catch {
      setNotifications(DEMO_NOTIFICATIONS);
      setLoading(false);
    }
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = async (id: string) => {
    // Optimistic local update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );

    try {
      const ref = doc(db, 'notifications', id);
      await updateDoc(ref, { read: true });
    } catch (err: any) {
      if (err?.code !== 'permission-denied') {
        console.warn('Unable to mark notification as read in Firestore:', err.message);
      }
    }
  };

  const markAllAsRead = async () => {
    // Optimistic local update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    try {
      const unread = notifications.filter((n) => !n.read && n.id);
      if (unread.length === 0) return;

      const batch = writeBatch(db);
      for (const item of unread) {
        if (item.id && !item.id.startsWith('notif-')) {
          const ref = doc(db, 'notifications', item.id);
          batch.update(ref, { read: true });
        }
      }
      await batch.commit();
    } catch (err: any) {
      if (err?.code !== 'permission-denied') {
        console.warn('Unable to mark all notifications as read in Firestore:', err.message);
      }
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
