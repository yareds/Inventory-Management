import React, { useState, useEffect } from 'react';
import {
  ArrowDownToLine,
  Plus,
  Trash2,
  Package,
  Truck,
  CheckCircle2,
  Calendar,
  FileText,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Scan,
} from 'lucide-react';
import { BarcodeScannerModal } from '../components/common/BarcodeScannerModal';
import { ProductService } from '../services/productService';
import { SupplierService } from '../services/supplierService';
import { InventoryService } from '../services/inventoryService';
import { Product, Supplier, StockInRecord } from '../types';
import { formatCurrency, roundToTwoDecimals, formatDate } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { LoadingPage } from '../components/common/LoadingState';

interface StockInItemDraft {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  quantity: number;
  unitCost: number;
}

export function StockInPage() {
  const { currentUser } = useAuth();
  const { settings } = useSettings();

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [recentRecords, setRecentRecords] = useState<StockInRecord[]>([]);

  // Form state
  const [referenceNumber, setReferenceNumber] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<StockInItemDraft[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Feedback
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);

  const generateRef = () => {
    const random = Math.floor(1000 + Math.random() * 9000);
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `REC-${today}-${random}`;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, sups, records] = await Promise.all([
        ProductService.getProducts(true),
        SupplierService.getSuppliers(false),
        InventoryService.getRecentStockIn(10),
      ]);
      setProducts(prods);
      setSuppliers(sups);
      setRecentRecords(records);
      setReferenceNumber(generateRef());
    } catch (err) {
      console.error('Failed to load stock in data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddItem = () => {
    if (products.length === 0) return;
    const firstProd = products[0];
    setItems((prev) => [
      ...prev,
      {
        productId: firstProd.id!,
        productName: firstProd.name,
        sku: firstProd.sku,
        currentStock: firstProd.currentStock,
        quantity: 10,
        unitCost: firstProd.purchasePrice,
      },
    ]);
  };

  const handleBarcodeScanSuccess = (barcodeOrSku: string) => {
    const clean = barcodeOrSku.trim().toLowerCase();
    const matched = products.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === clean) ||
        p.sku.toLowerCase() === clean ||
        p.id?.toLowerCase() === clean
    );

    if (!matched) {
      setErrorMessage(`No product found for scanned code "${barcodeOrSku}".`);
      return;
    }

    setItems((prev) => {
      // If already in list, increase quantity by 1
      const existingIndex = prev.findIndex((it) => it.productId === matched.id);
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: Number(next[existingIndex].quantity || 0) + 1,
        };
        return next;
      }

      // Otherwise append new line item
      return [
        ...prev,
        {
          productId: matched.id!,
          productName: matched.name,
          sku: matched.sku,
          currentStock: matched.currentStock,
          quantity: 1,
          unitCost: matched.purchasePrice || 0,
        },
      ];
    });

    setSuccessMessage(`Scanned & added "${matched.name}" to receipt lines.`);
  };

  const handleProductChange = (index: number, pId: string) => {
    const prod = products.find((p) => p.id === pId);
    if (!prod) return;

    setItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        productId: prod.id!,
        productName: prod.name,
        sku: prod.sku,
        currentStock: prod.currentStock,
        unitCost: prod.purchasePrice,
      };
      return next;
    });
  };

  const handleItemChange = (index: number, field: 'quantity' | 'unitCost', value: number) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const calculateTotalUnits = () => items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
  const calculateTotalCost = () =>
    roundToTwoDecimals(items.reduce((acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.unitCost) || 0), 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (items.length === 0) {
      setErrorMessage('Please add at least one product item to receive.');
      return;
    }

    for (const item of items) {
      if (!item.quantity || item.quantity <= 0) {
        setErrorMessage(`Quantity for "${item.productName}" must be greater than zero.`);
        return;
      }
      if (item.unitCost < 0) {
        setErrorMessage(`Unit cost for "${item.productName}" cannot be negative.`);
        return;
      }
    }

    setSubmitting(true);
    const selectedSupplier = suppliers.find((s) => s.id === supplierId);

    const userCtx = {
      uid: currentUser?.uid || 'user-staff',
      displayName: currentUser?.displayName || 'Warehouse Staff',
      email: currentUser?.email || 'staff@inventorypro.com',
    };

    try {
      const result = await InventoryService.receiveStock(
        {
          referenceNumber: referenceNumber.trim() || generateRef(),
          supplierId: supplierId || undefined,
          supplierName: selectedSupplier?.name || undefined,
          date,
          notes: notes.trim() || undefined,
          items: items.map((it) => ({
            productId: it.productId,
            productName: it.productName,
            sku: it.sku,
            quantity: Number(it.quantity),
            unitCost: Number(it.unitCost),
            totalCost: roundToTwoDecimals(Number(it.quantity) * Number(it.unitCost)),
          })),
        },
        userCtx
      );

      setSuccessMessage(
        `Successfully received ${calculateTotalUnits()} units under reference ${result.referenceNumber}!`
      );
      setItems([]);
      setNotes('');
      setReferenceNumber(generateRef());
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to process Stock In transaction.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingPage message="Loading stock receiving station..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Stock In (Receive Inventory)</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Receive incoming warehouse shipments, record supplier delivery references, and automatically increment stock levels.
        </p>
      </div>

      {/* Alerts */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-xs font-semibold">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
          {errorMessage}
        </div>
      )}

      {/* Stock In Form */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reference / PO Number *
            </label>
            <input
              type="text"
              required
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. REC-2026-001"
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Supplier (Optional)
            </label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select Supplier (or Walk-in)</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Receiving Date *
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Line Items Builder */}
        <div>
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-indigo-600" />
              Received Products List ({items.length})
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition border border-blue-200"
              >
                <Scan className="w-3.5 h-3.5" />
                Scan Barcode
              </button>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Product Line
              </button>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="py-8 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <p className="text-xs text-slate-500 mb-3">No products added yet.</p>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition inline-flex items-center gap-1.5"
                >
                  <Scan className="w-3.5 h-3.5" />
                  Scan Barcode
                </button>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition"
                >
                  + Add Product Line
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item, index) => {
                const lineTotal = roundToTwoDecimals((item.quantity || 0) * (item.unitCost || 0));
                return (
                  <div
                    key={index}
                    className="p-3 border border-slate-200 rounded-xl bg-slate-50/40 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                  >
                    {/* Product select */}
                    <div className="sm:col-span-5">
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">Product</label>
                      <select
                        value={item.productId}
                        onChange={(e) => handleProductChange(index, e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku}) — Stock: {p.currentStock} {p.unit}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity */}
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                      />
                    </div>

                    {/* Unit Cost */}
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">
                        Unit Cost ({settings.currencySymbol})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={item.unitCost}
                        onChange={(e) => handleItemChange(index, 'unitCost', parseFloat(e.target.value) || 0)}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                      />
                    </div>

                    {/* Line Total */}
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">Line Total</label>
                      <span className="text-xs font-bold text-slate-900 block py-1.5">
                        {formatCurrency(lineTotal, settings.currencySymbol)}
                      </span>
                    </div>

                    {/* Delete */}
                    <div className="sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                        title="Remove product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Notes & Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Internal Receiving Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Delivery dock 3, inspected by team..."
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Total Product Lines:</span>
              <span className="font-semibold">{items.length}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Total Units to Receive:</span>
              <span className="font-semibold">{calculateTotalUnits()} units</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
              <span>Total Shipment Value:</span>
              <span className="text-emerald-600">{formatCurrency(calculateTotalCost(), settings.currencySymbol)}</span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={submitting || items.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition disabled:opacity-50"
          >
            <ArrowDownToLine className="w-4 h-4" />
            {submitting ? 'Processing Transaction...' : 'Confirm Stock Receiving'}
          </button>
        </div>
      </form>

      {/* Recent Stock In History */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-3">Recent Stock In Records</h3>

        <div className="divide-y divide-slate-100">
          {recentRecords.map((r) => {
            const isExpanded = expandedRecordId === r.id;
            return (
              <div key={r.id} className="py-3">
                <div
                  onClick={() => setExpandedRecordId(isExpanded ? null : r.id!)}
                  className="flex items-center justify-between cursor-pointer hover:bg-slate-50/70 p-2 rounded-lg transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                      <ArrowDownToLine className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block font-mono">{r.referenceNumber}</span>
                      <span className="text-[11px] text-slate-500">
                        {r.supplierName || 'General Supplier'} • {formatDate(r.createdAt || r.date)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-900 block">
                        {formatCurrency(r.totalCost, settings.currencySymbol)}
                      </span>
                      <span className="text-[11px] text-slate-400">{r.items.length} items</span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-2 ml-11 p-3 bg-slate-50 rounded-lg text-xs space-y-1.5 border border-slate-200">
                    <div className="font-semibold text-slate-700 mb-1">Batch Items:</div>
                    {r.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between text-slate-600">
                        <span>
                          {it.productName} ({it.sku}) × <strong>{it.quantity}</strong>
                        </span>
                        <span>{formatCurrency(it.totalCost, settings.currencySymbol)}</span>
                      </div>
                    ))}
                    {r.notes && (
                      <div className="pt-2 border-t border-slate-200 text-slate-500 italic">
                        Notes: {r.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {recentRecords.length === 0 && (
            <div className="py-6 text-center text-xs text-slate-400">
              No previous stock receipts found.
            </div>
          )}
        </div>
      </div>

      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleBarcodeScanSuccess}
        title="Stock In - Scan Barcode"
        subtitle="Point camera at product barcode or box label to add to receipt"
      />
    </div>
  );
}
