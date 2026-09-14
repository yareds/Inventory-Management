import React, { useState } from 'react';
import { Menu, LogOut, UserCircle, Database, ChevronDown, Check, Search, Scan } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { NotificationBell } from '../notifications/NotificationBell';
import { UserRole } from '../../types';
import { seedDatabase } from '../../lib/seed';

interface HeaderProps {
  onOpenMobileNav: () => void;
  onNavigateTab: (tab: any) => void;
  onNavigateProduct?: (productId: string) => void;
  onOpenLoginModal?: () => void;
}

export function Header({ onOpenMobileNav, onNavigateTab, onNavigateProduct, onOpenLoginModal }: HeaderProps) {
  const { currentUser, role, switchDemoRole, logout, isDemoUser } = useAuth();
  const { settings } = useSettings();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [headerSearch, setHeaderSearch] = useState('');

  const handleSeed = async () => {
    if (window.confirm('Seed database with 30+ products, 8+ categories, 5+ suppliers, stock transactions, and demo alerts?')) {
      setIsSeeding(true);
      const res = await seedDatabase(currentUser?.email);
      setIsSeeding(false);
      alert(res.message);
      window.location.reload();
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 shadow-2xs">
      {/* Left section: Hamburger & Search Box */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Technical Global Search Bar */}
        <div className="flex-1 relative hidden sm:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={headerSearch}
            onChange={(e) => setHeaderSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onNavigateTab('products');
              }
            }}
            placeholder="Search SKU, product, or supplier..."
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
          />
        </div>

        <div className="sm:hidden flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-800 truncate">
            {settings.businessName || 'Inventory Management'}
          </span>
        </div>
      </div>

      {/* Right Section: System Telemetry, Seed, Role Switcher, Notification Bell, User */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Firebase Live Status Indicator (Design Theme) */}
        <div className="hidden lg:flex items-center space-x-2 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200/80">
          <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
          <span className="text-[11px] font-mono text-slate-600">Firebase: Online</span>
        </div>

        <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

        {/* Quick Demo Seed Button */}
        <button
          type="button"
          onClick={handleSeed}
          disabled={isSeeding}
          className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 rounded-md transition border border-slate-200 shadow-2xs"
          title="Seed complete demo dataset"
        >
          <Database className="w-3.5 h-3.5 text-blue-600" />
          <span>{isSeeding ? 'Seeding...' : 'Seed Data'}</span>
        </button>

        {/* Role Switcher Pill */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setRoleMenuOpen(!roleMenuOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 transition"
          >
            <span className="text-slate-400 hidden sm:inline text-[11px]">Role:</span>
            <span className="font-semibold text-blue-700 font-mono text-[11px]">{role}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {roleMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50 animate-in fade-in duration-150">
              <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                Switch Test Role
              </div>
              {(['SUPER_ADMIN', 'ADMIN', 'STAFF'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    switchDemoRole(r);
                    setRoleMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-slate-50 transition font-mono"
                >
                  <span className={role === r ? 'font-semibold text-blue-600' : 'text-slate-700'}>
                    {r}
                  </span>
                  {role === r && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Barcode Scanner Quick Launch */}
        <button
          type="button"
          onClick={() => onNavigateTab('barcode-scanner')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-lg transition"
          title="Open Barcode Scanner Terminal"
        >
          <Scan className="w-4 h-4 text-blue-600" />
          <span className="hidden md:inline">Scanner</span>
        </button>

        {/* Notification Bell */}
        <NotificationBell onNavigateProduct={onNavigateProduct} />

        {/* User Profile */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-1 text-slate-700 hover:text-slate-900 rounded-md transition"
          >
            <div className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
              {currentUser?.displayName ? currentUser.displayName.slice(0, 2).toUpperCase() : 'JD'}
            </div>
            <span className="text-xs font-medium hidden md:inline-block max-w-[110px] truncate text-slate-800">
              {currentUser?.displayName || currentUser?.email || 'Operator'}
            </span>
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50 animate-in fade-in duration-150">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {currentUser?.displayName || 'John Doe'}
                </p>
                <p className="text-[11px] text-slate-500 truncate">{currentUser?.email}</p>
                <span className="inline-block mt-1 text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                  {role} {isDemoUser ? '(Demo)' : ''}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen(false);
                  onNavigateTab('settings');
                }}
                className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <UserCircle className="w-4 h-4 text-slate-400" />
                Settings & Configuration
              </button>

              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen(false);
                  logout();
                }}
                className="w-full text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 border-t border-slate-100"
              >
                <LogOut className="w-4 h-4 text-rose-500" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
