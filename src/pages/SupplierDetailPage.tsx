import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Truck,
  Phone,
  Mail,
  Globe,
  MapPin,
  Package,
  Calendar,
  ArrowDownToLine,
  FileText,
} from 'lucide-react';
import { SupplierService } from '../services/supplierService';
import { ProductService } from '../services/productService';
import { Supplier, Product, StockInRecord } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import { useSettings } from '../contexts/SettingsContext';
import { LoadingPage } from '../components/common/LoadingState';

interface SupplierDetailPageProps {
  supplierId: string;
  onBack: () => void;
  onSelectProduct: (productId: string) => void;
}

export function SupplierDetailPage({ supplierId, onBack, onSelectProduct }: SupplierDetailPageProps) {
  const { settings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [stockInHistory, setStockInHistory] = useState<StockInRecord[]>([]);

  useEffect(() => {
    async function fetchDetails() {
      setLoading(true);
      try {
        const [sup, allProds, receipts] = await Promise.all([
          SupplierService.getSupplierById(supplierId),
          ProductService.getProducts(true),
          SupplierService.getSupplierStockInHistory(supplierId),
        ]);
        setSupplier(sup);
        setProducts(allProds.filter((p) => p.supplierId === supplierId));
        setStockInHistory(receipts);
      } catch (err) {
        console.error('Failed to load supplier detail:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDetails();
  }, [supplierId]);

  if (loading) return <LoadingPage message="Loading vendor profile..." />;
  if (!supplier) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
        <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">Supplier not found</h3>
        <button
          type="button"
          onClick={onBack}
          className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg"
        >
          Back to Suppliers
        </button>
      </div>
    );
  }

  const totalStockProvided = products.reduce((acc, p) => acc + (p.currentStock || 0), 0);
  const totalValuationProvided = products.reduce((acc, p) => acc + (p.currentStock || 0) * (p.purchasePrice || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="p-2 text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">{supplier.name}</h2>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                supplier.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {supplier.active ? 'Active Partner' : 'Inactive'}
            </span>
          </div>
          {supplier.contactPerson && (
            <p className="text-xs text-slate-500 mt-0.5">Primary Contact: {supplier.contactPerson}</p>
          )}
        </div>
      </div>

      {/* Profile Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Contact & Location
          </h3>
          <div className="space-y-2.5 text-xs text-slate-600">
            {supplier.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400" />
                <span>{supplier.phone}</span>
              </div>
            )}
            {supplier.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                <a href={`mailto:${supplier.email}`} className="text-indigo-600 hover:underline">
                  {supplier.email}
                </a>
              </div>
            )}
            {supplier.website && (
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-slate-400" />
                <a
                  href={supplier.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 hover:underline truncate"
                >
                  {supplier.website}
                </a>
              </div>
            )}
            {supplier.address && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>{supplier.address}</span>
              </div>
            )}
          </div>
          {supplier.notes && (
            <div className="pt-3 border-t border-slate-100 text-xs">
              <span className="font-semibold text-slate-500 block mb-1">Procurement Notes:</span>
              <p className="text-slate-600 italic leading-relaxed">{supplier.notes}</p>
            </div>
          )}
        </div>

        {/* Metrics */}
        <div className="md:col-span-2 grid grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase">Supplied Catalog</span>
            <div className="mt-2 text-3xl font-bold text-slate-900">{products.length}</div>
            <span className="text-xs text-slate-400">Products assigned</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase">Stock on Hand</span>
            <div className="mt-2 text-3xl font-bold text-indigo-600">{totalStockProvided}</div>
            <span className="text-xs text-slate-400">Current physical units</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs col-span-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">Total Inventory Value Supplied</span>
            <div className="mt-2 text-3xl font-bold text-emerald-600">
              {formatCurrency(totalValuationProvided, settings.currencySymbol)}
            </div>
            <span className="text-xs text-slate-400">At active purchase cost price</span>
          </div>
        </div>
      </div>

      {/* Supplied Products Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Package className="w-4 h-4 text-indigo-600" />
          Products Sourced from {supplier.name} ({products.length})
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-100 uppercase text-slate-500 font-semibold">
              <tr>
                <th className="px-3 py-2.5">SKU</th>
                <th className="px-3 py-2.5">Product Name</th>
                <th className="px-3 py-2.5">Category</th>
                <th className="px-3 py-2.5 text-right">Cost Price</th>
                <th className="px-3 py-2.5 text-right">Selling Price</th>
                <th className="px-3 py-2.5 text-right">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => p.id && onSelectProduct(p.id)}
                  className="hover:bg-slate-50 cursor-pointer transition"
                >
                  <td className="px-3 py-2.5 font-mono text-slate-700">{p.sku}</td>
                  <td className="px-3 py-2.5 font-semibold text-slate-900">{p.name}</td>
                  <td className="px-3 py-2.5 text-slate-500">{p.categoryName || '—'}</td>
                  <td className="px-3 py-2.5 text-right">{formatCurrency(p.purchasePrice, settings.currencySymbol)}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-slate-900">
                    {formatCurrency(p.sellingPrice, settings.currencySymbol)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-slate-900">
                    {p.currentStock} {p.unit}
                  </td>
                </tr>
              ))}

              {products.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-slate-400">
                    No products currently assigned to this vendor.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
