import React, { useState, useEffect } from 'react';
import { Plus, Truck, Edit2, Phone, Mail, Globe, MapPin, Eye, X, Package } from 'lucide-react';
import { SupplierService } from '../services/supplierService';
import { ProductService } from '../services/productService';
import { Supplier, Product } from '../types';
import { DataTable, Column } from '../components/common/DataTable';
import { SearchInput } from '../components/common/SearchInput';
import { LoadingPage } from '../components/common/LoadingState';
import { useAuth } from '../contexts/AuthContext';

interface SuppliersPageProps {
  onSelectSupplier: (supplierId: string) => void;
}

export function SuppliersPage({ onSelectSupplier }: SuppliersPageProps) {
  const { currentUser, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    website: '',
    notes: '',
    active: true,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [sups, prods] = await Promise.all([
        SupplierService.getSuppliers(true),
        ProductService.getProducts(true),
      ]);
      setSuppliers(sups);
      setProducts(prods);
    } catch (err) {
      console.error('Failed to load suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingSupplier(null);
    setFormError('');
    setFormData({
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      website: '',
      notes: '',
      active: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (s: Supplier, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSupplier(s);
    setFormError('');
    setFormData({
      name: s.name,
      contactPerson: s.contactPerson || '',
      phone: s.phone || '',
      email: s.email || '',
      address: s.address || '',
      website: s.website || '',
      notes: s.notes || '',
      active: s.active !== false,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!formData.name.trim()) {
      setFormError('Supplier Name is required.');
      return;
    }

    setFormSubmitting(true);
    const userCtx = {
      uid: currentUser?.uid || 'user-admin',
      displayName: currentUser?.displayName || 'Admin',
      email: currentUser?.email,
    };

    try {
      if (editingSupplier && editingSupplier.id) {
        await SupplierService.updateSupplier(editingSupplier.id, formData, userCtx);
      } else {
        await SupplierService.createSupplier(formData, userCtx);
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save supplier');
    } finally {
      setFormSubmitting(false);
    }
  };

  const productCountBySupplier: Record<string, number> = {};
  products.forEach((p) => {
    if (p.supplierId) {
      productCountBySupplier[p.supplierId] = (productCountBySupplier[p.supplierId] || 0) + 1;
    }
  });

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.contactPerson && s.contactPerson.toLowerCase().includes(search.toLowerCase())) ||
      (s.email && s.email.toLowerCase().includes(search.toLowerCase()))
  );

  const columns: Column<Supplier>[] = [
    {
      key: 'name',
      header: 'Supplier & Contact',
      sortable: true,
      render: (s) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-slate-900 block">{s.name}</span>
            {s.contactPerson && (
              <span className="text-xs text-slate-500 block">Contact: {s.contactPerson}</span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Communication',
      render: (s) => (
        <div className="text-xs space-y-0.5">
          {s.email && (
            <div className="flex items-center gap-1.5 text-slate-600">
              <Mail className="w-3 h-3 text-slate-400" />
              <span>{s.email}</span>
            </div>
          )}
          {s.phone && (
            <div className="flex items-center gap-1.5 text-slate-600">
              <Phone className="w-3 h-3 text-slate-400" />
              <span>{s.phone}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'products',
      header: 'Supplied Products',
      sortable: true,
      render: (s) => {
        const count = productCountBySupplier[s.id!] || 0;
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            <Package className="w-3 h-3 text-slate-400" />
            {count} items
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (s) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
            s.active !== false
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          {s.active !== false ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (s) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => s.id && onSelectSupplier(s.id)}
            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-indigo-50 transition"
            title="View Supplier Profile"
          >
            <Eye className="w-4 h-4" />
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={(e) => openEditModal(s, e)}
              className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition"
              title="Edit Supplier"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  if (loading) return <LoadingPage message="Loading suppliers directory..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Vendors & Suppliers</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage procurement partners, contact points, and product purchase sources ({suppliers.length} vendors).
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            Add Supplier
          </button>
        )}
      </div>

      {/* Search Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search suppliers by name, contact person, or email..."
        />
      </div>

      {/* Table */}
      <DataTable
        id="suppliers-table"
        columns={columns}
        data={filteredSuppliers}
        keyExtractor={(s) => s.id || s.name}
        onRowClick={(s) => s.id && onSelectSupplier(s.id)}
        emptyTitle="No suppliers found"
        emptyDescription="Add a supplier to track vendor purchasing and stock receipts."
      />

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 my-auto overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh]">
            <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
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

            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
                {formError && (
                  <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                    {formError}
                  </div>
                )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Supplier / Vendor Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Global Tech Distributors"
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. +1 555-0199"
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="orders@vendor.com"
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Website</label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://..."
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street address, city, state, postal code"
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Terms</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Payment terms, lead time, account number..."
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sup-active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <label htmlFor="sup-active" className="text-xs font-medium text-slate-700">
                  Active Supplier
                </label>
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
                {formSubmitting ? 'Saving...' : editingSupplier ? 'Update Supplier' : 'Create Supplier'}
              </button>
            </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
