import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from '../lib/firestoreFacade';
import type { Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  InventoryTransaction,
  StockInItem,
  StockInRecord,
  StockOutItem,
  StockOutRecord,
  StockAdjustment,
  Product,
} from '../types';
import { roundToTwoDecimals, generateReferenceId, calculateStockStatus } from '../lib/utils';
import { triggerLowStockNotification } from './notificationService';
import { logAuditEvent } from './auditService';
import { DEMO_TRANSACTIONS } from '../lib/demoData';

export interface UserContext {
  uid: string;
  displayName: string;
  email: string;
}

export class InventoryService {
  /**
   * Receive stock (Stock In) for multiple products atomically.
   */
  static async receiveStock(
    data: {
      referenceNumber?: string;
      supplierId?: string;
      supplierName?: string;
      date?: string;
      items: StockInItem[];
      notes?: string;
    },
    user: UserContext
  ): Promise<{ stockInId: string; referenceNumber: string }> {
    if (!data.items || data.items.length === 0) {
      throw new Error('Please add at least one product to receive.');
    }

    const referenceNumber = data.referenceNumber?.trim() || generateReferenceId('REC');

    return await runTransaction(db, async (transaction) => {
      // 1. Read all product docs to verify current stock
      const productDocs: { docRef: any; product: Product }[] = [];
      for (const item of data.items) {
        const productRef = doc(db, 'products', item.productId);
        const productSnap = await transaction.get(productRef);
        if (!productSnap.exists()) {
          throw new Error(`Product ${item.productName || item.sku} no longer exists.`);
        }
        productDocs.push({
          docRef: productRef,
          product: { id: productSnap.id, ...productSnap.data() } as Product,
        });
      }

      // 2. Perform updates and record transactions
      let calculatedTotalCost = 0;
      const stockInItems: StockInItem[] = [];

      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        const { docRef, product } = productDocs[i];

        if (item.quantity <= 0) {
          throw new Error(`Invalid quantity for ${product.name}. Must be greater than 0.`);
        }

        const previousStock = Number(product.currentStock) || 0;
        const newStock = previousStock + Number(item.quantity);
        const unitCost = Number(item.unitCost) || Number(product.purchasePrice) || 0;
        const itemTotal = roundToTwoDecimals(item.quantity * unitCost);
        calculatedTotalCost = roundToTwoDecimals(calculatedTotalCost + itemTotal);

        stockInItems.push({
          productId: product.id!,
          productName: product.name,
          sku: product.sku,
          quantity: item.quantity,
          unitCost,
          totalCost: itemTotal,
        });

        // Update product stock
        transaction.update(docRef, {
          currentStock: newStock,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        });

        // Create immutable transaction entry
        const txnRef = doc(collection(db, 'inventoryTransactions'));
        const txnId = txnRef.id;
        const txnData: InventoryTransaction = {
          transactionId: txnId,
          type: 'STOCK_IN',
          productId: product.id!,
          productName: product.name,
          sku: product.sku,
          quantity: item.quantity,
          previousStock,
          newStock,
          unitCost,
          totalValue: itemTotal,
          referenceNumber,
          supplierId: data.supplierId || product.supplierId || '',
          notes: data.notes || '',
          createdBy: user.displayName || user.email,
          createdAt: serverTimestamp(),
        };
        transaction.set(txnRef, txnData);
      }

      // 3. Create StockIn record
      const stockInRef = doc(collection(db, 'stockIn'));
      const stockInRecord: StockInRecord = {
        referenceNumber,
        supplierId: data.supplierId || '',
        supplierName: data.supplierName || '',
        date: data.date || new Date().toISOString().split('T')[0],
        items: stockInItems,
        totalCost: calculatedTotalCost,
        notes: data.notes || '',
        createdBy: user.displayName || user.email,
        createdAt: serverTimestamp(),
      };
      transaction.set(stockInRef, stockInRecord);

      return { stockInId: stockInRef.id, referenceNumber };
    }).then(async (result) => {
      // Post-transaction notifications and audits
      await logAuditEvent(
        user,
        'STOCK_RECEIVED',
        'INVENTORY',
        `Stock received under ${result.referenceNumber} (${data.items.length} items)`,
        result.stockInId,
        { referenceNumber: result.referenceNumber, itemCount: data.items.length }
      );

      // Check stock status alerts
      for (const item of data.items) {
        // Fetch latest to check if still below reorder
        try {
          const pRef = doc(db, 'products', item.productId);
          const snap = await getDocs(query(collection(db, 'products'), where('__name__', '==', item.productId)));
          if (!snap.empty) {
            const p = snap.docs[0].data() as Product;
            if (p.currentStock <= p.reorderLevel) {
              await triggerLowStockNotification(item.productId, p.name, p.currentStock, p.reorderLevel);
            }
          }
        } catch {
          // Non-critical
        }
      }

      return result;
    });
  }

  /**
   * Issue stock (Stock Out) with strict inventory availability checks.
   */
  static async issueStock(
    data: {
      referenceNumber?: string;
      customerName?: string;
      date?: string;
      items: StockOutItem[];
      notes?: string;
    },
    user: UserContext
  ): Promise<{ stockOutId: string; referenceNumber: string }> {
    if (!data.items || data.items.length === 0) {
      throw new Error('Please add at least one product to issue.');
    }

    const referenceNumber = data.referenceNumber?.trim() || generateReferenceId('ISS');

    return await runTransaction(db, async (transaction) => {
      // 1. Read all product docs to verify availability
      const productDocs: { docRef: any; product: Product }[] = [];
      for (const item of data.items) {
        const productRef = doc(db, 'products', item.productId);
        const productSnap = await transaction.get(productRef);
        if (!productSnap.exists()) {
          throw new Error(`Product ${item.productName || item.sku} does not exist.`);
        }
        const product = { id: productSnap.id, ...productSnap.data() } as Product;

        if (item.quantity <= 0) {
          throw new Error(`Invalid quantity for ${product.name}. Must be greater than 0.`);
        }

        const currentStock = Number(product.currentStock) || 0;
        if (item.quantity > currentStock) {
          throw new Error(
            `Insufficient stock for "${product.name}". Only ${currentStock} unit${currentStock === 1 ? '' : 's'} available, but ${item.quantity} requested.`
          );
        }

        productDocs.push({ docRef: productRef, product });
      }

      // 2. Perform updates and record transactions
      const stockOutItems: StockOutItem[] = [];
      const lowStockAlertItems: { id: string; name: string; currentStock: number; reorderLevel: number }[] = [];

      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        const { docRef, product } = productDocs[i];

        const previousStock = Number(product.currentStock) || 0;
        const newStock = previousStock - Number(item.quantity);
        const unitPrice = Number(item.unitPrice) || Number(product.sellingPrice) || 0;
        const itemTotal = roundToTwoDecimals(item.quantity * unitPrice);

        stockOutItems.push({
          productId: product.id!,
          productName: product.name,
          sku: product.sku,
          quantity: item.quantity,
          unitPrice,
          totalValue: itemTotal,
        });

        // Update product stock
        transaction.update(docRef, {
          currentStock: newStock,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        });

        // Record immutable transaction
        const txnRef = doc(collection(db, 'inventoryTransactions'));
        const txnId = txnRef.id;
        const txnData: InventoryTransaction = {
          transactionId: txnId,
          type: 'STOCK_OUT',
          productId: product.id!,
          productName: product.name,
          sku: product.sku,
          quantity: -item.quantity,
          previousStock,
          newStock,
          unitCost: product.purchasePrice || 0,
          totalValue: itemTotal,
          referenceNumber,
          customerName: data.customerName || '',
          notes: data.notes || '',
          createdBy: user.displayName || user.email,
          createdAt: serverTimestamp(),
        };
        transaction.set(txnRef, txnData);

        if (newStock <= product.reorderLevel) {
          lowStockAlertItems.push({
            id: product.id!,
            name: product.name,
            currentStock: newStock,
            reorderLevel: product.reorderLevel,
          });
        }
      }

      // 3. Create StockOut record
      const stockOutRef = doc(collection(db, 'stockOut'));
      const stockOutRecord: StockOutRecord = {
        referenceNumber,
        customerName: data.customerName || '',
        date: data.date || new Date().toISOString().split('T')[0],
        items: stockOutItems,
        notes: data.notes || '',
        createdBy: user.displayName || user.email,
        createdAt: serverTimestamp(),
      };
      transaction.set(stockOutRef, stockOutRecord);

      return {
        stockOutId: stockOutRef.id,
        referenceNumber,
        lowStockAlertItems,
      };
    }).then(async (result) => {
      // Audit log
      await logAuditEvent(
        user,
        'STOCK_ISSUED',
        'INVENTORY',
        `Stock issued under ${result.referenceNumber} to ${data.customerName || 'Customer'} (${data.items.length} items)`,
        result.stockOutId,
        { referenceNumber: result.referenceNumber, customer: data.customerName }
      );

      // Low stock notifications
      for (const item of result.lowStockAlertItems) {
        await triggerLowStockNotification(item.id, item.name, item.currentStock, item.reorderLevel);
      }

      return { stockOutId: result.stockOutId, referenceNumber: result.referenceNumber };
    });
  }

  /**
   * Adjust inventory stock (corrections, physical inventory discrepancies, damaged goods)
   */
  static async adjustStock(
    data: {
      productId: string;
      actualQuantity: number;
      reason: string;
      notes?: string;
    },
    user: UserContext
  ): Promise<{ adjustmentId: string }> {
    if (data.actualQuantity < 0) {
      throw new Error('Actual quantity cannot be negative.');
    }
    if (!data.reason?.trim()) {
      throw new Error('Please specify a reason for the adjustment.');
    }

    return await runTransaction(db, async (transaction) => {
      const productRef = doc(db, 'products', data.productId);
      const productSnap = await transaction.get(productRef);
      if (!productSnap.exists()) {
        throw new Error('Product not found.');
      }
      const product = { id: productSnap.id, ...productSnap.data() } as Product;

      const systemQuantity = Number(product.currentStock) || 0;
      const actualQuantity = Number(data.actualQuantity);
      const difference = actualQuantity - systemQuantity;

      if (difference === 0) {
        throw new Error('Actual quantity is identical to the system quantity. No adjustment needed.');
      }

      // Update product currentStock
      transaction.update(productRef, {
        currentStock: actualQuantity,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });

      // Create StockAdjustment record
      const adjRef = doc(collection(db, 'stockAdjustments'));
      const adjustmentRecord: StockAdjustment = {
        productId: product.id!,
        productName: product.name,
        sku: product.sku,
        systemQuantity,
        actualQuantity,
        difference,
        reason: data.reason.trim(),
        notes: data.notes || '',
        createdBy: user.displayName || user.email,
        createdAt: serverTimestamp(),
      };
      transaction.set(adjRef, adjustmentRecord);

      // Create immutable transaction record
      const txnRef = doc(collection(db, 'inventoryTransactions'));
      const txnId = txnRef.id;
      const txnData: InventoryTransaction = {
        transactionId: txnId,
        type: 'ADJUSTMENT',
        productId: product.id!,
        productName: product.name,
        sku: product.sku,
        quantity: difference,
        previousStock: systemQuantity,
        newStock: actualQuantity,
        unitCost: product.purchasePrice || 0,
        totalValue: roundToTwoDecimals(Math.abs(difference) * (product.purchasePrice || 0)),
        reason: data.reason,
        notes: data.notes || '',
        createdBy: user.displayName || user.email,
        createdAt: serverTimestamp(),
      };
      transaction.set(txnRef, txnData);

      return {
        adjustmentId: adjRef.id,
        product,
        actualQuantity,
        difference,
      };
    }).then(async (result) => {
      await logAuditEvent(
        user,
        'STOCK_ADJUSTED',
        'INVENTORY',
        `Adjusted ${result.product.name} from ${result.product.currentStock} to ${result.actualQuantity} (${result.difference > 0 ? '+' : ''}${result.difference}). Reason: ${data.reason}`,
        result.adjustmentId,
        { difference: result.difference, reason: data.reason }
      );

      if (result.actualQuantity <= result.product.reorderLevel) {
        await triggerLowStockNotification(
          result.product.id!,
          result.product.name,
          result.actualQuantity,
          result.product.reorderLevel
        );
      }

      return { adjustmentId: result.adjustmentId };
    });
  }

  /**
   * Fetch recent movement history with optional filters
   */
  static async getMovementHistory(
    filters?:
      | {
          productId?: string;
          type?: string;
          maxCount?: number;
        }
      | number
  ): Promise<InventoryTransaction[]> {
    try {
      const opts = typeof filters === 'number' ? { maxCount: filters } : filters;
      const limitCount = opts?.maxCount || 50;
      const txnsRef = collection(db, 'inventoryTransactions');
      let q = query(txnsRef, orderBy('createdAt', 'desc'), limit(limitCount));

      if (opts?.productId) {
        q = query(
          txnsRef,
          where('productId', '==', opts.productId),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
      } else if (opts?.type && opts.type !== 'ALL') {
        q = query(
          txnsRef,
          where('type', '==', opts.type),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
      }

      const snapshot = await getDocs(q);
      if (snapshot.docs.length > 0) {
        return snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as InventoryTransaction[];
      }
      return DEMO_TRANSACTIONS;
    } catch {
      return DEMO_TRANSACTIONS;
    }
  }

  /**
   * Fetch recent stock in records
   */
  static async getRecentStockIn(maxCount: number = 10): Promise<StockInRecord[]> {
    try {
      const q = query(collection(db, 'stockIn'), orderBy('createdAt', 'desc'), limit(maxCount));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as StockInRecord[];
    } catch (err) {
      console.error('Failed to get recent stock in:', err);
      return [];
    }
  }

  /**
   * Fetch recent stock out records
   */
  static async getRecentStockOut(maxCount: number = 10): Promise<StockOutRecord[]> {
    try {
      const q = query(collection(db, 'stockOut'), orderBy('createdAt', 'desc'), limit(maxCount));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as StockOutRecord[];
    } catch (err) {
      console.error('Failed to get recent stock out:', err);
      return [];
    }
  }

  /**
   * Fetch recent physical stock adjustments
   */
  static async getRecentAdjustments(maxCount: number = 10): Promise<StockAdjustment[]> {
    try {
      const q = query(collection(db, 'stockAdjustments'), orderBy('createdAt', 'desc'), limit(maxCount));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as StockAdjustment[];
    } catch (err) {
      console.error('Failed to get recent adjustments:', err);
      return [];
    }
  }
}
