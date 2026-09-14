import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Category } from '../types';
import { logAuditEvent } from './auditService';

export class CategoryService {
  static async getCategories(includeInactive: boolean = true): Promise<Category[]> {
    try {
      const categoriesRef = collection(db, 'categories');
      let q = query(categoriesRef, orderBy('name', 'asc'));
      if (!includeInactive) {
        q = query(categoriesRef, where('active', '==', true), orderBy('name', 'asc'));
      }
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Category[];
    } catch (err) {
      console.error('Failed to get categories:', err);
      return [];
    }
  }

  static async createCategory(
    data: { name: string; description?: string; active?: boolean },
    user: { uid: string; displayName?: string; email?: string }
  ): Promise<string> {
    const cleanName = data.name.trim();
    if (!cleanName) throw new Error('Category name is required.');

    // Check duplicate name
    const q = query(collection(db, 'categories'), where('name', '==', cleanName));
    const snap = await getDocs(q);
    if (!snap.empty) {
      throw new Error(`A category with the name "${cleanName}" already exists.`);
    }

    const docRef = await addDoc(collection(db, 'categories'), {
      name: cleanName,
      description: data.description?.trim() || '',
      active: data.active !== undefined ? data.active : true,
      createdBy: user.displayName || user.email || user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await logAuditEvent(
      user,
      'CATEGORY_CREATED',
      'CATEGORIES',
      `Created category "${cleanName}"`,
      docRef.id
    );

    return docRef.id;
  }

  static async updateCategory(
    id: string,
    data: { name: string; description?: string; active?: boolean },
    user: { uid: string; displayName?: string; email?: string }
  ): Promise<void> {
    const cleanName = data.name.trim();
    if (!cleanName) throw new Error('Category name is required.');

    // Check duplicate excluding self
    const q = query(collection(db, 'categories'), where('name', '==', cleanName));
    const snap = await getDocs(q);
    const isTaken = snap.docs.some((d) => d.id !== id);
    if (isTaken) {
      throw new Error(`A category with the name "${cleanName}" already exists.`);
    }

    const ref = doc(db, 'categories', id);
    await updateDoc(ref, {
      name: cleanName,
      description: data.description?.trim() || '',
      active: data.active !== undefined ? data.active : true,
      updatedAt: serverTimestamp(),
      updatedBy: user.displayName || user.email || user.uid,
    });

    await logAuditEvent(
      user,
      'CATEGORY_UPDATED',
      'CATEGORIES',
      `Updated category "${cleanName}"`,
      id
    );
  }

  /**
   * Safe delete: Prevent deletion if active products reference this category (Requirement #8)
   */
  static async deleteCategory(
    id: string,
    categoryName: string,
    user: { uid: string; displayName?: string; email?: string }
  ): Promise<void> {
    const productsRef = collection(db, 'products');
    const q = query(productsRef, where('categoryId', '==', id), where('active', '==', true));
    const snap = await getDocs(q);

    if (!snap.empty) {
      throw new Error(
        `Cannot delete category "${categoryName}". There are ${snap.size} active product(s) assigned to this category. Reassign them first or deactivate this category.`
      );
    }

    const ref = doc(db, 'categories', id);
    await deleteDoc(ref);

    await logAuditEvent(
      user,
      'CATEGORY_DELETED',
      'CATEGORIES',
      `Deleted category "${categoryName}"`,
      id
    );
  }
}
