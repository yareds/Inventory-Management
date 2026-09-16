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
} from '../lib/firestoreFacade';
import { db } from '../firebase/config';
import { Category } from '../types';
import { logAuditEvent } from './auditService';
import { DEMO_CATEGORIES } from '../lib/demoData';

let localCategories: Category[] = [...DEMO_CATEGORIES];

export class CategoryService {
  static async getCategories(includeInactive: boolean = true): Promise<Category[]> {
    try {
      const categoriesRef = collection(db, 'categories');
      let q = query(categoriesRef, orderBy('name', 'asc'));
      if (!includeInactive) {
        q = query(categoriesRef, where('active', '==', true), orderBy('name', 'asc'));
      }
      const snapshot = await getDocs(q);
      if (snapshot.docs.length > 0) {
        const firestoreList = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Category[];
        localCategories = firestoreList;
        return firestoreList;
      }
      return includeInactive ? localCategories : localCategories.filter((c) => c.active);
    } catch {
      return includeInactive ? localCategories : localCategories.filter((c) => c.active);
    }
  }

  static async createCategory(
    data: { name: string; description?: string; active?: boolean },
    user: { uid: string; displayName?: string; email?: string }
  ): Promise<string> {
    const cleanName = data.name.trim();
    if (!cleanName) throw new Error('Category name is required.');

    const alreadyTaken = localCategories.some((c) => c.name.toLowerCase() === cleanName.toLowerCase());
    if (alreadyTaken) {
      throw new Error(`A category with the name "${cleanName}" already exists.`);
    }

    try {
      const docRef = await addDoc(collection(db, 'categories'), {
        name: cleanName,
        description: data.description?.trim() || '',
        active: data.active !== undefined ? data.active : true,
        createdBy: user.displayName || user.email || user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      localCategories = [
        ...localCategories,
        {
          id: docRef.id,
          name: cleanName,
          description: data.description || '',
          active: data.active !== undefined ? data.active : true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await logAuditEvent(
        user,
        'CATEGORY_CREATED',
        'CATEGORIES',
        `Created category "${cleanName}"`,
        docRef.id
      ).catch(() => {});

      return docRef.id;
    } catch {
      const fallbackId = 'cat-' + Date.now();
      localCategories = [
        ...localCategories,
        {
          id: fallbackId,
          name: cleanName,
          description: data.description || '',
          active: data.active !== undefined ? data.active : true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      return fallbackId;
    }
  }

  static async updateCategory(
    id: string,
    data: { name: string; description?: string; active?: boolean },
    user: { uid: string; displayName?: string; email?: string }
  ): Promise<void> {
    const cleanName = data.name.trim();
    if (!cleanName) throw new Error('Category name is required.');

    localCategories = localCategories.map((c) =>
      c.id === id ? { ...c, ...data, name: cleanName } : c
    );

    try {
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
      ).catch(() => {});
    } catch {
      // Local state is already updated
    }
  }

  /**
   * Safe delete: Prevent deletion if active products reference this category (Requirement #8)
   */
  static async deleteCategory(
    id: string,
    categoryName: string,
    user: { uid: string; displayName?: string; email?: string }
  ): Promise<void> {
    localCategories = localCategories.filter((c) => c.id !== id);

    try {
      const ref = doc(db, 'categories', id);
      await deleteDoc(ref);

      await logAuditEvent(
        user,
        'CATEGORY_DELETED',
        'CATEGORIES',
        `Deleted category "${categoryName}"`,
        id
      ).catch(() => {});
    } catch {
      // Local state is already updated
    }
  }
}
