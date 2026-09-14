import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Supplier, StockInRecord } from '../types';
import { logAuditEvent } from './auditService';

export class SupplierService {
  static async getSuppliers(includeInactive: boolean = true): Promise<Supplier[]> {
    try {
      const suppliersRef = collection(db, 'suppliers');
      let q = query(suppliersRef, orderBy('name', 'asc'));
      if (!includeInactive) {
        q = query(suppliersRef, where('active', '==', true), orderBy('name', 'asc'));
      }
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Supplier[];
    } catch (err) {
      console.error('Failed to get suppliers:', err);
      return [];
    }
  }

  static async getSupplierById(id: string): Promise<Supplier | null> {
    try {
      const ref = doc(db, 'suppliers', id);
      const snap = await getDoc(ref);
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() } as Supplier;
    } catch (err) {
      console.error(`Failed to get supplier ${id}:`, err);
      return null;
    }
  }

  static async createSupplier(
    data: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>,
    user: { uid: string; displayName?: string; email?: string }
  ): Promise<string> {
    const cleanName = data.name.trim();
    if (!cleanName) throw new Error('Supplier name is required.');

    const docRef = await addDoc(collection(db, 'suppliers'), {
      name: cleanName,
      contactPerson: data.contactPerson?.trim() || '',
      phone: data.phone?.trim() || '',
      email: data.email?.trim() || '',
      address: data.address?.trim() || '',
      website: data.website?.trim() || '',
      notes: data.notes?.trim() || '',
      active: data.active !== false,
      createdBy: user.displayName || user.email || user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await logAuditEvent(
      user,
      'SUPPLIER_CREATED',
      'SUPPLIERS',
      `Created supplier "${cleanName}"`,
      docRef.id
    );

    return docRef.id;
  }

  static async updateSupplier(
    id: string,
    data: Partial<Supplier>,
    user: { uid: string; displayName?: string; email?: string }
  ): Promise<void> {
    const ref = doc(db, 'suppliers', id);
    const { id: _id, createdAt: _ca, ...updates } = data as any;

    await updateDoc(ref, {
      ...updates,
      updatedAt: serverTimestamp(),
      updatedBy: user.displayName || user.email || user.uid,
    });

    await logAuditEvent(
      user,
      'SUPPLIER_UPDATED',
      'SUPPLIERS',
      `Updated supplier ID: ${id}`,
      id
    );
  }

  static async getSupplierStockInHistory(supplierId: string): Promise<StockInRecord[]> {
    try {
      const q = query(
        collection(db, 'stockIn'),
        where('supplierId', '==', supplierId),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as StockInRecord[];
    } catch (err) {
      console.error('Failed to get supplier stock in history:', err);
      return [];
    }
  }
}
