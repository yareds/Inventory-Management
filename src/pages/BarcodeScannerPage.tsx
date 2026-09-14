import React, { useState, useEffect } from 'react';
import {
  Scan,
  Barcode as BarcodeIcon,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  History,
  CheckCircle2,
  AlertCircle,
  Search,
  Plus,
  Minus,
  Trash2,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { ProductService } from '../services/productService';
import { InventoryService } from '../services/inventoryService';
import { Product } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { BarcodeScannerModal } from '../components/common/BarcodeScannerModal';
import { StockStatusBadge } from '../components/common/Badges';

interface ScanLogEntry {
  id: string;
  timestamp: Date;
  barcode: string;
  product?: Product;
  action: 'LOOKUP' | 'STOCK_IN' | 'STOCK_OUT';
  quantityDelta?: number;
  status: 'SUCCESS' | 'NOT_FOUND' | 'ERROR';
  message?: string;
}

interface BarcodeScannerPageProps {
  onSelectProduct?: (productId: string) => void;
  onNavigateTab?: (tab: any) => void;
}

export function BarcodeScannerPage({ onSelectProduct, onNavigateTab }: BarcodeScannerPageProps) {
  const { currentUser, isStaff } = useAuth();
  const { settings } = useSettings();

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<'LOOKUP' | 'STOCK_IN' | 'STOCK_OUT'>('LOOKUP');
  const [inputCode, setInputCode] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [matchedProduct, setMatchedProduct] = useState<Product | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanLogEntry[]>([]);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      const list = await ProductService.getProducts(true);
      setProducts(list);
    } catch (err) {
      console.error('Failed to load products for scanner:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Find product by barcode or SKU
  const findProduct = (code: string): Product | undefined => {
    const clean = code.trim().toLowerCase();
    return products.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === clean) ||
        p.sku.toLowerCase() === clean ||
        p.id?.toLowerCase() === clean
    );
  };

  const handleProcessCode = async (rawCode: string, modeOverride?: 'LOOKUP' | 'STOCK_IN' | 'STOCK_OUT') => {
    const code = rawCode.trim();
    if (!code) return;

    const currentMode = modeOverride || activeMode;
    const prod = findProduct(code);

    if (!prod) {
      setStatusMessage({
        type: 'error',
        text: `No product found matching barcode or SKU "${code}".`,
      });
      setScanHistory((prev) => [
        {
          id: String(Date.now()),
          timestamp: new Date(),
          barcode: code,
          action: currentMode,
          status: 'NOT_FOUND',
          message: 'Unknown barcode / SKU',
        },
        ...prev.slice(0, 19),
      ]);
      setMatchedProduct(null);
      return;
    }

    setMatchedProduct(prod);

    // If Mode is LOOKUP, just display product details
    if (currentMode === 'LOOKUP') {
      setStatusMessage({
        type: 'success',
        text: `Found "${prod.name}" (Stock: ${prod.currentStock} ${prod.unit})`,
      });
      setScanHistory((prev) => [
        {
          id: String(Date.now()),
          timestamp: new Date(),
          barcode: code,
          product: prod,
          action: 'LOOKUP',
          status: 'SUCCESS',
          message: `Stock: ${prod.currentStock} ${prod.unit}`,
        },
        ...prev.slice(0, 19),
      ]);
      return;
    }

    // Direct Stock In or Stock Out
    if (currentMode === 'STOCK_IN') {
      await executeQuickStockIn(prod, quantity);
    } else if (currentMode === 'STOCK_OUT') {
      await executeQuickStockOut(prod, quantity);
    }
  };

  const executeQuickStockIn = async (prod: Product, qty: number) => {
    if (!isStaff) {
      setStatusMessage({ type: 'error', text: 'You do not have operator permission to receive stock.' });
      return;
    }

    try {
      setIsProcessingAction(true);
      const userCtx = {
        uid: currentUser?.uid || 'scanner-user',
        displayName: currentUser?.displayName || 'Barcode Scanner',
        email: currentUser?.email,
      };

      await InventoryService.receiveStock(
        {
          referenceNumber: `SCAN-IN-${Date.now().toString().slice(-6)}`,
          supplierId: prod.supplierId || '',
          supplierName: prod.supplierName || 'Quick Scan Intake',
          date: new Date().toISOString().split('T')[0],
          notes: `Rapid barcode scan intake of ${qty} ${prod.unit}`,
          items: [
            {
              productId: prod.id!,
              productName: prod.name,
              sku: prod.sku,
              quantity: qty,
              unitCost: prod.purchasePrice || 0,
              totalCost: (prod.purchasePrice || 0) * qty,
            },
          ],
        },
        {
          uid: currentUser?.uid || 'scanner-user',
          displayName: currentUser?.displayName || 'Barcode Scanner',
          email: currentUser?.email || 'operator@inventory.com',
        }
      );

      // Refresh product in local memory
      const updatedStock = prod.currentStock + qty;
      const updatedProd = { ...prod, currentStock: updatedStock };
      setProducts((prev) => prev.map((p) => (p.id === prod.id ? updatedProd : p)));
      setMatchedProduct(updatedProd);

      setStatusMessage({
        type: 'success',
        text: `Received +${qty} ${prod.unit} of "${prod.name}". New Stock: ${updatedStock}`,
      });

      setScanHistory((prev) => [
        {
          id: String(Date.now()),
          timestamp: new Date(),
          barcode: prod.barcode || prod.sku,
          product: updatedProd,
          action: 'STOCK_IN',
          quantityDelta: qty,
          status: 'SUCCESS',
          message: `Stock increased to ${updatedStock}`,
        },
        ...prev.slice(0, 19),
      ]);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to record stock in.' });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const executeQuickStockOut = async (prod: Product, qty: number) => {
    if (!isStaff) {
      setStatusMessage({ type: 'error', text: 'You do not have operator permission to dispatch stock.' });
      return;
    }

    if (!settings.allowNegativeStock && prod.currentStock < qty) {
      setStatusMessage({
        type: 'error',
        text: `Insufficient stock for "${prod.name}". Available: ${prod.currentStock}, requested: ${qty}.`,
      });
      return;
    }

    try {
      setIsProcessingAction(true);
      const userCtx = {
        uid: currentUser?.uid || 'scanner-user',
        displayName: currentUser?.displayName || 'Barcode Scanner',
        email: currentUser?.email,
      };

      await InventoryService.issueStock(
        {
          referenceNumber: `SCAN-OUT-${Date.now().toString().slice(-6)}`,
          customerName: 'Quick Scan Dispatch',
          date: new Date().toISOString().split('T')[0],
          notes: `Rapid barcode scan issue of ${qty} ${prod.unit}`,
          items: [
            {
              productId: prod.id!,
              productName: prod.name,
              sku: prod.sku,
              quantity: qty,
              unitPrice: prod.sellingPrice || 0,
              totalValue: (prod.sellingPrice || 0) * qty,
            },
          ],
        },
        {
          uid: currentUser?.uid || 'scanner-user',
          displayName: currentUser?.displayName || 'Barcode Scanner',
          email: currentUser?.email || 'operator@inventory.com',
        }
      );

      // Refresh product in local memory
      const updatedStock = prod.currentStock - qty;
      const updatedProd = { ...prod, currentStock: updatedStock };
      setProducts((prev) => prev.map((p) => (p.id === prod.id ? updatedProd : p)));
      setMatchedProduct(updatedProd);

      setStatusMessage({
        type: 'success',
        text: `Issued -${qty} ${prod.unit} of "${prod.name}". New Stock: ${updatedStock}`,
      });

      setScanHistory((prev) => [
        {
          id: String(Date.now()),
          timestamp: new Date(),
          barcode: prod.barcode || prod.sku,
          product: updatedProd,
          action: 'STOCK_OUT',
          quantityDelta: -qty,
          status: 'SUCCESS',
          message: `Stock reduced to ${updatedStock}`,
        },
        ...prev.slice(0, 19),
      ]);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to record stock out.' });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleManualFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    handleProcessCode(inputCode.trim());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Barcode Scanner Terminal</h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-100 text-blue-700 border border-blue-200">
              LIVE OPTICAL
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Scan 1D barcodes and QR codes with your device camera or handheld scanner for rapid lookup, receiving, and dispatch.
          </p>
        </div>

        {/* Primary Scan Button */}
        <button
          type="button"
          onClick={() => setIsCameraOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition active:scale-98"
        >
          <Scan className="w-4 h-4" />
          <span>Open Live Camera Scanner</span>
        </button>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-2xs flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setActiveMode('LOOKUP')}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition ${
            activeMode === 'LOOKUP'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Product Lookup</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMode('STOCK_IN')}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition ${
            activeMode === 'STOCK_IN'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ArrowDownToLine className="w-3.5 h-3.5" />
          <span>Rapid Receive (+ In)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMode('STOCK_OUT')}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition ${
            activeMode === 'STOCK_OUT'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ArrowUpFromLine className="w-3.5 h-3.5" />
          <span>Rapid Dispatch (- Out)</span>
        </button>
      </div>

      {/* Input & Action Ribbon */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <form onSubmit={handleManualFormSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-7 lg:col-span-8">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Scan with Handheld Reader or Enter Barcode / SKU
              </label>
              <div className="relative">
                <BarcodeIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  placeholder="e.g. 89345001 or KB-MECH-RGB"
                  className="w-full pl-9 pr-24 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setIsCameraOpen(true)}
                  className="absolute right-1.5 top-1.5 px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition flex items-center gap-1"
                >
                  <Scan className="w-3 h-3" />
                  Camera
                </button>
              </div>
            </div>

            {/* Quantity Selector for Rapid Stock Movement */}
            {activeMode !== 'LOOKUP' && (
              <div className="sm:col-span-3 lg:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Qty per Scan
                </label>
                <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="p-2 text-slate-500 hover:bg-slate-100 transition"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full text-center text-xs font-bold py-1.5 border-x border-slate-200 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="p-2 text-slate-500 hover:bg-slate-100 transition"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            <div className={activeMode === 'LOOKUP' ? 'sm:col-span-5 lg:col-span-4' : 'sm:col-span-2'}>
              <button
                type="submit"
                disabled={!inputCode.trim() || isProcessingAction}
                className="w-full py-2 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-1.5 h-[38px]"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>{activeMode === 'LOOKUP' ? 'Lookup Code' : 'Execute Scan'}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Status Feedback Notice */}
        {statusMessage && (
          <div
            className={`mt-4 p-3 rounded-lg flex items-center gap-2.5 text-xs font-medium border ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : statusMessage.type === 'error'
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : 'bg-blue-50 text-blue-800 border-blue-200'
            }`}
          >
            {statusMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
            {statusMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            <span>{statusMessage.text}</span>
          </div>
        )}
      </div>

      {/* Main Split: Matched Product Card & Scan Activity Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Matched Product Focus */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center justify-between">
              <span>Scanned Product Identification</span>
              {matchedProduct && <StockStatusBadge status={matchedProduct.currentStock <= 0 ? 'OUT_OF_STOCK' : matchedProduct.currentStock <= matchedProduct.reorderLevel ? 'LOW_STOCK' : 'IN_STOCK'} />}
            </h3>

            {matchedProduct ? (
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 overflow-hidden shrink-0">
                    {matchedProduct.imageUrl ? (
                      <img
                        src={matchedProduct.imageUrl}
                        alt={matchedProduct.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-8 h-8" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="text-base font-bold text-slate-900 leading-snug">
                      {matchedProduct.name}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-xs font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        SKU: {matchedProduct.sku}
                      </span>
                      {matchedProduct.barcode && (
                        <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                          <BarcodeIcon className="w-3 h-3 text-slate-400" />
                          {matchedProduct.barcode}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-slate-400">Current Stock</span>
                    <span className="text-lg font-bold text-slate-900 mt-0.5 block">
                      {matchedProduct.currentStock}{' '}
                      <span className="text-xs font-normal text-slate-500">{matchedProduct.unit}</span>
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-slate-400">Unit Cost</span>
                    <span className="text-sm font-semibold text-slate-700 mt-0.5 block">
                      {formatCurrency(matchedProduct.purchasePrice, settings.currencySymbol)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-slate-400">Selling Price</span>
                    <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                      {formatCurrency(matchedProduct.sellingPrice, settings.currencySymbol)}
                    </span>
                  </div>
                </div>

                {/* Direct Actions */}
                <div className="pt-2 flex items-center gap-2">
                  {onSelectProduct && (
                    <button
                      type="button"
                      onClick={() => onSelectProduct(matchedProduct.id!)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      View Product Card
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => executeQuickStockIn(matchedProduct, quantity)}
                    disabled={isProcessingAction}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition disabled:opacity-50"
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                    Receive +{quantity}
                  </button>

                  <button
                    type="button"
                    onClick={() => executeQuickStockOut(matchedProduct, quantity)}
                    disabled={isProcessingAction}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition disabled:opacity-50"
                  >
                    <ArrowUpFromLine className="w-3.5 h-3.5" />
                    Issue -{quantity}
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <BarcodeIcon className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-medium text-slate-600">No item currently scanned</p>
                <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs mx-auto">
                  Click "Open Live Camera Scanner" above or type a barcode to test recognition.
                </p>
              </div>
            )}
          </div>

          {/* Quick Demo Barcodes Cheat Sheet */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4">
            <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-blue-600" />
              <span>Sample Barcodes in Database</span>
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {products.slice(0, 8).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setInputCode(p.barcode || p.sku);
                    handleProcessCode(p.barcode || p.sku);
                  }}
                  className="px-2 py-1 bg-white border border-slate-200 hover:border-blue-400 rounded-md text-[11px] font-mono text-slate-700 transition hover:bg-blue-50"
                  title={`${p.name} (${p.sku})`}
                >
                  {p.barcode || p.sku}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Scan History & Audit */}
        <div className="lg:col-span-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-slate-400" />
                <span>Session Scan Log ({scanHistory.length})</span>
              </h3>
              {scanHistory.length > 0 && (
                <button
                  type="button"
                  onClick={() => setScanHistory([])}
                  className="text-[11px] text-slate-400 hover:text-rose-600 flex items-center gap-1 transition"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear Log
                </button>
              )}
            </div>

            {scanHistory.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No scan actions logged during this session yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
                {scanHistory.map((entry) => (
                  <div key={entry.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono ${
                            entry.action === 'STOCK_IN'
                              ? 'bg-emerald-100 text-emerald-800'
                              : entry.action === 'STOCK_OUT'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {entry.action}
                        </span>
                        <span className="font-mono font-medium text-slate-900 truncate">{entry.barcode}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {entry.product?.name || entry.message || 'Product details'}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      {entry.quantityDelta && (
                        <span
                          className={`font-bold font-mono text-xs block ${
                            entry.quantityDelta > 0 ? 'text-emerald-600' : 'text-indigo-600'
                          }`}
                        >
                          {entry.quantityDelta > 0 ? `+${entry.quantityDelta}` : entry.quantityDelta}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 font-mono">
                        {entry.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Camera Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onScanSuccess={(decoded) => {
          setInputCode(decoded);
          handleProcessCode(decoded);
        }}
        title="Live Camera Barcode Scanner"
        subtitle="Align product barcode or QR code inside the viewfinder"
      />
    </div>
  );
}
