import React from 'react';

export function Spinner({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-3',
  };

  return (
    <div
      className={`inline-block animate-spin rounded-full border-solid border-indigo-600 border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite] ${sizeClasses[size]} ${className}`}
      role="status"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export function LoadingPage({ message = 'Loading inventory data...' }: { message?: string }) {
  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center">
      <Spinner size="lg" />
      <p className="mt-4 text-sm font-medium text-slate-600">{message}</p>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full animate-pulse space-y-3 p-4 bg-white rounded-lg border border-slate-200">
      <div className="h-6 bg-slate-100 rounded w-1/4 mb-4" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-3 border-b border-slate-100 last:border-0">
          {Array.from({ length: cols }).map((_, j) => (
            <div
              key={j}
              className="h-4 bg-slate-100 rounded"
              style={{ width: `${Math.max(10, 100 / cols - 2)}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
