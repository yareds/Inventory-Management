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

export class ProductService {
  /**
   * Check if an SKU is already used by another active or inactive product
   */
  static async isSkuTaken(sku: string, excludeProductId?: string): Promise<boolean> {
    const productsRef = collection(db, 'products');
    const q = query(productsRef, where('sku', '==', sku.trim().toUpperCase()));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return false;
    if (!excludeProductId) return true;
    return snapshot.docs.some((doc) => doc.id !== excludeProductId);
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
      return snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Product[];
    } catch (err) {
      console.error('Failed to get products:', err);
      return [];
    }
  }

  /**
   * Get single product by ID
   */
  static async getProductById(id: string): Promise<Product | null> {
    try {
      const docRef = doc(db, 'products', id);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() } as Product;
    } catch (err) {
      console.error(`Failed to fetch product ${id}:`, err);
      return null;
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

    const docRef = await addDoc(collection(db, 'products'), docData);

    await logAuditEvent(
      user,
      'PRODUCT_CREATED',
      'PRODUCTS',
      `Created product "${data.name}" (${cleanSku})`,
      docRef.id,
      { sku: cleanSku, name: data.name, initialStock: data.currentStock }
    );

    if (data.currentStock <= data.reorderLevel) {
      await triggerLowStockNotification(docRef.id, data.name, data.currentStock, data.reorderLevel);
    }

    return docRef.id;
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
    );
  }

  /**
   * Soft deactivate product (Requirement #7)
   */
  static async deactivateProduct(
    id: string,
    user: { uid: string; displayName?: string; email?: string }
  ): Promise<void> {
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
    );
  }

  /**
   * Delete or archive a product
   */
  static async deleteProduct(
    id: string,
    user: { uid: string; displayName?: string; email?: string }
  ): Promise<void> {
    const docRef = doc(db, 'products', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;
    const prod = snap.data() as Product;

    // Check if product has active inventory
    if (prod.currentStock > 0) {
      // Soft-deactivate instead of deleting to preserve inventory accounting
      await this.deactivateProduct(id, user);
      return;
    }

    await deleteDoc(docRef);
    await logAuditEvent(
      user,
      'PRODUCT_DELETED',
      'PRODUCTS',
      `Deleted product "${prod.name}" (${prod.sku})`,
      id
    );
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
      return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as InventoryTransaction[];
    } catch (err) {
      console.error('Failed to get product movement history:', err);
      // Fallback if composite index is pending: fetch without where/order or in-memory filter
      const fallbackSnap = await getDocs(
        query(collection(db, 'inventoryTransactions'), limit(100))
      );
      const allTxns = fallbackSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as InventoryTransaction[];
      return allTxns
        .filter((t) => t.productId === productId)
        .sort((a, b) => {
          const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime();
          const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime();
          return tb - ta;
        });
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
