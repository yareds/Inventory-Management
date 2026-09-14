import React, { useState, useEffect } from 'react';
import {
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  Package,
  History,
  TrendingUp,
  TrendingDown,
  Scan,
} from 'lucide-react';
import { BarcodeScannerModal } from '../components/common/BarcodeScannerModal';
import { ProductService } from '../services/productService';
import { InventoryService } from '../services/inventoryService';
import { Product, StockAdjustmentRecord } from '../types';
import { formatDate } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { LoadingPage } from '../components/common/LoadingState';

export function StockAdjustmentsPage() {
  const { currentUser, isAdmin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [recentAdjustments, setRecentAdjustments] = useState<StockAdjustmentRecord[]>([]);

  // Form
  const [selectedProductId, setSelectedProductId] = useState('');
  const [actualQuantity, setActualQuantity] = useState<number>(0);
  const [reason, setReason] = useState('Physical count discrepancy');
  const [notes, setNotes] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Feedback
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, adjs] = await Promise.all([
        ProductService.getProducts(true),
        InventoryService.getRecentAdjustments(15),
      ]);
      setProducts(prods);
      setRecentAdjustments(adjs);
      if (prods.length > 0 && !selectedProductId) {
        setSelectedProductId(prods[0].id!);
        setActualQuantity(prods[0].currentStock);
      }
    } catch (err) {
      console.error('Failed to load adjustments data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const systemQty = selectedProduct?.currentStock ?? 0;
  const difference = (actualQuantity || 0) - systemQty;

  const handleProductSelect = (pId: string) => {
    setSelectedProductId(pId);
    const prod = products.find((p) => p.id === pId);
    if (prod) {
      setActualQuantity(prod.currentStock);
    }
  };

  const handleBarcodeScanSuccess = (barcodeOrSku: string) => {
    const clean = barcodeOrSku.trim().toLowerCase();
    const prod = products.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === clean) ||
        p.sku.toLowerCase() === clean ||
        p.id?.toLowerCase() === clean
    );

    if (!prod) {
      setErrorMessage(`No product found matching barcode or SKU "${barcodeOrSku}".`);
      return;
    }

    setSelectedProductId(prod.id!);
    setActualQuantity(prod.currentStock);
    setSuccessMessage(`Identified "${prod.name}" (${prod.sku}). System Stock: ${prod.currentStock} ${prod.unit}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!selectedProductId) {
      setErrorMessage('Please select a product.');
      return;
    }

    if (actualQuantity < 0) {
      setErrorMessage('Actual quantity cannot be negative.');
      return;
    }

    if (difference === 0) {
      setErrorMessage('Actual physical quantity is identical to current system quantity. No difference to reconcile.');
      return;
    }

    setSubmitting(true);
    const userCtx = {
      uid: currentUser?.uid || 'user-admin',
      displayName: currentUser?.displayName || 'Inventory Manager',
      email: currentUser?.email || 'admin@inventorypro.com',
    };

    try {
      await InventoryService.adjustStock(
        {
          productId: selectedProductId,
          actualQuantity: Number(actualQuantity),
          reason: reason.trim(),
          notes: notes.trim() || undefined,
        },
        userCtx
      );

      setSuccessMessage(
        `Reconciled "${selectedProduct?.name}" from ${systemQty} to ${actualQuantity} units (Diff: ${difference > 0 ? '+' : ''}${difference})!`
      );
      setNotes('');
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to apply adjustment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingPage message="Loading stock adjustment module..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Stock Adjustments & Cycle Counting</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Reconcile physical inventory counts against system records. Automatically accounts for shrink, damaged goods, or audit findings.
        </p>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-xs font-semibold">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Adjustment Form */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Product Select */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Select Product to Adjust *
              </label>
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition"
              >
                <Scan className="w-3.5 h-3.5" />
                Scan Barcode / SKU
              </button>
            </div>
            <select
              value={selectedProductId}
              onChange={(e) => handleProductSelect(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku}) — System Stock: {p.currentStock} {p.unit}
                </option>
              ))}
            </select>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Adjustment Reason *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="Physical count discrepancy">Physical count discrepancy</option>
              <option value="Damaged goods / broken packaging">Damaged goods / broken packaging</option>
              <option value="Expired goods">Expired goods</option>
              <option value="Theft or shrinkage">Theft or shrinkage</option>
              <option value="Receiving clerical correction">Receiving clerical correction</option>
              <option value="Internal calibration / QA sample">Internal calibration / QA sample</option>
              <option value="Other reconciliation">Other reconciliation</option>
            </select>
          </div>
        </div>

        {/* Quantities & Comparison Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div>
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
              Current System Quantity
            </span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">
              {systemQty} <span className="text-xs font-normal text-slate-500">{selectedProduct?.unit}</span>
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">
              Actual Counted Quantity *
            </label>
            <input
              type="number"
              min="0"
              required
              value={actualQuantity}
              onChange={(e) => setActualQuantity(parseInt(e.target.value) || 0)}
              className="w-full text-sm font-bold px-3 py-1.5 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
              Reconciliation Difference
            </span>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={`text-2xl font-bold ${
                  difference > 0
                    ? 'text-emerald-600'
                    : difference < 0
                    ? 'text-rose-600'
                    : 'text-slate-500'
                }`}
              >
                {difference > 0 ? `+${difference}` : difference}
              </span>
              {difference > 0 ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" /> Surplus
                </span>
              ) : difference < 0 ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800 flex items-center gap-0.5">
                  <TrendingDown className="w-3 h-3" /> Deficit / Loss
                </span>
              ) : (
                <span className="text-xs text-slate-400">No change</span>
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Audit Reconciliation Notes (Optional)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Conducted monthly cycle count in aisle B-4..."
            className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={submitting || difference === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition disabled:opacity-50"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {submitting ? 'Applying Adjustment...' : 'Apply Stock Adjustment'}
          </button>
        </div>
      </form>

      {/* Recent Adjustments Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <History className="w-4 h-4 text-indigo-600" />
          Recent Physical Count Adjustments
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="px-3 py-2.5">Date</th>
                <th className="px-3 py-2.5">Product</th>
                <th className="px-3 py-2.5 text-right">System Qty</th>
                <th className="px-3 py-2.5 text-right">Actual Qty</th>
                <th className="px-3 py-2.5 text-right">Difference</th>
                <th className="px-3 py-2.5">Reason</th>
                <th className="px-3 py-2.5">Auditor / User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentAdjustments.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/70 transition">
                  <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{formatDate(a.createdAt)}</td>
                  <td className="px-3 py-2.5 font-semibold text-slate-900">
                    {a.productName}
                    <span className="block text-[10px] font-mono text-slate-400">{a.sku}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-medium">{a.systemQuantity}</td>
                  <td className="px-3 py-2.5 text-right font-bold text-slate-900">{a.actualQuantity}</td>
                  <td
                    className={`px-3 py-2.5 text-right font-bold ${
                      a.difference > 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {a.difference > 0 ? `+${a.difference}` : a.difference}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600 max-w-xs truncate">{a.reason}</td>
                  <td className="px-3 py-2.5 text-slate-500">{a.createdBy || 'Admin'}</td>
                </tr>
              ))}

              {recentAdjustments.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-slate-400">
                    No physical adjustments recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleBarcodeScanSuccess}
        title="Stock Adjustment - Scan Item"
        subtitle="Point camera at product barcode to auto-select item for reconciliation"
      />
    </div>
  );
}
