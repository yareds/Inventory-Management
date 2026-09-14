import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  id: string;
  columns: Column<T>[];
  data: T[];
  pageSize?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
  keyExtractor: (row: T) => string;
}

export function DataTable<T extends Record<string, any>>({
  id,
  columns,
  data,
  pageSize = 10,
  emptyTitle = 'No records found',
  emptyDescription = 'There is currently no data matching this criteria.',
  onRowClick,
  keyExtractor,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const sortedData = React.useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortAsc ? valA - valB : valB - valA;
      }
      return sortAsc
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [data, sortKey, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const pageIndex = Math.min(currentPage, totalPages);
  const paginatedData = sortedData.slice((pageIndex - 1) * pageSize, pageIndex * pageSize);

  if (data.length === 0) {
    return <EmptyState id={`${id}-empty`} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div id={id} className="w-full bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-[10px] uppercase text-slate-400 font-bold border-b border-slate-200 tracking-wider ${col.className || ''} ${
                    col.sortable ? 'cursor-pointer select-none hover:bg-slate-100/80 transition' : ''
                  }`}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col.header}</span>
                    {col.sortable && (
                      <ChevronsUpDown
                        className={`w-3.5 h-3.5 ${
                          sortKey === col.key ? 'text-blue-600' : 'text-slate-400'
                        }`}
                      />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-xs divide-y divide-slate-100">
            {paginatedData.map((row) => {
              const key = keyExtractor(row);
              return (
                <tr
                  key={key}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 text-slate-700 ${col.className || ''}`}>
                      {col.render ? col.render(row) : row[col.key] !== undefined ? String(row[col.key]) : '—'}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50/70 text-xs text-slate-500">
          <div>
            Showing <span className="font-mono font-medium text-slate-700">{(pageIndex - 1) * pageSize + 1}</span> to{' '}
            <span className="font-mono font-medium text-slate-700">{Math.min(pageIndex * pageSize, sortedData.length)}</span> of{' '}
            <span className="font-mono font-medium text-slate-700">{sortedData.length}</span> entries
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={pageIndex <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-mono text-slate-700">
              Page {pageIndex} / {totalPages}
            </span>
            <button
              type="button"
              disabled={pageIndex >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
