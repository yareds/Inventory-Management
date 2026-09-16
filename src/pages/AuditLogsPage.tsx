import React, { useState, useEffect } from 'react';
import { ShieldAlert, Download, Search, Shield, Filter, Calendar } from 'lucide-react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { AuditLog } from '../types';
import { DataTable, Column } from '../components/common/DataTable';
import { SearchInput } from '../components/common/SearchInput';
import { LoadingPage } from '../components/common/LoadingState';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../lib/utils';
import { ReportService } from '../services/reportService';
import { DEMO_AUDIT_LOGS } from '../lib/demoData';

export function AuditLogsPage() {
  const { isSuperAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>(DEMO_AUDIT_LOGS);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('ALL');

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(200))
      );
      if (snap.docs.length > 0) {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as AuditLog[];
        setLogs(list);
      } else {
        setLogs(DEMO_AUDIT_LOGS);
      }
    } catch {
      setLogs(DEMO_AUDIT_LOGS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      loadAuditLogs();
    }
  }, [isSuperAdmin]);

  const filteredLogs = logs.filter((log) => {
    const matchSearch =
      !search ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.module.toLowerCase().includes(search.toLowerCase()) ||
      log.description.toLowerCase().includes(search.toLowerCase()) ||
      (log.userEmail && log.userEmail.toLowerCase().includes(search.toLowerCase())) ||
      (log.userName && log.userName.toLowerCase().includes(search.toLowerCase()));

    const matchModule = moduleFilter === 'ALL' || log.module === moduleFilter;

    return matchSearch && matchModule;
  });

  const handleExport = () => {
    const rows = filteredLogs.map((l) => ({
      Timestamp: formatDate(l.timestamp),
      User: l.userName || l.userEmail || 'System',
      Action: l.action,
      Module: l.module,
      Description: l.description,
      'Entity ID': l.entityId || 'N/A',
    }));
    ReportService.exportToCSV('audit-logs', rows);
  };

  if (!isSuperAdmin) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
        <Shield className="w-12 h-12 text-rose-400 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900">Access Restricted</h3>
        <p className="text-xs text-slate-500 mt-1">
          Only users with the <strong className="text-slate-800">SUPER_ADMIN</strong> role have security clearances to review compliance audit logs.
        </p>
      </div>
    );
  }

  if (loading) return <LoadingPage message="Loading system audit trails..." />;

  const columns: Column<AuditLog>[] = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      sortable: true,
      render: (l) => <span className="text-xs text-slate-500 whitespace-nowrap">{formatDate(l.timestamp || l.createdAt)}</span>,
    },
    {
      key: 'module',
      header: 'Module',
      sortable: true,
      render: (l) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700">
          {l.module}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      sortable: true,
      render: (l) => (
        <span className="font-mono text-xs font-semibold text-slate-800">
          {l.action}
        </span>
      ),
    },
    {
      key: 'description',
      header: 'Event Description',
      render: (l) => <span className="text-xs text-slate-700">{l.description}</span>,
    },
    {
      key: 'userName',
      header: 'Triggered By',
      render: (l) => (
        <div className="text-xs">
          <span className="font-medium text-slate-900 block">{l.userName || 'System'}</span>
          {l.userEmail && <span className="text-[11px] text-slate-400 block">{l.userEmail}</span>}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Security & Compliance Audit Logs</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable trace of administrative events, security changes, catalog operations, and stock movements.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-xs transition"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          Export Audit Trail CSV
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by action, user, or description..."
        />

        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-indigo-500"
        >
          <option value="ALL">All System Modules</option>
          <option value="PRODUCTS">Products Module</option>
          <option value="CATEGORIES">Categories Module</option>
          <option value="INVENTORY">Inventory Movements</option>
          <option value="SUPPLIERS">Suppliers Module</option>
          <option value="USERS">Users & Security</option>
          <option value="SETTINGS">System Settings</option>
        </select>
      </div>

      {/* Table */}
      <DataTable
        id="audit-logs-table"
        columns={columns}
        data={filteredLogs}
        keyExtractor={(l) => l.id || Math.random().toString()}
        emptyTitle="No audit events found"
        emptyDescription="System actions will be recorded here automatically."
      />
    </div>
  );
}
