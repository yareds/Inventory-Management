import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  writeBatch,
  serverTimestamp,
  orderBy,
  limit,
} from '../lib/firestoreFacade';
import { db } from '../firebase/config';
import { NotificationItem } from '../types';

export async function triggerLowStockNotification(
  productId: string,
  productName: string,
  currentStock: number,
  reorderLevel: number
): Promise<void> {
  try {
    const notifRef = collection(db, 'notifications');
    // Check if there's already an unread notification for this product to avoid spamming
    const q = query(
      notifRef,
      where('productId', '==', productId),
      where('read', '==', false),
      where('type', '==', currentStock === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK')
    );
    const existing = await getDocs(q);
    if (!existing.empty) {
      return; // Already alerted
    }

    const isOutOfStock = currentStock <= 0;
    const title = isOutOfStock
      ? `Out of Stock: ${productName}`
      : `Low Stock Alert: ${productName}`;
    const message = isOutOfStock
      ? `${productName} is completely out of stock (0 units). Reorder level is ${reorderLevel}.`
      : `${productName} is low in stock. Only ${currentStock} units remain. Reorder level is ${reorderLevel}.`;

    await addDoc(notifRef, {
      type: isOutOfStock ? 'OUT_OF_STOCK' : 'LOW_STOCK',
      title,
      message,
      productId,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('Failed to trigger low stock notification:', err);
  }
}

export async function getNotifications(maxCount: number = 20): Promise<NotificationItem[]> {
  try {
    const notifRef = collection(db, 'notifications');
    const q = query(notifRef, orderBy('createdAt', 'desc'), limit(maxCount));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as NotificationItem[];
  } catch (err) {
    console.error('Failed to fetch notifications:', err);
    return [];
  }
}

export async function markNotificationAsRead(id: string): Promise<void> {
  const notifRef = doc(db, 'notifications', id);
  await updateDoc(notifRef, { read: true });
}

export async function markAllNotificationsAsRead(notifications: NotificationItem[]): Promise<void> {
  const unread = notifications.filter((n) => !n.read && n.id);
  if (unread.length === 0) return;

  const batch = writeBatch(db);
  for (const item of unread) {
    if (item.id) {
      const ref = doc(db, 'notifications', item.id);
      batch.update(ref, { read: true });
    }
  }
  await batch.commit();
}
