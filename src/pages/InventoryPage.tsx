import React, { useState, useEffect } from 'react';
import {
  Boxes,
  ArrowDownToLine,
  ArrowUpFromLine,
  SlidersHorizontal,
  Download,
  AlertTriangle,
  XCircle,
  Eye,
} from 'lucide-react';
import { ProductService } from '../services/productService';
import { Product, StockStatus } from '../types';
import { DataTable, Column } from '../components/common/DataTable';
import { StockStatusBadge } from '../components/common/Badges';
import { SearchInput } from '../components/common/SearchInput';
import { LoadingPage } from '../components/common/LoadingState';
import { formatCurrency, calculateStockStatus, roundToTwoDecimals } from '../lib/utils';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { ReportService } from '../services/reportService';

interface InventoryPageProps {
  onSelectProduct: (productId: string) => void;
  onNavigateTab: (tab: any) => void;
}

export function InventoryPage({ onSelectProduct, onNavigateTab }: InventoryPageProps) {
  const { settings } = useSettings();
  const { isAdmin, isStaff } = useAuth();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');

  const loadInventory = async () => {
    setLoading(true);
    try {
      const list = await ProductService.getProducts(true);
      setProducts(list);
    } catch (err) {
      console.error('Failed to load inventory stock:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const totalUnits = products.reduce((acc, p) => acc + (p.currentStock || 0), 0);
  const totalValuation = roundToTwoDecimals(
    products.reduce((acc, p) => acc + (p.currentStock || 0) * (p.purchasePrice || 0), 0)
  );

  const lowStockCount = products.filter(
    (p) => p.active && p.currentStock > 0 && p.currentStock <= p.reorderLevel
  ).length;
  const outOfStockCount = products.filter((p) => p.active && p.currentStock <= 0).length;

  const filteredProducts = products.filter((p) => {
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.categoryName && p.categoryName.toLowerCase().includes(search.toLowerCase()));

    const status = calculateStockStatus(p.currentStock, p.reorderLevel, p.maximumStock);
    let matchStatus = true;
    if (statusFilter === 'LOW_STOCK') {
      matchStatus = status === 'LOW_STOCK' || status === 'CRITICAL';
    } else if (statusFilter === 'OUT_OF_STOCK') {
      matchStatus = status === 'OUT_OF_STOCK';
    } else if (statusFilter === 'IN_STOCK') {
      matchStatus = status === 'IN_STOCK' || status === 'OVERSTOCKED';
    }

    return matchSearch && matchStatus;
  });

  const handleExport = () => {
    const rows = filteredProducts.map((p) => ({
      SKU: p.sku,
      Product: p.name,
      Category: p.categoryName || 'Uncategorized',
      'Current Stock': p.currentStock,
      Unit: p.unit,
      'Unit Cost': p.purchasePrice,
      'Inventory Value': roundToTwoDecimals(p.currentStock * p.purchasePrice),
      'Reorder Level': p.reorderLevel,
      Status: calculateStockStatus(p.currentStock, p.reorderLevel, p.maximumStock),
    }));
    ReportService.exportToCSV('inventory-levels', rows);
  };

  const columns: Column<Product>[] = [
    {
      key: 'name',
      header: 'Product & SKU',
      sortable: true,
      render: (p) => (
        <div>
          <span className="font-semibold text-slate-900 block">{p.name}</span>
          <span className="text-xs font-mono text-slate-400">{p.sku}</span>
        </div>
      ),
    },
    {
      key: 'categoryName',
      header: 'Category',
      sortable: true,
      render: (p) => <span className="text-xs text-slate-600">{p.categoryName || '—'}</span>,
    },
    {
      key: 'currentStock',
      header: 'On Hand',
      sortable: true,
      className: 'text-right',
      render: (p) => (
        <div className="text-right">
          <span className="text-base font-bold text-slate-900">{p.currentStock}</span>{' '}
          <span className="text-xs text-slate-500">{p.unit}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Stock Status',
      render: (p) => (
        <StockStatusBadge status={calculateStockStatus(p.currentStock, p.reorderLevel, p.maximumStock)} />
      ),
    },
    {
      key: 'reorderLevel',
      header: 'Reorder Level',
      sortable: true,
      className: 'text-right',
      render: (p) => (
        <div className="text-right text-xs">
          <span className="font-semibold text-slate-700">{p.reorderLevel}</span>{' '}
          <span className="text-slate-400">{p.unit}</span>
        </div>
      ),
    },
    {
      key: 'purchasePrice',
      header: 'Unit Cost',
      sortable: true,
      className: 'text-right',
      render: (p) => (
        <span className="text-xs font-semibold text-slate-700">
          {formatCurrency(p.purchasePrice, settings.currencySymbol)}
        </span>
      ),
    },
    {
      key: 'inventoryValue',
      header: 'Total Value',
      sortable: true,
      className: 'text-right',
      render: (p) => (
        <span className="text-xs font-bold text-slate-900">
          {formatCurrency(roundToTwoDecimals(p.currentStock * p.purchasePrice), settings.currencySymbol)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (p) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => p.id && onSelectProduct(p.id)}
            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-indigo-50 transition"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  if (loading) return <LoadingPage message="Loading inventory balances..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Inventory Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor real-time quantities, reorder thresholds, and warehouse valuation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export CSV
          </button>

          {isStaff && (
            <button
              type="button"
              onClick={() => onNavigateTab('stock-in')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              Receive Stock
            </button>
          )}
        </div>
      </div>

      {/* Summary Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Units</span>
          <div className="mt-1 text-2xl font-bold text-slate-900">{totalUnits.toLocaleString()}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Valuation</span>
          <div className="mt-1 text-2xl font-bold text-emerald-600">
            {formatCurrency(totalValuation, settings.currencySymbol)}
          </div>
        </div>

        <div
          onClick={() => setStatusFilter('LOW_STOCK')}
          className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs cursor-pointer hover:border-amber-300 transition"
        >
          <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Low Stock
          </span>
          <div className="mt-1 text-2xl font-bold text-slate-900">{lowStockCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter('OUT_OF_STOCK')}
          className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs cursor-pointer hover:border-rose-300 transition"
        >
          <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" /> Out of Stock
          </span>
          <div className="mt-1 text-2xl font-bold text-slate-900">{outOfStockCount}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="w-full sm:w-80">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by SKU, product name..."
          />
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              { id: 'ALL', label: 'All Items' },
              { id: 'LOW_STOCK', label: `Low Stock (${lowStockCount})` },
              { id: 'OUT_OF_STOCK', label: `Out of Stock (${outOfStockCount})` },
              { id: 'IN_STOCK', label: 'Healthy Stock' },
            ] as const
          ).map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setStatusFilter(filter.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                statusFilter === filter.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        id="inventory-table"
        columns={columns}
        data={filteredProducts}
        keyExtractor={(p) => p.id || p.sku}
        onRowClick={(p) => p.id && onSelectProduct(p.id)}
        emptyTitle="No inventory matches"
        emptyDescription="Try clearing filters or search to view all stock items."
      />
    </div>
  );
}
