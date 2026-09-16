import React, { useState, useEffect } from 'react';
import { History, Download, Filter, Search, Calendar } from 'lucide-react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { InventoryTransaction } from '../types';
import { DataTable, Column } from '../components/common/DataTable';
import { TransactionTypeBadge } from '../components/common/Badges';
import { SearchInput } from '../components/common/SearchInput';
import { LoadingPage } from '../components/common/LoadingState';
import { formatDate, formatCurrency } from '../lib/utils';
import { ReportService } from '../services/reportService';
import { useSettings } from '../contexts/SettingsContext';
import { DEMO_TRANSACTIONS } from '../lib/demoData';

export function MovementHistoryPage() {
  const { settings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>(DEMO_TRANSACTIONS);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, 'inventoryTransactions'), orderBy('createdAt', 'desc'), limit(150))
      );
      if (snap.docs.length > 0) {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as InventoryTransaction[];
        setTransactions(list);
      } else {
        setTransactions(DEMO_TRANSACTIONS);
      }
    } catch {
      setTransactions(DEMO_TRANSACTIONS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const filteredTransactions = transactions.filter((t) => {
    const matchSearch =
      !search ||
      t.productName.toLowerCase().includes(search.toLowerCase()) ||
      t.sku.toLowerCase().includes(search.toLowerCase()) ||
      (t.referenceNumber && t.referenceNumber.toLowerCase().includes(search.toLowerCase())) ||
      (t.customerName && t.customerName.toLowerCase().includes(search.toLowerCase())) ||
      (t.createdBy && t.createdBy.toLowerCase().includes(search.toLowerCase()));

    const matchType = typeFilter === 'ALL' || t.type === typeFilter;

    let matchDate = true;
    if (startDate) {
      const s = new Date(startDate).getTime();
      const itemTime = t.createdAt?.toDate ? t.createdAt.toDate().getTime() : new Date(t.createdAt).getTime();
      matchDate = matchDate && itemTime >= s;
    }
    if (endDate) {
      const e = new Date(endDate).getTime() + 86400000;
      const itemTime = t.createdAt?.toDate ? t.createdAt.toDate().getTime() : new Date(t.createdAt).getTime();
      matchDate = matchDate && itemTime <= e;
    }

    return matchSearch && matchType && matchDate;
  });

  const handleExport = () => {
    const rows = filteredTransactions.map((t) => ({
      Date: formatDate(t.createdAt),
      Type: t.type,
      Product: t.productName,
      SKU: t.sku,
      Quantity: t.quantity,
      'Previous Stock': t.previousStock,
      'New Stock': t.newStock,
      Reference: t.referenceNumber || 'N/A',
      Party: t.customerName || t.supplierId || 'N/A',
      Reason: t.reason || t.notes || '—',
      User: t.createdBy || 'System',
    }));
    ReportService.exportToCSV('inventory-movements', rows);
  };

  const columns: Column<InventoryTransaction>[] = [
    {
      key: 'createdAt',
      header: 'Date & Time',
      sortable: true,
      render: (t) => <span className="text-xs text-slate-500 whitespace-nowrap">{formatDate(t.createdAt)}</span>,
    },
    {
      key: 'type',
      header: 'Movement Type',
      sortable: true,
      render: (t) => <TransactionTypeBadge type={t.type} />,
    },
    {
      key: 'productName',
      header: 'Product Details',
      sortable: true,
      render: (t) => (
        <div>
          <span className="font-semibold text-slate-900 block">{t.productName}</span>
          <span className="text-xs font-mono text-slate-400">{t.sku}</span>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Delta Qty',
      sortable: true,
      className: 'text-right',
      render: (t) => (
        <span className={`font-bold ${t.quantity > 0 ? 'text-emerald-600' : 'text-slate-800'}`}>
          {t.quantity > 0 ? `+${t.quantity}` : t.quantity}
        </span>
      ),
    },
    {
      key: 'newStock',
      header: 'Stock Flow',
      sortable: true,
      className: 'text-right',
      render: (t) => (
        <span className="text-xs font-mono text-slate-500">
          {t.previousStock} → <strong className="text-slate-900">{t.newStock}</strong>
        </span>
      ),
    },
    {
      key: 'referenceNumber',
      header: 'Ref / Party',
      render: (t) => (
        <div className="text-xs">
          <span className="font-medium text-slate-800 block">{t.referenceNumber || '—'}</span>
          {t.customerName && <span className="text-slate-500 block truncate max-w-[140px]">{t.customerName}</span>}
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Reason / Notes',
      render: (t) => (
        <span className="text-xs text-slate-500 truncate max-w-xs block">
          {t.reason || t.notes || '—'}
        </span>
      ),
    },
    {
      key: 'createdBy',
      header: 'Staff / User',
      render: (t) => <span className="text-xs text-slate-500">{t.createdBy || 'System'}</span>,
    },
  ];

  if (loading) return <LoadingPage message="Loading immutable movement ledger..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Inventory Movement History</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete append-only audit ledger of every inventory change across all warehouses.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-xs transition"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          Export Ledger CSV
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by SKU, product, ref..."
          />

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Movement Types</option>
            <option value="STOCK_IN">Stock In (Receipts)</option>
            <option value="STOCK_OUT">Stock Out (Dispatches)</option>
            <option value="ADJUSTMENT">Adjustments (Cycle Counts)</option>
          </select>

          <div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Start Date"
              className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="End Date"
              className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <DataTable
        id="movements-table"
        columns={columns}
        data={filteredTransactions}
        keyExtractor={(t) => t.id || t.transactionId || Math.random().toString()}
        emptyTitle="No movements match your criteria"
        emptyDescription="Transactions will automatically appear here as stock is received, dispatched, or adjusted."
      />
    </div>
  );
}
