import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  limit,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { Product, InventoryTransaction } from '../types';
import { logAuditEvent } from './auditService';
import { triggerLowStockNotification } from './notificationService';
import { DEMO_PRODUCTS, DEMO_TRANSACTIONS } from '../lib/demoData';

let localProducts: Product[] = [...DEMO_PRODUCTS];

export class ProductService {
  /**
   * Check if an SKU is already used by another active or inactive product
   */
  static async isSkuTaken(sku: string, excludeProductId?: string): Promise<boolean> {
    const clean = sku.trim().toUpperCase();
    try {
      const productsRef = collection(db, 'products');
      const q = query(productsRef, where('sku', '==', clean));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        return localProducts.some((p) => p.sku === clean && (!excludeProductId || p.id !== excludeProductId));
      }
      if (!excludeProductId) return true;
      return snapshot.docs.some((doc) => doc.id !== excludeProductId);
    } catch {
      return localProducts.some((p) => p.sku === clean && (!excludeProductId || p.id !== excludeProductId));
    }
  }

  /**
   * Fetch products with optional active filter
   */
  static async getProducts(includeInactive: boolean = true): Promise<Product[]> {
    try {
      const productsRef = collection(db, 'products');
      let q = query(productsRef, orderBy('name', 'asc'));
      if (!includeInactive) {
        q = query(productsRef, where('active', '==', true), orderBy('name', 'asc'));
      }
      const snapshot = await getDocs(q);
      if (snapshot.docs.length > 0) {
        const firestoreList = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Product[];
        localProducts = firestoreList;
        return firestoreList;
      }
      return includeInactive ? localProducts : localProducts.filter((p) => p.active);
    } catch {
      return includeInactive ? localProducts : localProducts.filter((p) => p.active);
    }
  }

  /**
   * Get single product by ID
   */
  static async getProductById(id: string): Promise<Product | null> {
    try {
      const docRef = doc(db, 'products', id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as Product;
      }
      return localProducts.find((p) => p.id === id) || null;
    } catch {
      return localProducts.find((p) => p.id === id) || null;
    }
  }

  /**
   * Create a new product with SKU uniqueness validation
   */
  static async createProduct(
    data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>,
    user: { uid: string; displayName?: string; email?: string }
  ): Promise<string> {
    const cleanSku = data.sku.trim().toUpperCase();
    if (!cleanSku) {
      throw new Error('Product SKU is required.');
    }
    if (!data.name.trim()) {
      throw new Error('Product name is required.');
    }
    if (!data.categoryId) {
      throw new Error('Please select a category.');
    }
    if (data.purchasePrice < 0 || data.sellingPrice < 0) {
      throw new Error('Prices cannot be negative.');
    }

    const taken = await this.isSkuTaken(cleanSku);
    if (taken) {
      throw new Error(`SKU "${cleanSku}" already exists. Please use a unique SKU.`);
    }

    const docData: any = {
      sku: cleanSku,
      name: data.name.trim(),
      description: data.description || '',
      categoryId: data.categoryId,
      categoryName: data.categoryName || '',
      brand: data.brand || '',
      supplierId: data.supplierId || '',
      supplierName: data.supplierName || '',
      unit: data.unit || 'pcs',
      purchasePrice: Number(data.purchasePrice) || 0,
      sellingPrice: Number(data.sellingPrice) || 0,
      currentStock: Number(data.currentStock) || 0,
      minimumStock: Number(data.minimumStock) || 0,
      reorderLevel: Number(data.reorderLevel) || 10,
      maximumStock: Number(data.maximumStock) || 1000,
      barcode: data.barcode || '',
      imageUrl: data.imageUrl || '',
      active: data.active !== false,
      createdBy: user.displayName || user.email || user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      const docRef = await addDoc(collection(db, 'products'), docData);

      localProducts = [
        { id: docRef.id, ...docData } as Product,
        ...localProducts.filter((p) => p.id !== docRef.id),
      ];

      await logAuditEvent(
        user,
        'PRODUCT_CREATED',
        'PRODUCTS',
        `Created product "${data.name}" (${cleanSku})`,
        docRef.id,
        { sku: cleanSku, name: data.name, initialStock: data.currentStock }
      ).catch(() => {});

      if (data.currentStock <= data.reorderLevel) {
        await triggerLowStockNotification(docRef.id, data.name, data.currentStock, data.reorderLevel).catch(() => {});
      }

      return docRef.id;
    } catch {
      const fallbackId = 'prod-' + Date.now();
      const fallbackProd: Product = {
        id: fallbackId,
        ...docData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      localProducts = [fallbackProd, ...localProducts];
      return fallbackId;
    }
  }

  /**
   * Update product details (excluding direct currentStock manipulation)
   */
  static async updateProduct(
    id: string,
    data: Partial<Product>,
    user: { uid: string; displayName?: string; email?: string }
  ): Promise<void> {
    if (data.sku) {
      const cleanSku = data.sku.trim().toUpperCase();
      const taken = await this.isSkuTaken(cleanSku, id);
      if (taken) {
        throw new Error(`SKU "${cleanSku}" already exists.`);
      }
      data.sku = cleanSku;
    }

    const { currentStock, id: _id, createdAt: _ca, ...allowedUpdates } = data as any;

    localProducts = localProducts.map((p) => (p.id === id ? { ...p, ...allowedUpdates } : p));

    try {
      const docRef = doc(db, 'products', id);
      await updateDoc(docRef, {
        ...allowedUpdates,
        updatedAt: serverTimestamp(),
        updatedBy: user.displayName || user.email || user.uid,
      });

      await logAuditEvent(
        user,
        'PRODUCT_UPDATED',
        'PRODUCTS',
        `Updated product details for ID: ${id}`,
        id,
        { fields: Object.keys(allowedUpdates) }
      ).catch(() => {});
    } catch {
      // Local state is already updated
    }
  }

  /**
   * Soft deactivate product (Requirement #7)
   */
  static async deactivateProduct(
    id: string,
    user: { uid: string; displayName?: string; email?: string }
  ): Promise<void> {
    localProducts = localProducts.map((p) => (p.id === id ? { ...p, active: false } : p));

    try {
      const docRef = doc(db, 'products', id);
      await updateDoc(docRef, {
        active: false,
        updatedAt: serverTimestamp(),
        updatedBy: user.displayName || user.email || user.uid,
      });

      await logAuditEvent(
        user,
        'PRODUCT_DEACTIVATED',
        'PRODUCTS',
        `Deactivated product ${id}`,
        id
      ).catch(() => {});
    } catch {
      // Local state is already updated
    }
  }

  /**
   * Delete or archive a product
   */
  static async deleteProduct(
    id: string,
    user: { uid: string; displayName?: string; email?: string }
  ): Promise<void> {
    const existing = localProducts.find((p) => p.id === id);
    if (existing && existing.currentStock > 0) {
      await this.deactivateProduct(id, user);
      return;
    }

    localProducts = localProducts.filter((p) => p.id !== id);

    try {
      const docRef = doc(db, 'products', id);
      await deleteDoc(docRef);
      await logAuditEvent(
        user,
        'PRODUCT_DELETED',
        'PRODUCTS',
        `Deleted product "${existing?.name || id}"`,
        id
      ).catch(() => {});
    } catch {
      // Local state is already updated
    }
  }

  /**
   * Get movement history specifically for a single product
   */
  static async getProductMovementHistory(productId: string): Promise<InventoryTransaction[]> {
    try {
      const q = query(
        collection(db, 'inventoryTransactions'),
        where('productId', '==', productId),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      const snap = await getDocs(q);
      if (snap.docs.length > 0) {
        return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as InventoryTransaction[];
      }
      return DEMO_TRANSACTIONS.filter((t) => t.productId === productId);
    } catch {
      return DEMO_TRANSACTIONS.filter((t) => t.productId === productId);
    }
  }

  /**
   * Reactivate product
   */
  static async activateProduct(
    id: string,
    user: { uid: string; displayName?: string; email?: string }
  ): Promise<void> {
    const docRef = doc(db, 'products', id);
    await updateDoc(docRef, {
      active: true,
      updatedAt: serverTimestamp(),
      updatedBy: user.displayName || user.email || user.uid,
    });

    await logAuditEvent(
      user,
      'PRODUCT_ACTIVATED',
      'PRODUCTS',
      `Reactivated product ${id}`,
      id
    );
  }

  /**
   * Upload product image to Firebase Storage with size and MIME validation
   */
  static async uploadProductImage(file: File): Promise<string> {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('Only image files (JPEG, PNG, WebP, GIF) are supported.');
    }
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Image size must be less than 5MB.');
    }

    const fileExt = file.name.split('.').pop() || 'png';
    const filePath = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const fileRef = ref(storage, filePath);

    await uploadBytes(fileRef, file, { contentType: file.type });
    return await getDownloadURL(fileRef);
  }
}
