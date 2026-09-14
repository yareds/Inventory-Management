import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Package,
  Boxes,
  DollarSign,
  TrendingUp,
  SlidersHorizontal,
  ArrowDownToLine,
  ArrowUpFromLine,
  Barcode,
  History,
  Building,
  FolderTree,
  Calendar,
} from 'lucide-react';
import { ProductService } from '../services/productService';
import { Product, InventoryTransaction } from '../types';
import { StockStatusBadge, TransactionTypeBadge } from '../components/common/Badges';
import { formatCurrency, calculateStockStatus, roundToTwoDecimals, formatDate } from '../lib/utils';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { LoadingPage } from '../components/common/LoadingState';

interface ProductDetailPageProps {
  productId: string;
  onBack: () => void;
  onStockIn?: (productId: string) => void;
  onStockOut?: (productId: string) => void;
  onAdjust?: (productId: string) => void;
}

export function ProductDetailPage({
  productId,
  onBack,
  onStockIn,
  onStockOut,
  onAdjust,
}: ProductDetailPageProps) {
  const { settings } = useSettings();
  const { isAdmin, isStaff } = useAuth();
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);

  useEffect(() => {
    async function fetchDetail() {
      setLoading(true);
      try {
        const [prod, txns] = await Promise.all([
          ProductService.getProductById(productId),
          ProductService.getProductMovementHistory(productId),
        ]);
        setProduct(prod);
        setTransactions(txns);
      } catch (err) {
        console.error('Failed to load product details:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [productId]);

  if (loading) return <LoadingPage message="Loading product profile..." />;
  if (!product) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
        <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">Product not found</h3>
        <p className="text-xs text-slate-500 mt-1">The requested product does not exist or has been removed.</p>
        <button
          type="button"
          onClick={onBack}
          className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
        >
          Return to Catalog
        </button>
      </div>
    );
  }

  const stockStatus = calculateStockStatus(product.currentStock, product.reorderLevel, product.maximumStock);
  const inventoryValue = roundToTwoDecimals(product.currentStock * product.purchasePrice);
  const retailValue = roundToTwoDecimals(product.currentStock * product.sellingPrice);
  const marginPercent =
    product.sellingPrice > 0
      ? roundToTwoDecimals(((product.sellingPrice - product.purchasePrice) / product.sellingPrice) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition"
            title="Back to products"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-slate-900">{product.name}</h2>
              <StockStatusBadge status={stockStatus} />
            </div>
            <p className="text-xs font-mono text-slate-400 mt-0.5">SKU: {product.sku}</p>
          </div>
        </div>

        {/* Action Shortcuts */}
        <div className="flex items-center gap-2">
          {isStaff && onStockIn && (
            <button
              type="button"
              onClick={() => onStockIn(product.id!)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              Stock In
            </button>
          )}
          {isStaff && onStockOut && (
            <button
              type="button"
              onClick={() => onStockOut(product.id!)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition"
            >
              <ArrowUpFromLine className="w-3.5 h-3.5" />
              Stock Out
            </button>
          )}
          {isAdmin && onAdjust && (
            <button
              type="button"
              onClick={() => onAdjust(product.id!)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-xs transition"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Adjust Stock
            </button>
          )}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Stock</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{product.currentStock}</span>
            <span className="text-sm font-medium text-slate-500">{product.unit}</span>
          </div>
          <span className="mt-1 block text-xs text-slate-400">Reorder at: {product.reorderLevel} {product.unit}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Inventory Value</span>
          <div className="mt-2 text-3xl font-bold text-slate-900">
            {formatCurrency(inventoryValue, settings.currencySymbol)}
          </div>
          <span className="mt-1 block text-xs text-slate-400">At cost price of {formatCurrency(product.purchasePrice, settings.currencySymbol)}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Selling Value</span>
          <div className="mt-2 text-3xl font-bold text-emerald-600">
            {formatCurrency(retailValue, settings.currencySymbol)}
          </div>
          <span className="mt-1 block text-xs text-slate-400">Retail price: {formatCurrency(product.sellingPrice, settings.currencySymbol)}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross Profit Margin</span>
          <div className="mt-2 text-3xl font-bold text-indigo-600">{marginPercent}%</div>
          <span className="mt-1 block text-xs text-slate-400">
            Profit: {formatCurrency(roundToTwoDecimals(product.sellingPrice - product.purchasePrice), settings.currencySymbol)}/unit
          </span>
        </div>
      </div>

      {/* Detailed Spec & Attributes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
            Product Specifications
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500 flex items-center gap-1.5">
                <FolderTree className="w-3.5 h-3.5 text-slate-400" /> Category:
              </span>
              <span className="font-semibold text-slate-800">{product.categoryName || 'Unassigned'}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-slate-400" /> Supplier:
              </span>
              <span className="font-semibold text-slate-800">{product.supplierName || 'Unassigned'}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Barcode className="w-3.5 h-3.5 text-slate-400" /> Barcode / UPC:
              </span>
              <span className="font-mono text-slate-800">{product.barcode || '—'}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Minimum Level:</span>
              <span className="font-semibold text-slate-800">{product.minimumStock} {product.unit}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Reorder Threshold:</span>
              <span className="font-semibold text-amber-700">{product.reorderLevel} {product.unit}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Maximum Capacity:</span>
              <span className="font-semibold text-slate-800">{product.maximumStock} {product.unit}</span>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Created Date:
              </span>
              <span className="text-slate-700">{formatDate(product.createdAt)}</span>
            </div>
          </div>

          {product.description && (
            <div className="mt-4 pt-3 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-500 block mb-1">Description</span>
              <p className="text-xs text-slate-600 leading-relaxed">{product.description}</p>
            </div>
          )}
        </div>

        {/* Movement History Ledger for this specific product (Requirement #17) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600" />
              Stock Movement History
            </h3>
            <span className="text-xs text-slate-400">{transactions.length} total events</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-3 py-2.5">Date</th>
                  <th className="px-3 py-2.5">Type</th>
                  <th className="px-3 py-2.5 text-right">Quantity</th>
                  <th className="px-3 py-2.5 text-right">Prev / New</th>
                  <th className="px-3 py-2.5">Reference / Party</th>
                  <th className="px-3 py-2.5">Reason / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((t) => (
                  <tr key={t.id || t.transactionId} className="hover:bg-slate-50/70 transition">
                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-500">{formatDate(t.createdAt)}</td>
                    <td className="px-3 py-2.5">
                      <TransactionTypeBadge type={t.type} />
                    </td>
                    <td className={`px-3 py-2.5 text-right font-bold ${t.quantity > 0 ? 'text-emerald-600' : 'text-slate-800'}`}>
                      {t.quantity > 0 ? `+${t.quantity}` : t.quantity}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-500">
                      {t.previousStock} → <strong className="text-slate-900">{t.newStock}</strong>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 truncate max-w-[150px]">
                      {t.referenceNumber || t.customerName || '—'}
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 truncate max-w-[180px]">
                      {t.reason || t.notes || '—'}
                    </td>
                  </tr>
                ))}

                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      No stock movements recorded for this item yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
