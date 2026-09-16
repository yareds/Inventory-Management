import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, Edit2, CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';
import { collection, getDocs, doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { AppUser, UserRole } from '../types';
import { DataTable, Column } from '../components/common/DataTable';
import { RoleBadge } from '../components/common/Badges';
import { SearchInput } from '../components/common/SearchInput';
import { LoadingPage } from '../components/common/LoadingState';
import { useAuth } from '../contexts/AuthContext';
import { logAuditEvent } from '../services/auditService';
import { formatDate } from '../lib/utils';
import { DEMO_USERS } from '../lib/demoData';

export function UsersPage() {
  const { currentUser, isSuperAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AppUser[]>(DEMO_USERS);
  const [search, setSearch] = useState('');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('STAFF');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      if (snap.docs.length > 0) {
        const list = snap.docs.map((d) => ({ ...d.data() })) as AppUser[];
        setUsers(list);
      } else {
        setUsers(DEMO_USERS);
      }
    } catch {
      setUsers(DEMO_USERS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openEditModal = (u: AppUser) => {
    setEditingUser(u);
    setNewDisplayName(u.displayName);
    setNewEmail(u.email);
    setNewRole(u.role);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setNewDisplayName('');
    setNewEmail('');
    setNewRole('STAFF');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!newEmail.trim()) {
      setErrorMsg('Email is required.');
      return;
    }

    setFormSubmitting(true);
    const adminCtx = {
      uid: currentUser?.uid || 'super-admin',
      displayName: currentUser?.displayName || 'Super Admin',
      email: currentUser?.email,
    };

    try {
      if (editingUser) {
        // Prevent demoting the last SUPER_ADMIN
        if (editingUser.role === 'SUPER_ADMIN' && newRole !== 'SUPER_ADMIN') {
          const superAdminCount = users.filter((u) => u.role === 'SUPER_ADMIN' && u.active).length;
          if (superAdminCount <= 1) {
            throw new Error('Cannot demote the last active Super Admin in the system.');
          }
        }

        const ref = doc(db, 'users', editingUser.uid);
        await updateDoc(ref, {
          displayName: newDisplayName.trim(),
          role: newRole,
          updatedAt: serverTimestamp(),
        });

        await logAuditEvent(
          adminCtx,
          'USER_ROLE_CHANGED',
          'USERS',
          `Changed role of "${editingUser.displayName}" (${editingUser.email}) to ${newRole}`,
          editingUser.uid
        );
      } else {
        // Create user record
        const newUid = `user-${Date.now()}`;
        const ref = doc(db, 'users', newUid);
        const newUser: AppUser = {
          uid: newUid,
          displayName: newDisplayName.trim() || newEmail.split('@')[0],
          email: newEmail.trim().toLowerCase(),
          role: newRole,
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await setDoc(ref, newUser);

        await logAuditEvent(
          adminCtx,
          'USER_CREATED',
          'USERS',
          `Created user profile for ${newEmail} with role ${newRole}`,
          newUid
        );
      }

      setIsModalOpen(false);
      await loadUsers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save user role');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleActive = async (u: AppUser) => {
    if (u.role === 'SUPER_ADMIN' && u.active) {
      const superAdminCount = users.filter((usr) => usr.role === 'SUPER_ADMIN' && usr.active).length;
      if (superAdminCount <= 1) {
        alert('Cannot deactivate the last active Super Admin in the system.');
        return;
      }
    }

    const nextState = !u.active;
    try {
      const ref = doc(db, 'users', u.uid);
      await updateDoc(ref, {
        active: nextState,
        updatedAt: serverTimestamp(),
      });
      await logAuditEvent(
        { uid: currentUser?.uid || 'admin', displayName: currentUser?.displayName, email: currentUser?.email },
        nextState ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
        'USERS',
        `${nextState ? 'Activated' : 'Deactivated'} user ${u.displayName} (${u.email})`,
        u.uid
      );
      await loadUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to update user status');
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.displayName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column<AppUser>[] = [
    {
      key: 'displayName',
      header: 'User & Profile',
      sortable: true,
      render: (u) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-indigo-700">
            {u.displayName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <span className="font-semibold text-slate-900 block">{u.displayName}</span>
            <span className="text-xs text-slate-500 block">{u.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role & Permissions',
      sortable: true,
      render: (u) => <RoleBadge role={u.role} />,
    },
    {
      key: 'active',
      header: 'Account Status',
      render: (u) => (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            u.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {u.active ? 'Active' : 'Disabled'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created On',
      render: (u) => <span className="text-xs text-slate-500">{formatDate(u.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (u) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => openEditModal(u)}
            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-indigo-50 transition"
            title="Edit Role"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleToggleActive(u)}
            className={`p-1.5 rounded-md transition ${
              u.active
                ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
            }`}
            title={u.active ? 'Deactivate User' : 'Activate User'}
          >
            {u.active ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          </button>
        </div>
      ),
    },
  ];

  if (!isSuperAdmin) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
        <Shield className="w-12 h-12 text-rose-400 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900">Access Restricted</h3>
        <p className="text-xs text-slate-500 mt-1">
          Only users with the <strong className="text-slate-800">SUPER_ADMIN</strong> role can access user management and RBAC credentials.
        </p>
      </div>
    );
  }

  if (loading) return <LoadingPage message="Loading users & role permissions..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Users & Role-Based Access Control</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage system operators and assign tiered permissions (SUPER_ADMIN, ADMIN, STAFF).
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition"
        >
          <UserPlus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search users by name, email, or role..."
        />
      </div>

      {/* Users Table */}
      <DataTable
        id="users-table"
        columns={columns}
        data={filteredUsers}
        keyExtractor={(u) => u.uid}
        emptyTitle="No users found"
        emptyDescription="Create a user profile to grant staff or admin access."
      />

      {/* Add / Edit Role Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 my-auto overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh]">
            <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                {editingUser ? 'Edit User Permissions' : 'Create User Profile'}
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
                {errorMsg && (
                  <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    placeholder="e.g. Alexander Vance"
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    disabled={!!editingUser}
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="alexander@inventorypro.com"
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assigned Security Role *
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="SUPER_ADMIN">SUPER_ADMIN (Full system privileges, settings, users, audit)</option>
                    <option value="ADMIN">ADMIN (Catalog, suppliers, adjustments, reports, stock)</option>
                    <option value="STAFF">STAFF (Stock in, stock out, inventory balance viewing)</option>
                  </select>
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
                  {formSubmitting ? 'Saving...' : editingUser ? 'Update User Role' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
