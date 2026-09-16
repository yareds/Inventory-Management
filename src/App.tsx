import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { FirestoreStatusProvider } from './contexts/FirestoreStatusContext';
import { FirestoreRulesBanner } from './components/common/FirestoreRulesBanner';
import { Sidebar, NavigationItem } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { LoginPage } from './pages/LoginPage';

// Operational pages
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { InventoryPage } from './pages/InventoryPage';
import { BarcodeScannerPage } from './pages/BarcodeScannerPage';
import { StockInPage } from './pages/StockInPage';
import { StockOutPage } from './pages/StockOutPage';
import { StockAdjustmentsPage } from './pages/StockAdjustmentsPage';
import { MovementHistoryPage } from './pages/MovementHistoryPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { SupplierDetailPage } from './pages/SupplierDetailPage';
import { ReportsPage } from './pages/ReportsPage';
import { UsersPage } from './pages/UsersPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { SettingsPage } from './pages/SettingsPage';
import { CriticalE2ETester } from './components/testing/CriticalE2ETester';
import { isDatabaseEmpty, seedDatabase } from './lib/seed';
import { isDemoMode } from './lib/demoMode';

function AppContent() {
  const { currentUser, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavigationItem>('dashboard');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isAutoSeeding, setIsAutoSeeding] = useState(false);

  // Auto-seed if brand new database is empty and user is authenticated or in demo mode
  useEffect(() => {
    async function checkAndSeed() {
      if (!currentUser && !isDemoMode()) return;
      try {
        const empty = await isDatabaseEmpty();
        if (empty) {
          setIsAutoSeeding(true);
          await seedDatabase(currentUser?.email);
          setIsAutoSeeding(false);
        }
      } catch (err: any) {
        if (err?.code !== 'permission-denied' && err?.code !== 'unavailable') {
          console.warn('Initial seed note:', err?.message || err);
        }
      }
    }
    checkAndSeed();
  }, [currentUser]);

  // Navigate to product detail
  const handleSelectProduct = (productId: string) => {
    setSelectedProductId(productId);
    setCurrentTab('product-detail');
  };

  // Navigate to supplier detail
  const handleSelectSupplier = (supplierId: string) => {
    setSelectedSupplierId(supplierId);
    setCurrentTab('supplier-detail');
  };

  // Stock In shortcut
  const handleStockInProduct = (productId: string) => {
    setCurrentTab('stock-in');
  };

  // Stock Out shortcut
  const handleStockOutProduct = (productId: string) => {
    setCurrentTab('stock-out');
  };

  // Adjust Stock shortcut
  const handleAdjustProduct = (productId: string) => {
    setCurrentTab('adjustments');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
          Initializing InventoryPro...
        </span>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage onLoginSuccess={() => setCurrentTab('dashboard')} />;
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex font-sans text-slate-900">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (tab !== 'product-detail') setSelectedProductId(null);
          if (tab !== 'supplier-detail') setSelectedSupplierId(null);
        }}
        isOpenMobile={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <FirestoreRulesBanner />
        <Header
          onOpenMobileNav={() => setIsMobileNavOpen(true)}
          onNavigateTab={(tab) => setCurrentTab(tab)}
          onNavigateProduct={handleSelectProduct}
        />

        {isAutoSeeding && (
          <div className="bg-blue-600 text-white px-4 py-2 text-xs text-center font-mono font-medium tracking-wide">
            SYSTEM: Populating initial demonstration catalog & inventory records...
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && (
            <DashboardPage
              onNavigateTab={(tab) => setCurrentTab(tab)}
              onSelectProduct={handleSelectProduct}
            />
          )}

          {currentTab === 'products' && (
            <ProductsPage
              onSelectProduct={handleSelectProduct}
              onStockIn={handleStockInProduct}
              onStockOut={handleStockOutProduct}
              onAdjust={handleAdjustProduct}
            />
          )}

          {currentTab === 'product-detail' && selectedProductId && (
            <ProductDetailPage
              productId={selectedProductId}
              onBack={() => setCurrentTab('products')}
              onStockIn={handleStockInProduct}
              onStockOut={handleStockOutProduct}
              onAdjust={handleAdjustProduct}
            />
          )}

          {currentTab === 'categories' && <CategoriesPage />}

          {currentTab === 'inventory' && (
            <InventoryPage
              onSelectProduct={handleSelectProduct}
              onNavigateTab={(tab) => setCurrentTab(tab)}
            />
          )}

          {currentTab === 'barcode-scanner' && (
            <BarcodeScannerPage
              onSelectProduct={handleSelectProduct}
              onNavigateTab={(tab) => setCurrentTab(tab)}
            />
          )}

          {currentTab === 'stock-in' && <StockInPage />}

          {currentTab === 'stock-out' && <StockOutPage />}

          {currentTab === 'adjustments' && <StockAdjustmentsPage />}

          {currentTab === 'movements' && <MovementHistoryPage />}

          {currentTab === 'suppliers' && (
            <SuppliersPage onSelectSupplier={handleSelectSupplier} />
          )}

          {currentTab === 'supplier-detail' && selectedSupplierId && (
            <SupplierDetailPage
              supplierId={selectedSupplierId}
              onBack={() => setCurrentTab('suppliers')}
              onSelectProduct={handleSelectProduct}
            />
          )}

          {currentTab === 'reports' && <ReportsPage />}

          {currentTab === 'users' && <UsersPage />}

          {currentTab === 'audit-logs' && <AuditLogsPage />}

          {currentTab === 'settings' && <SettingsPage />}

          {currentTab === 'e2e-test' && <CriticalE2ETester />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <FirestoreStatusProvider>
      <AuthProvider>
        <SettingsProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </SettingsProvider>
      </AuthProvider>
    </FirestoreStatusProvider>
  );
}
