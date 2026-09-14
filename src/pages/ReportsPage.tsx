import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Filter,
  FileSpreadsheet,
  AlertTriangle,
  Boxes,
  Truck,
  TrendingUp,
  DollarSign,
} from 'lucide-react';
import { ProductService } from '../services/productService';
import { CategoryService } from '../services/categoryService';
import { SupplierService } from '../services/supplierService';
import { InventoryService } from '../services/inventoryService';
import { Product, Category, Supplier, InventoryTransaction } from '../types';
import { ReportService, ReportFilterOptions } from '../services/reportService';
import { useSettings } from '../contexts/SettingsContext';
import { LoadingPage } from '../components/common/LoadingState';

export function ReportsPage() {
  const { settings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);

  // Filter options
  const [reportType, setReportType] = useState<ReportFilterOptions['reportType']>('INVENTORY');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedSupplier, setSelectedSupplier] = useState('ALL');
  const [selectedProduct, setSelectedProduct] = useState('ALL');
  const [transactionType, setTransactionType] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    async function loadReportDatasets() {
      setLoading(true);
      try {
        const [prods, cats, sups, txns] = await Promise.all([
          ProductService.getProducts(true),
          CategoryService.getCategories(true),
          SupplierService.getSuppliers(true),
          InventoryService.getMovementHistory(200),
        ]);
        setProducts(prods);
        setCategories(cats);
        setSuppliers(sups);
        setTransactions(txns);
      } catch (err) {
        console.error('Failed to load report data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadReportDatasets();
  }, []);

  const reportData = ReportService.generateReportData(
    {
      reportType,
      categoryId: selectedCategory,
      supplierId: selectedSupplier,
      productId: selectedProduct,
      transactionType,
      startDate,
      endDate,
    },
    products,
    transactions,
    categories,
    suppliers
  );

  const handleExportCSV = () => {
    ReportService.exportToCSV(`report-${reportType.toLowerCase()}`, reportData);
  };

  if (loading) return <LoadingPage message="Compiling inventory reporting engine..." />;

  const tableHeaders = reportData.length > 0 ? Object.keys(reportData[0]) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Reports & Analytics</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Exportable business intelligence covering valuation, stock movements, and replenishment needs.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          disabled={reportData.length === 0}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          Export to CSV
        </button>
      </div>

      {/* Report Selection Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {(
          [
            { id: 'INVENTORY', label: 'Inventory Stock', icon: Boxes },
            { id: 'VALUATION', label: 'Valuation', icon: DollarSign },
            { id: 'LOW_STOCK', label: 'Low Stock', icon: AlertTriangle },
            { id: 'OUT_OF_STOCK', label: 'Out of Stock', icon: AlertTriangle },
            { id: 'MOVEMENT', label: 'Stock Movement', icon: TrendingUp },
            { id: 'SUPPLIER', label: 'Suppliers', icon: Truck },
            { id: 'PRODUCT_MOVEMENT', label: 'Product Audit', icon: FileSpreadsheet },
          ] as const
        ).map((rep) => {
          const Icon = rep.icon;
          const isActive = reportType === rep.id;
          return (
            <button
              key={rep.id}
              type="button"
              onClick={() => setReportType(rep.id)}
              className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1.5 ${
                isActive
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 font-medium'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span className="text-xs">{rep.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter Parameters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {(reportType === 'INVENTORY' || reportType === 'VALUATION') && (
            <>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Suppliers</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </>
          )}

          {(reportType === 'MOVEMENT' || reportType === 'PRODUCT_MOVEMENT') && (
            <>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Products</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </select>

              <select
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value)}
                className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Movement Types</option>
                <option value="STOCK_IN">Stock In</option>
                <option value="STOCK_OUT">Stock Out</option>
                <option value="ADJUSTMENT">Adjustment</option>
              </select>

              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-indigo-500"
                placeholder="From Date"
              />

              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-indigo-500"
                placeholder="To Date"
              />
            </>
          )}
        </div>
      </div>

      {/* Generated Report Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <span className="text-xs font-bold text-slate-800">
            Report Data Preview ({reportData.length} records)
          </span>
          <span className="text-[11px] text-slate-500 font-mono">Export format: RFC 4180 CSV</span>
        </div>

        {reportData.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No records matched the selected criteria.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                <tr>
                  {tableHeaders.map((header) => (
                    <th key={header} className="px-3.5 py-3 whitespace-nowrap">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-slate-50/70 transition">
                    {tableHeaders.map((header) => (
                      <td key={header} className="px-3.5 py-2.5 whitespace-nowrap">
                        {typeof row[header] === 'number' && (header.includes('Value') || header.includes('Price') || header.includes('Cost'))
                          ? `${settings.currencySymbol}${row[header].toLocaleString()}`
                          : String(row[header] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
