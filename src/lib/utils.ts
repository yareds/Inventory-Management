import { StockStatus } from '../types';

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Robust financial calculations to prevent floating point imprecision
 */
export function roundToTwoDecimals(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function formatCurrency(amount: number | undefined | null, symbol: string = '$'): string {
  if (amount === undefined || amount === null || isNaN(amount)) return `${symbol}0.00`;
  const rounded = roundToTwoDecimals(amount);
  return `${symbol}${rounded.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(timestamp: any): string {
  if (!timestamp) return '—';
  try {
    // Firestore Timestamp
    if (typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    // String date
    if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      const d = new Date(timestamp);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    }
    return String(timestamp);
  } catch {
    return '—';
  }
}

export function formatDateShort(timestamp: any): string {
  if (!timestamp) return '—';
  try {
    if (typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
    const d = new Date(timestamp);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
    return String(timestamp);
  } catch {
    return '—';
  }
}

/**
 * Standard business rule for calculating stock status
 * Requirement #14:
 * OUT_OF_STOCK: currentStock = 0
 * CRITICAL: currentStock > 0 && currentStock <= (reorderLevel / 2)
 * LOW_STOCK: currentStock <= reorderLevel
 * OVERSTOCKED: currentStock > maximumStock
 * IN_STOCK: currentStock > reorderLevel and currentStock <= maximumStock
 */
export function calculateStockStatus(
  currentStock: number,
  reorderLevel: number = 10,
  maximumStock: number = 1000
): StockStatus {
  if (currentStock <= 0) {
    return 'OUT_OF_STOCK';
  }
  if (reorderLevel > 0 && currentStock <= Math.max(1, Math.floor(reorderLevel * 0.35))) {
    return 'CRITICAL';
  }
  if (currentStock <= reorderLevel) {
    return 'LOW_STOCK';
  }
  if (maximumStock > 0 && currentStock > maximumStock) {
    return 'OVERSTOCKED';
  }
  return 'IN_STOCK';
}

export function generateReferenceId(prefix: string = 'REF'): string {
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${dateStr}-${rand}`;
}
