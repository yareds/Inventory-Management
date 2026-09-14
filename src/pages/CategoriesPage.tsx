import React, { useState, useEffect } from 'react';
import { Plus, FolderTree, Edit2, Trash2, Search, X, Package } from 'lucide-react';
import { CategoryService } from '../services/categoryService';
import { ProductService } from '../services/productService';
import { Category, Product } from '../types';
import { DataTable, Column } from '../components/common/DataTable';
import { SearchInput } from '../components/common/SearchInput';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { LoadingPage } from '../components/common/LoadingState';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../lib/utils';

export function CategoriesPage() {
  const { currentUser, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    active: true,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [cats, prods] = await Promise.all([
        CategoryService.getCategories(true),
        ProductService.getProducts(true),
      ]);
      setCategories(cats);
      setProducts(prods);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormError('');
    setFormData({ name: '', description: '', active: true });
    setIsModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setFormError('');
    setFormData({
      name: cat.name,
      description: cat.description || '',
      active: cat.active,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const cleanName = formData.name.trim();
    if (!cleanName) {
      setFormError('Category name is required.');
      return;
    }

    setFormSubmitting(true);
    const userCtx = {
      uid: currentUser?.uid || 'user-admin',
      displayName: currentUser?.displayName || 'Admin',
      email: currentUser?.email,
    };

    try {
      if (editingCategory && editingCategory.id) {
        await CategoryService.updateCategory(
          editingCategory.id,
          {
            name: cleanName,
            description: formData.description.trim(),
            active: formData.active,
          },
          userCtx
        );
      } else {
        await CategoryService.createCategory(
          {
            name: cleanName,
            description: formData.description.trim(),
            active: formData.active,
          },
          userCtx
        );
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save category');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete?.id) return;
    setIsDeleting(true);
    try {
      await CategoryService.deleteCategory(categoryToDelete.id, categoryToDelete.name, {
        uid: currentUser?.uid || 'admin',
        displayName: currentUser?.displayName || 'Admin',
        email: currentUser?.email,
      });
      setCategoryToDelete(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete category');
    } finally {
      setIsDeleting(false);
    }
  };

  // Compute product counts for each category
  const productCountByCat: Record<string, number> = {};
  products.forEach((p) => {
    if (p.categoryId) {
      productCountByCat[p.categoryId] = (productCountByCat[p.categoryId] || 0) + 1;
    }
  });

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  );

  const columns: Column<Category>[] = [
    {
      key: 'name',
      header: 'Category Name',
      sortable: true,
      render: (c) => (
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
            <FolderTree className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-slate-900 block">{c.name}</span>
            {c.description && <span className="text-xs text-slate-500 block truncate max-w-sm">{c.description}</span>}
          </div>
        </div>
      ),
    },
    {
      key: 'productCount',
      header: 'Products',
      sortable: true,
      render: (c) => {
        const count = productCountByCat[c.id!] || 0;
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            <Package className="w-3 h-3 text-slate-400" />
            {count} items
          </span>
        );
      },
    },
    {
      key: 'active',
      header: 'Status',
      render: (c) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
            c.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {c.active ? 'Active' : 'Archived'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created Date',
      render: (c) => <span className="text-xs text-slate-500">{formatDate(c.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (c) => (
        <div className="flex items-center justify-end gap-1">
          {isAdmin && (
            <button
              type="button"
              onClick={() => openEditModal(c)}
              className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition"
              title="Edit Category"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setCategoryToDelete(c)}
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition"
              title="Delete Category"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  if (loading) return <LoadingPage message="Loading categories..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Categories</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Organize catalog inventory into distinct logical groupings ({categories.length} categories).
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        )}
      </div>

      {/* Search Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search categories by name or description..."
        />
      </div>

      {/* Table */}
      <DataTable
        id="categories-table"
        columns={columns}
        data={filteredCategories}
        keyExtractor={(c) => c.id || c.name}
        emptyTitle="No categories found"
        emptyDescription="Create a category to group products."
      />

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 my-auto overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh]">
            <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                {editingCategory ? 'Edit Category' : 'Create New Category'}
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
                    Category Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Storage & Memory"
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of products in this category..."
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="cat-active"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <label htmlFor="cat-active" className="text-xs font-medium text-slate-700">
                    Active Category
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
                  {formSubmitting ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete / Archive Dialog */}
      <ConfirmDialog
        isOpen={!!categoryToDelete}
        title="Delete Category"
        message={`Are you sure you want to delete "${categoryToDelete?.name}"? Deletion is prevented if any products are currently linked to this category.`}
        confirmLabel="Delete"
        isDestructive
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setCategoryToDelete(null)}
      />
    </div>
  );
}
