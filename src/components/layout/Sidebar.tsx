import React from 'react';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Boxes,
  ArrowDownToLine,
  ArrowUpFromLine,
  SlidersHorizontal,
  History,
  Truck,
  BarChart3,
  Users,
  ShieldAlert,
  Settings,
  X,
  CheckCircle2,
  Sparkles,
  Scan,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { RoleBadge } from '../common/Badges';

export type NavigationItem =
  | 'dashboard'
  | 'barcode-scanner'
  | 'products'
  | 'product-detail'
  | 'categories'
  | 'inventory'
  | 'stock-in'
  | 'stock-out'
  | 'adjustments'
  | 'movements'
  | 'suppliers'
  | 'supplier-detail'
  | 'reports'
  | 'notifications'
  | 'users'
  | 'audit-logs'
  | 'settings'
  | 'e2e-test';

interface SidebarProps {
  currentTab: NavigationItem;
  onSelectTab: (tab: NavigationItem) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ currentTab, onSelectTab, isOpenMobile, onCloseMobile }: SidebarProps) {
  const { role, isSuperAdmin, isAdmin, isStaff } = useAuth();

  const navGroups = [
    {
      title: 'Overview',
      items: [
        { id: 'dashboard' as NavigationItem, label: 'Dashboard', icon: LayoutDashboard, visible: true },
        { id: 'inventory' as NavigationItem, label: 'Inventory Stock', icon: Boxes, visible: true },
      ],
    },
    {
      title: 'Catalog',
      items: [
        { id: 'products' as NavigationItem, label: 'Products', icon: Package, visible: true },
        { id: 'categories' as NavigationItem, label: 'Categories', icon: FolderTree, visible: isAdmin },
        { id: 'suppliers' as NavigationItem, label: 'Suppliers', icon: Truck, visible: isAdmin },
      ],
    },
    {
      title: 'Operations',
      items: [
        { id: 'barcode-scanner' as NavigationItem, label: 'Barcode Scanner', icon: Scan, visible: true },
        { id: 'stock-in' as NavigationItem, label: 'Stock In (Receive)', icon: ArrowDownToLine, visible: isStaff },
        { id: 'stock-out' as NavigationItem, label: 'Stock Out (Issue)', icon: ArrowUpFromLine, visible: isStaff },
        { id: 'adjustments' as NavigationItem, label: 'Stock Adjustments', icon: SlidersHorizontal, visible: isAdmin },
        { id: 'movements' as NavigationItem, label: 'Movement History', icon: History, visible: true },
      ],
    },
    {
      title: 'Intelligence & Audit',
      items: [
        { id: 'reports' as NavigationItem, label: 'Reports', icon: BarChart3, visible: isAdmin },
        { id: 'audit-logs' as NavigationItem, label: 'Audit Trail', icon: ShieldAlert, visible: isSuperAdmin },
      ],
    },
    {
      title: 'Administration',
      items: [
        { id: 'users' as NavigationItem, label: 'Users & Roles', icon: Users, visible: isSuperAdmin },
        { id: 'settings' as NavigationItem, label: 'System Settings', icon: Settings, visible: true },
        { id: 'e2e-test' as NavigationItem, label: 'E2E Flow Tester', icon: CheckCircle2, visible: true },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="app-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-[#0f172a] text-slate-300 flex flex-col transition-transform duration-200 ease-in-out border-r border-slate-800 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800 bg-[#0b1120]">
          <div className="flex items-center min-w-0">
            <span className="w-8 h-8 shrink-0 bg-blue-500 rounded mr-2.5 flex items-center justify-center text-xs font-bold text-white shadow-xs">
              IM
            </span>
            <div className="min-w-0">
              <h1 className="text-white font-bold text-sm tracking-tight flex items-center leading-tight truncate">
                Inventory Management
              </h1>
              <span className="block text-[10px] text-slate-400 font-mono tracking-tight mt-0.5">ENTERPRISE SYSTEM</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {navGroups.map((group) => {
            const visibleItems = group.items.filter((item) => item.visible);
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.title}>
                <div className="px-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  {group.title}
                </div>
                <nav className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentTab === item.id;

                    return (
                      <button
                        key={item.id}
                        id={`nav-item-${item.id}`}
                        type="button"
                        onClick={() => {
                          onSelectTab(item.id);
                          onCloseMobile();
                        }}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium transition-colors ${
                          isActive
                            ? 'text-white bg-slate-800 font-semibold shadow-xs'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 opacity-80 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                        <span className="truncate">{item.label}</span>
                        {item.id === 'e2e-test' && (
                          <span className="ml-auto px-1.5 py-0.5 rounded text-[9px] font-mono bg-blue-500/20 text-blue-300 border border-blue-400/30">
                            TESTS
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>
            );
          })}
        </div>

        {/* Current Role & User Profile Ribbon */}
        <div className="p-3 bg-slate-950 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                {role ? role.slice(0, 2) : 'US'}
              </div>
              <div className="ml-2.5 min-w-0">
                <div className="text-xs font-medium text-white truncate">Active Operator</div>
                <div className="text-[10px] text-slate-400 font-mono truncate">{role}</div>
              </div>
            </div>
            <RoleBadge role={role} />
          </div>
        </div>
      </aside>
    </>
  );
}
