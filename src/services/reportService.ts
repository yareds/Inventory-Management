import { Product, InventoryTransaction, Category, Supplier } from '../types';
import { roundToTwoDecimals, formatDate, calculateStockStatus } from '../lib/utils';

export interface ReportFilterOptions {
  reportType:
    | 'INVENTORY'
    | 'MOVEMENT'
    | 'LOW_STOCK'
    | 'OUT_OF_STOCK'
    | 'VALUATION'
    | 'SUPPLIER'
    | 'PRODUCT_MOVEMENT';
  categoryId?: string;
  supplierId?: string;
  productId?: string;
  startDate?: string;
  endDate?: string;
  transactionType?: string;
}

export class ReportService {
  /**
   * Filter and aggregate data based on report configuration
   */
  static generateReportData(
    options: ReportFilterOptions,
    products: Product[],
    transactions: InventoryTransaction[],
    categories: Category[],
    suppliers: Supplier[]
  ) {
    switch (options.reportType) {
      case 'INVENTORY':
      case 'VALUATION': {
        let filtered = [...products];
        if (options.categoryId && options.categoryId !== 'ALL') {
          filtered = filtered.filter((p) => p.categoryId === options.categoryId);
        }
        if (options.supplierId && options.supplierId !== 'ALL') {
          filtered = filtered.filter((p) => p.supplierId === options.supplierId);
        }
        return filtered.map((p) => {
          const status = calculateStockStatus(p.currentStock, p.reorderLevel, p.maximumStock);
          const inventoryVal = roundToTwoDecimals(p.currentStock * p.purchasePrice);
          const retailVal = roundToTwoDecimals(p.currentStock * p.sellingPrice);
          const margin = p.sellingPrice > 0
            ? roundToTwoDecimals(((p.sellingPrice - p.purchasePrice) / p.sellingPrice) * 100)
            : 0;
          return {
            SKU: p.sku,
            Product: p.name,
            Category: p.categoryName || 'Uncategorized',
            'Current Stock': p.currentStock,
            Unit: p.unit,
            'Purchase Price': p.purchasePrice,
            'Selling Price': p.sellingPrice,
            'Inventory Value': inventoryVal,
            'Retail Value': retailVal,
            'Margin %': `${margin}%`,
            Status: status,
            Active: p.active ? 'Yes' : 'No',
          };
        });
      }

      case 'LOW_STOCK': {
        const filtered = products.filter(
          (p) => p.active && p.currentStock > 0 && p.currentStock <= p.reorderLevel
        );
        return filtered.map((p) => ({
          SKU: p.sku,
          Product: p.name,
          Category: p.categoryName,
          'Current Stock': p.currentStock,
          'Reorder Level': p.reorderLevel,
          Deficit: p.reorderLevel - p.currentStock,
          'Supplier Name': p.supplierName || 'N/A',
          'Unit Cost': p.purchasePrice,
          'Estimated Reorder Cost': roundToTwoDecimals((p.reorderLevel - p.currentStock) * p.purchasePrice),
        }));
      }

      case 'OUT_OF_STOCK': {
        const filtered = products.filter((p) => p.active && p.currentStock <= 0);
        return filtered.map((p) => ({
          SKU: p.sku,
          Product: p.name,
          Category: p.categoryName,
          'Reorder Level': p.reorderLevel,
          'Supplier Name': p.supplierName || 'N/A',
          'Purchase Price': p.purchasePrice,
          'Selling Price': p.sellingPrice,
        }));
      }

      case 'MOVEMENT':
      case 'PRODUCT_MOVEMENT': {
        let list = [...transactions];
        if (options.productId && options.productId !== 'ALL') {
          list = list.filter((t) => t.productId === options.productId);
        }
        if (options.transactionType && options.transactionType !== 'ALL') {
          list = list.filter((t) => t.type === options.transactionType);
        }
        if (options.startDate) {
          const start = new Date(options.startDate).getTime();
          list = list.filter((t) => {
            const d = t.createdAt?.toDate ? t.createdAt.toDate().getTime() : new Date(t.createdAt).getTime();
            return d >= start;
          });
        }
        if (options.endDate) {
          const end = new Date(options.endDate).getTime() + 86400000;
          list = list.filter((t) => {
            const d = t.createdAt?.toDate ? t.createdAt.toDate().getTime() : new Date(t.createdAt).getTime();
            return d <= end;
          });
        }
        return list.map((t) => ({
          Date: formatDate(t.createdAt),
          'Transaction ID': t.transactionId || t.id,
          Type: t.type,
          Product: t.productName,
          SKU: t.sku,
          Quantity: t.quantity,
          'Previous Stock': t.previousStock,
          'New Stock': t.newStock,
          'Total Value': t.totalValue,
          Reference: t.referenceNumber || 'N/A',
          Party: t.customerName || t.supplierId || 'N/A',
          Reason: t.reason || t.notes || '—',
          User: t.createdBy,
        }));
      }

      case 'SUPPLIER': {
        return suppliers.map((s) => {
          const supplierProducts = products.filter((p) => p.supplierId === s.id);
          const totalStock = supplierProducts.reduce((acc, p) => acc + (p.currentStock || 0), 0);
          const totalVal = supplierProducts.reduce((acc, p) => acc + (p.currentStock * p.purchasePrice), 0);
          return {
            'Supplier Name': s.name,
            'Contact Person': s.contactPerson || '—',
            Phone: s.phone || '—',
            Email: s.email || '—',
            'Active Products Supplied': supplierProducts.length,
            'Total Stock on Hand': totalStock,
            'Inventory Value': roundToTwoDecimals(totalVal),
            Status: s.active ? 'Active' : 'Inactive',
          };
        });
      }

      default:
        return [];
    }
  }

  /**
   * Export array of objects to standard CSV file format
   */
  static exportToCSV(filename: string, rows: Record<string, any>[]): void {
    if (!rows || !rows.length) {
      alert('No data available to export.');
      return;
    }

    const separator = ',';
    const keys = Object.keys(rows[0]);
    const csvContent =
      keys.join(separator) +
      '\n' +
      rows
        .map((row) => {
          return keys
            .map((k) => {
              let cell = row[k] === null || row[k] === undefined ? '' : row[k];
              cell = cell instanceof Date ? cell.toLocaleString() : cell.toString();
              cell = cell.replace(/"/g, '""');
              if (cell.search(/("|,|\n)/g) >= 0) {
                cell = `"${cell}"`;
              }
              return cell;
            })
            .join(separator);
        })
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }
}
