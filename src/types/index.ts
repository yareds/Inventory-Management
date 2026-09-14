import { Timestamp } from 'firebase/firestore';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'STAFF';

export interface AppUser {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  photoURL?: string;
  active: boolean;
  createdAt: Timestamp | any;
  updatedAt: Timestamp | any;
}

export type StockStatus = 'OUT_OF_STOCK' | 'CRITICAL' | 'LOW_STOCK' | 'IN_STOCK' | 'OVERSTOCKED';

export interface Product {
  id?: string;
  sku: string;
  name: string;
  description?: string;
  categoryId: string;
  categoryName: string;
  brand?: string;
  supplierId?: string;
  supplierName?: string;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  currentStock: number;
  minimumStock: number;
  reorderLevel: number;
  maximumStock: number;
  barcode?: string;
  imageUrl?: string;
  active: boolean;
  createdAt: Timestamp | any;
  updatedAt: Timestamp | any;
  createdBy?: string;
  updatedBy?: string;
}

export interface Category {
  id?: string;
  name: string;
  description?: string;
  active: boolean;
  createdAt: Timestamp | any;
  updatedAt: Timestamp | any;
  createdBy?: string;
  updatedBy?: string;
}

export interface Supplier {
  id?: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  notes?: string;
  active: boolean;
  createdAt: Timestamp | any;
  updatedAt: Timestamp | any;
  createdBy?: string;
  updatedBy?: string;
}

export type TransactionType = 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT' | 'RETURN' | 'TRANSFER';

export interface InventoryTransaction {
  id?: string;
  transactionId: string;
  type: TransactionType;
  productId: string;
  productName: string;
  sku: string;
  quantity: number; // positive for additions, negative for reductions
  previousStock: number;
  newStock: number;
  unitCost: number;
  totalValue: number;
  referenceNumber?: string;
  supplierId?: string;
  customerName?: string;
  reason?: string;
  notes?: string;
  createdBy: string;
  createdAt: Timestamp | any;
}

export interface StockInItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface StockInRecord {
  id?: string;
  referenceNumber: string;
  supplierId?: string;
  supplierName?: string;
  date: string;
  items: StockInItem[];
  totalCost: number;
  notes?: string;
  createdBy: string;
  createdAt: Timestamp | any;
}

export interface StockOutItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
}

export interface StockOutRecord {
  id?: string;
  referenceNumber: string;
  customerName?: string;
  date: string;
  items: StockOutItem[];
  notes?: string;
  createdBy: string;
  createdAt: Timestamp | any;
}

export interface StockAdjustment {
  id?: string;
  productId: string;
  productName: string;
  sku: string;
  systemQuantity: number;
  actualQuantity: number;
  difference: number;
  reason: string;
  notes?: string;
  createdBy: string;
  createdAt: Timestamp | any;
}

export type StockAdjustmentRecord = StockAdjustment;

export interface NotificationItem {
  id?: string;
  userId?: string;
  type: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'SYSTEM' | 'STOCK_IN';
  title: string;
  message: string;
  productId?: string;
  read: boolean;
  createdAt: Timestamp | any;
}

export interface AuditLog {
  id?: string;
  userId: string;
  userName: string;
  userEmail?: string;
  action: string;
  module: 'PRODUCTS' | 'CATEGORIES' | 'SUPPLIERS' | 'INVENTORY' | 'USERS' | 'SETTINGS' | 'SYSTEM' | string;
  recordId?: string;
  entityId?: string;
  description: string;
  metadata?: Record<string, any>;
  createdAt?: Timestamp | any;
  timestamp?: Timestamp | any;
}

export interface SystemSettings {
  businessName: string;
  businessLogo?: string;
  currency: string;
  currencySymbol: string;
  dateFormat: string;
  defaultReorderLevel: number;
  allowNegativeInventory: boolean;
  lowStockAlertsEnabled: boolean;
  emailAlerts: boolean;
  updatedAt?: Timestamp | any;
  updatedBy?: string;
}
