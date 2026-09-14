import React from 'react';
import { StockStatus, TransactionType, UserRole } from '../../types';

export function StockStatusBadge({ status }: { status: StockStatus }) {
  const configs: Record<
    StockStatus,
    { label: string; bg: string; text: string; dot: string }
  > = {
    IN_STOCK: {
      label: 'IN STOCK',
      bg: 'bg-green-100 border-green-200',
      text: 'text-green-700',
      dot: 'bg-green-500',
    },
    LOW_STOCK: {
      label: 'LOW STOCK',
      bg: 'bg-amber-100 border-amber-200',
      text: 'text-amber-800',
      dot: 'bg-amber-500',
    },
    CRITICAL: {
      label: 'CRITICAL',
      bg: 'bg-red-100 border-red-200',
      text: 'text-red-700',
      dot: 'bg-red-500',
    },
    OUT_OF_STOCK: {
      label: 'OUT OF STOCK',
      bg: 'bg-red-100 border-red-300',
      text: 'text-red-800',
      dot: 'bg-red-600',
    },
    OVERSTOCKED: {
      label: 'OVERSTOCKED',
      bg: 'bg-blue-100 border-blue-200',
      text: 'text-blue-700',
      dot: 'bg-blue-500',
    },
  };

  const config = configs[status] || configs.IN_STOCK;

  return (
    <span
      id={`stock-status-${status.toLowerCase()}`}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${config.bg} ${config.text} whitespace-nowrap tracking-wider`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

export function TransactionTypeBadge({ type }: { type: TransactionType }) {
  const configs: Record<TransactionType, { label: string; bg: string }> = {
    STOCK_IN: { label: 'STOCK IN', bg: 'bg-green-100 text-green-700 border-green-200' },
    STOCK_OUT: { label: 'STOCK OUT', bg: 'bg-red-100 text-red-700 border-red-200' },
    ADJUSTMENT: { label: 'ADJUSTMENT', bg: 'bg-blue-100 text-blue-700 border-blue-200' },
    RETURN: { label: 'RETURN', bg: 'bg-purple-100 text-purple-700 border-purple-200' },
    TRANSFER: { label: 'TRANSFER', bg: 'bg-slate-100 text-slate-700 border-slate-200' },
  };

  const config = configs[type] || { label: type, bg: 'bg-gray-100 text-gray-800 border-gray-200' };

  return (
    <span
      id={`txn-type-${type.toLowerCase()}`}
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${config.bg} whitespace-nowrap tracking-wider`}
    >
      {config.label}
    </span>
  );
}

export function RoleBadge({ role }: { role: UserRole }) {
  const configs: Record<UserRole, { label: string; bg: string }> = {
    SUPER_ADMIN: { label: 'SUPER_ADMIN', bg: 'bg-purple-100 text-purple-700 border-purple-200' },
    ADMIN: { label: 'ADMIN', bg: 'bg-blue-100 text-blue-700 border-blue-200' },
    STAFF: { label: 'STAFF', bg: 'bg-slate-100 text-slate-600 border-slate-200' },
  };

  const config = configs[role] || { label: role, bg: 'bg-gray-100 text-gray-700 border-gray-200' };

  return (
    <span
      id={`user-role-${role.toLowerCase()}`}
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${config.bg} whitespace-nowrap tracking-wider`}
    >
      {config.label}
    </span>
  );
}
