import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, AlertCircle, AlertTriangle, Info, Package, ExternalLink } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';
import { formatDate } from '../../lib/utils';

export function NotificationBell({ onNavigateProduct }: { onNavigateProduct?: (productId: string) => void }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={panelRef}>
      <button
        id="notification-bell-btn"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/70">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-800">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllAsRead()}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs">No notifications yet</p>
              </div>
            ) : (
              notifications.map((item) => {
                const isOut = item.type === 'OUT_OF_STOCK';
                const isLow = item.type === 'LOW_STOCK';

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (!item.read && item.id) markAsRead(item.id);
                      if (item.productId && onNavigateProduct) {
                        onNavigateProduct(item.productId);
                        setIsOpen(false);
                      }
                    }}
                    className={`p-3.5 flex gap-3 transition cursor-pointer hover:bg-slate-50 ${
                      !item.read ? 'bg-indigo-50/30' : ''
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg shrink-0 self-start ${
                        isOut
                          ? 'bg-rose-100 text-rose-600'
                          : isLow
                          ? 'bg-amber-100 text-amber-600'
                          : 'bg-indigo-100 text-indigo-600'
                      }`}
                    >
                      {isOut ? (
                        <AlertCircle className="w-4 h-4" />
                      ) : isLow ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : (
                        <Package className="w-4 h-4" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4
                          className={`text-xs font-semibold truncate ${
                            !item.read ? 'text-slate-900' : 'text-slate-700'
                          }`}
                        >
                          {item.title}
                        </h4>
                        {!item.read && (
                          <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                        {item.message}
                      </p>
                      <div className="flex items-center justify-between mt-1.5 text-[11px] text-slate-400">
                        <span>{formatDate(item.createdAt)}</span>
                        {item.productId && (
                          <span className="text-indigo-600 font-medium flex items-center gap-0.5">
                            View <ExternalLink className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
