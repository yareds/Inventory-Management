import React, { useState, useEffect } from 'react';
import {
  Plus,
  Package,
  Search,
  Filter,
  Download,
  Edit2,
  Trash2,
  Eye,
  ArrowDownToLine,
  ArrowUpFromLine,
  X,
  Upload,
  Scan,
} from 'lucide-react';
import { BarcodeScannerModal } from '../components/common/BarcodeScannerModal';
import { ProductService } from '../services/productService';
import { CategoryService } from '../services/categoryService';
import { SupplierService } from '../services/supplierService';
import { Product, Category, Supplier, StockStatus } from '../types';
import { DataTable, Column } from '../components/common/DataTable';
import { StockStatusBadge } from '../components/common/Badges';
import { SearchInput } from '../components/common/SearchInput';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { LoadingPage } from '../components/common/LoadingState';
import { formatCurrency, calculateStockStatus, roundToTwoDecimals } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { ReportService } from '../services/reportService';

interface ProductsPageProps {
  onSelectProduct: (productId: string) => void;
  onStockIn?: (productId: string) => void;
  onStockOut?: (productId: string) => void;
  onAdjust?: (productId: string) => void;
  onStockInProduct?: (product: Product) => void;
  onStockOutProduct?: (product: Product) => void;
}

export function ProductsPage({
  onSelectProduct,
  onStockIn,
  onStockOut,
  onAdjust,
  onStockInProduct,
  onStockOutProduct,
}: ProductsPageProps) {
  const { currentUser, isStaff, isAdmin } = useAuth();
  const { settings } = useSettings();

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedSupplier, setSelectedSupplier] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);

  // Form fields
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    categoryId: '',
    supplierId: '',
    unit: 'pcs',
    purchasePrice: 0,
    sellingPrice: 0,
    currentStock: 0,
    minimumStock: 5,
    reorderLevel: 10,
    maximumStock: 100,
    barcode: '',
    imageUrl: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [pList, cList, sList] = await Promise.all([
        ProductService.getProducts(true),
        CategoryService.getCategories(false),
        SupplierService.getSuppliers(false),
      ]);
      setProducts(pList);
      setCategories(cList);
      setSuppliers(sList);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormError('');
    setFormData({
      sku: '',
      name: '',
      description: '',
      categoryId: categories[0]?.id || '',
      supplierId: suppliers[0]?.id || '',
      unit: 'pcs',
      purchasePrice: 0,
      sellingPrice: 0,
      currentStock: 0,
      minimumStock: 5,
      reorderLevel: settings.defaultReorderLevel || 10,
      maximumStock: 100,
      barcode: '',
      imageUrl: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProduct(p);
    setFormError('');
    setFormData({
      sku: p.sku,
      name: p.name,
      description: p.description || '',
      categoryId: p.categoryId,
      supplierId: p.supplierId || '',
      unit: p.unit || 'pcs',
      purchasePrice: p.purchasePrice,
      sellingPrice: p.sellingPrice,
      currentStock: p.currentStock,
      minimumStock: p.minimumStock || 0,
      reorderLevel: p.reorderLevel,
      maximumStock: p.maximumStock || 100,
      barcode: p.barcode || '',
      imageUrl: p.imageUrl || '',
    });
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Validation
    if (!formData.sku.trim()) {
      setFormError('SKU is required.');
      return;
    }
    if (!formData.name.trim()) {
      setFormError('Product Name is required.');
      return;
    }
    if (formData.purchasePrice < 0 || formData.sellingPrice < 0) {
      setFormError('Prices must be non-negative.');
      return;
    }
    if (!formData.categoryId) {
      setFormError('Please select a category.');
      return;
    }

    setFormSubmitting(true);
    const userCtx = {
      uid: currentUser?.uid || 'user-admin',
      displayName: currentUser?.displayName || 'User',
      email: currentUser?.email || 'admin@inventorypro.com',
    };

    const categoryObj = categories.find((c) => c.id === formData.categoryId);
    const supplierObj = suppliers.find((s) => s.id === formData.supplierId);

    try {
      if (editingProduct && editingProduct.id) {
        await ProductService.updateProduct(
          editingProduct.id,
          {
            name: formData.name.trim(),
            description: formData.description.trim(),
            categoryId: formData.categoryId,
            categoryName: categoryObj?.name || '',
            supplierId: formData.supplierId || '',
            supplierName: supplierObj?.name || '',
            unit: formData.unit,
            purchasePrice: Number(formData.purchasePrice),
            sellingPrice: Number(formData.sellingPrice),
            minimumStock: Number(formData.minimumStock),
            reorderLevel: Number(formData.reorderLevel),
            maximumStock: Number(formData.maximumStock),
            barcode: formData.barcode.trim(),
            imageUrl: formData.imageUrl.trim(),
          },
          userCtx
        );
      } else {
        await ProductService.createProduct(
          {
            sku: formData.sku.trim(),
            name: formData.name.trim(),
            description: formData.description.trim(),
            categoryId: formData.categoryId,
            categoryName: categoryObj?.name || '',
            supplierId: formData.supplierId || '',
            supplierName: supplierObj?.name || '',
            unit: formData.unit,
            purchasePrice: Number(formData.purchasePrice),
            sellingPrice: Number(formData.sellingPrice),
            currentStock: Number(formData.currentStock) || 0,
            minimumStock: Number(formData.minimumStock) || 0,
            reorderLevel: Number(formData.reorderLevel) || 10,
            maximumStock: Number(formData.maximumStock) || 100,
            barcode: formData.barcode.trim(),
            imageUrl: formData.imageUrl.trim(),
            active: true,
          },
          userCtx
        );
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save product');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete?.id) return;
    setIsDeleting(true);
    try {
      await ProductService.deleteProduct(productToDelete.id, {
        uid: currentUser?.uid || 'admin',
        displayName: currentUser?.displayName || 'Admin',
        email: currentUser?.email,
      });
      setProductToDelete(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete product');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter products
  const filteredProducts = products.filter((p) => {
    // Search query
    const matchQuery =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode && p.barcode.toLowerCase().includes(search.toLowerCase()));

    // Category
    const matchCat = selectedCategory === 'ALL' || p.categoryId === selectedCategory;

    // Supplier
    const matchSup = selectedSupplier === 'ALL' || p.supplierId === selectedSupplier;

    // Status
    const status = calculateStockStatus(p.currentStock, p.reorderLevel, p.maximumStock);
    const matchStatus = selectedStatus === 'ALL' || status === selectedStatus;

    return matchQuery && matchCat && matchSup && matchStatus;
  });

  const handleExport = () => {
    const rows = filteredProducts.map((p) => ({
      SKU: p.sku,
      Name: p.name,
      Category: p.categoryName || 'Uncategorized',
      Supplier: p.supplierName || '—',
      Stock: p.currentStock,
      Unit: p.unit,
      PurchasePrice: p.purchasePrice,
      SellingPrice: p.sellingPrice,
      Status: calculateStockStatus(p.currentStock, p.reorderLevel, p.maximumStock),
    }));
    ReportService.exportToCSV('products-catalog', rows);
  };

  const columns: Column<Product>[] = [
    {
      key: 'product',
      header: 'Product & SKU',
      sortable: true,
      render: (p) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0 overflow-hidden border border-slate-200">
            {p.imageUrl ? (
              <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
            ) : (
              <Package className="w-4 h-4" />
            )}
          </div>
          <div className="min-w-0">
            <span className="font-semibold text-slate-900 block truncate max-w-xs">{p.name}</span>
            <span className="text-xs font-mono text-slate-400">{p.sku}</span>
          </div>
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
      header: 'Current Stock',
      sortable: true,
      className: 'text-right',
      render: (p) => (
        <div className="text-right">
          <span className="font-bold text-slate-900">{p.currentStock}</span>{' '}
          <span className="text-xs text-slate-500">{p.unit}</span>
          <span className="block text-[10px] text-slate-400">Reorder: {p.reorderLevel}</span>
        </div>
      ),
    },
    {
      key: 'purchasePrice',
      header: 'Cost / Selling',
      sortable: true,
      render: (p) => (
        <div className="text-xs">
          <span className="text-slate-900 font-semibold">{formatCurrency(p.sellingPrice, settings.currencySymbol)}</span>
          <span className="block text-[10px] text-slate-400">Cost: {formatCurrency(p.purchasePrice, settings.currencySymbol)}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => (
        <StockStatusBadge
          status={calculateStockStatus(p.currentStock, p.reorderLevel, p.maximumStock)}
        />
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
            title="View Product Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={(e) => openEditModal(p, e)}
              className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition"
              title="Edit Product"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setProductToDelete(p)}
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition"
              title="Delete Product"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  if (loading) return <LoadingPage message="Loading product catalog..." />;

  return (
    <div className="space-y-6">
      {/* Header with Title and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Product Catalog</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage product specs, pricing, SKUs, and inventory thresholds ({products.length} products).
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

          {isAdmin && (
            <button
              id="btn-add-product"
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </button>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by name, SKU, barcode..."
          />

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          >
            <option value="ALL">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Supplier Filter */}
          <select
            value={selectedSupplier}
            onChange={(e) => setSelectedSupplier(e.target.value)}
            className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          >
            <option value="ALL">All Suppliers ({suppliers.length})</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          >
            <option value="ALL">All Stock Statuses</option>
            <option value="IN_STOCK">In Stock</option>
            <option value="LOW_STOCK">Low Stock</option>
            <option value="CRITICAL">Critical Low</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <DataTable
        id="products-table"
        columns={columns}
        data={filteredProducts}
        keyExtractor={(p) => p.id || p.sku}
        onRowClick={(p) => p.id && onSelectProduct(p.id)}
        emptyTitle="No products match your filters"
        emptyDescription="Try adjusting your search criteria or add a new product."
      />

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 my-auto overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh]">
            <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                {editingProduct ? 'Edit Product' : 'Create New Product'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
                {formError && (
                  <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                    {formError}
                  </div>
                )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    SKU (Stock Keeping Unit) *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingProduct}
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                    placeholder="e.g. KB-MECH-01"
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 uppercase"
                  />
                  <span className="text-[10px] text-slate-400">Must be unique across catalog</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Ergonomic Mechanical Keyboard"
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    required
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier</label>
                  <select
                    value={formData.supplierId}
                    onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Unit of Measure</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="units">Units</option>
                    <option value="boxes">Boxes</option>
                    <option value="sets">Sets</option>
                    <option value="kg">Kilograms (kg)</option>
                    <option value="coils">Coils</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Purchase Cost ({settings.currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Selling Price ({settings.currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {!editingProduct && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Initial Stock Quantity
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.currentStock}
                      onChange={(e) => setFormData({ ...formData, currentStock: parseInt(e.target.value) || 0 })}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Minimum Stock (Alert Level)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minimumStock}
                    onChange={(e) => setFormData({ ...formData, minimumStock: parseInt(e.target.value) || 0 })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reorder Threshold *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.reorderLevel}
                    onChange={(e) => setFormData({ ...formData, reorderLevel: parseInt(e.target.value) || 0 })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Maximum Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.maximumStock}
                    onChange={(e) => setFormData({ ...formData, maximumStock: parseInt(e.target.value) || 0 })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">Barcode / UPC</label>
                    <button
                      type="button"
                      onClick={() => setIsBarcodeScannerOpen(true)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition"
                    >
                      <Scan className="w-3.5 h-3.5" />
                      Scan with Camera
                    </button>
                  </div>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="e.g. 789123456789"
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Image URL</label>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional product details..."
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="px-5 py-3.5 sm:px-6 sm:py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition shadow-2xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formSubmitting}
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-2xs disabled:opacity-50"
              >
                {formSubmitting ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!productToDelete}
        title="Delete Product"
        message={`Are you sure you want to deactivate "${productToDelete?.name}" (${productToDelete?.sku})? This product will be archived and hidden from standard catalog views.`}
        confirmLabel="Deactivate"
        isDestructive
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setProductToDelete(null)}
      />

      {/* Barcode Scanner Modal for product creation / editing */}
      <BarcodeScannerModal
        isOpen={isBarcodeScannerOpen}
        onClose={() => setIsBarcodeScannerOpen(false)}
        onScanSuccess={(code) => {
          setFormData((prev) => ({ ...prev, barcode: code }));
        }}
        title="Capture Product Barcode"
        subtitle="Point camera at product UPC / EAN barcode to populate field"
      />
    </div>
  );
}
