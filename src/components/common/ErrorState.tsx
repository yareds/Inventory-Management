import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  id?: string;
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({
  id = 'error-state',
  title = 'Something went wrong',
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      id={id}
      className="p-6 rounded-xl bg-red-50 border border-red-200 text-red-900 my-4 flex items-start gap-4"
    >
      <div className="p-2 rounded-lg bg-red-100 text-red-600 shrink-0">
        <AlertCircle className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <h4 className="text-sm font-semibold text-red-900">{title}</h4>
        <p className="mt-1 text-sm text-red-700">{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-800 bg-red-100 hover:bg-red-200 rounded-md transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
