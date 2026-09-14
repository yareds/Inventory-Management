import React, { useEffect, useState } from 'react';
import { Search, X, Scan } from 'lucide-react';
import { BarcodeScannerModal } from './BarcodeScannerModal';

interface SearchInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
  enableScanner?: boolean;
}

export function SearchInput({
  id = 'search-input',
  value,
  onChange,
  placeholder = 'Search by name, SKU, or barcode...',
  debounceMs = 300,
  className = '',
  enableScanner = true,
}: SearchInputProps) {
  const [localVal, setLocalVal] = useState(value);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  useEffect(() => {
    setLocalVal(value);
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localVal !== value) {
        onChange(localVal);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [localVal, debounceMs]);

  const handleScanCapture = (barcode: string) => {
    setLocalVal(barcode);
    onChange(barcode);
  };

  return (
    <>
      <div className={`relative flex items-center ${className}`}>
        <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          id={id}
          type="text"
          value={localVal}
          onChange={(e) => setLocalVal(e.target.value)}
          placeholder={placeholder}
          className={`w-full pl-9 ${
            enableScanner ? (localVal ? 'pr-16' : 'pr-10') : localVal ? 'pr-8' : 'pr-3'
          } py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition`}
        />

        <div className="absolute right-2 flex items-center gap-1">
          {localVal ? (
            <button
              type="button"
              onClick={() => {
                setLocalVal('');
                onChange('');
              }}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-full transition"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}

          {enableScanner && (
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition"
              title="Scan barcode with camera"
              aria-label="Scan barcode"
            >
              <Scan className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanCapture}
        title="Quick Barcode Search"
        subtitle="Point camera to instantly filter catalog by barcode"
      />
    </>
  );
}
