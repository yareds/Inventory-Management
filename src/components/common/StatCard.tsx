import React from 'react';

interface StatCardProps {
  id: string;
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  alert?: boolean;
  accentColor?: 'blue' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'purple' | 'slate';
  onClick?: () => void;
}

export function StatCard({
  id,
  title,
  value,
  subtitle,
  icon,
  alert,
  accentColor = 'slate',
  onClick,
}: StatCardProps) {
  const colorStyles: Record<string, { iconBg: string; text: string; border: string }> = {
    blue: { iconBg: 'bg-blue-50 text-blue-600', text: 'text-blue-600', border: 'hover:border-blue-300' },
    emerald: { iconBg: 'bg-emerald-50 text-emerald-600', text: 'text-green-600', border: 'hover:border-emerald-300' },
    amber: { iconBg: 'bg-amber-50 text-amber-600', text: 'text-amber-600', border: 'hover:border-amber-300' },
    rose: { iconBg: 'bg-rose-50 text-rose-600', text: 'text-red-500', border: 'hover:border-rose-300' },
    indigo: { iconBg: 'bg-indigo-50 text-indigo-600', text: 'text-indigo-600', border: 'hover:border-indigo-300' },
    purple: { iconBg: 'bg-purple-50 text-purple-600', text: 'text-purple-600', border: 'hover:border-purple-300' },
    slate: { iconBg: 'bg-slate-100 text-slate-600', text: 'text-slate-500', border: 'hover:border-slate-300' },
  };

  const scheme = colorStyles[accentColor] || colorStyles.slate;

  return (
    <div
      id={id}
      onClick={onClick}
      className={`bg-white rounded-xl p-5 border shadow-sm transition-all duration-150 ${scheme.border} ${
        onClick ? 'cursor-pointer hover:shadow-md' : ''
      } ${alert ? 'border-red-200 ring-2 ring-red-100' : 'border-slate-200'}`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`text-xs font-bold uppercase tracking-wider ${
            alert ? 'text-red-400' : 'text-slate-400'
          }`}
        >
          {title}
        </span>
        {icon && <div className={`p-1.5 rounded-md ${scheme.iconBg}`}>{icon}</div>}
      </div>
      <div className="mt-2 flex items-baseline justify-between">
        <span className="text-3xl font-light text-slate-900 tracking-tight">
          {value}
        </span>
      </div>
      {subtitle && (
        <p
          className={`text-xs mt-2 font-medium truncate ${
            alert ? 'text-red-500' : scheme.text
          }`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
