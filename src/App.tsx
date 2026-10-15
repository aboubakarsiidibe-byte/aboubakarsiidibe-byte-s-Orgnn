import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { Header } from './components/Header.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { ProductsView } from './components/ProductsView.tsx';
import { CategoriesView } from './components/CategoriesView.tsx';
import { StockEntryView } from './components/StockEntryView.tsx';
import { StockExitView } from './components/StockExitView.tsx';
import { MovementsView } from './components/MovementsView.tsx';
import { SuppliersView } from './components/SuppliersView.tsx';
import { InventoryView } from './components/InventoryView.tsx';
import { ReportsView } from './components/ReportsView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { ReturnsView } from './components/ReturnsView.tsx';
import { api } from './services/api.ts';

function MainApp() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [productFilterStatus, setProductFilterStatus] = useState<string>('all');
  const [preselectedProductId, setPreselectedProductId] = useState<number | undefined>(undefined);
  const [preselectedSupplierId, setPreselectedSupplierId] = useState<number | undefined>(undefined);

  // Global cached data
  const [dashboardStats, setDashboardStats] = useState<any | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);

  const [loading, setLoading] = useState<boolean>(true);

  const fetchAllData = async () => {
    try {
      const [dashRes, prodsRes, catsRes, suppsRes, movsRes] = await Promise.allSettled([
        api.getDashboard(),
        api.getProducts(),
        api.getCategories(),
        api.getSuppliers(),
        api.getMovements(),
      ]);

      if (dashRes.status === 'fulfilled') setDashboardStats(dashRes.value);
      if (prodsRes.status === 'fulfilled') setProducts(prodsRes.value);
      if (catsRes.status === 'fulfilled') setCategories(catsRes.value);
      if (suppsRes.status === 'fulfilled') setSuppliers(suppsRes.value);
      if (movsRes.status === 'fulfilled') setMovements(movsRes.value);
    } catch (err: any) {
      console.error('Error fetching global data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [user]);

  const handleGlobalSearch = (query: string) => {
    if (query.trim()) {
      setCurrentView('products');
    }
  };

  const handleQuickMovement = (type: 'IN' | 'OUT', productId: number) => {
    setPreselectedProductId(productId);
    if (type === 'IN') {
      setCurrentView('stock-entry');
    } else {
      setCurrentView('stock-exit');
    }
  };

  const handleQuickEntryWithSupplier = (supplierId: number) => {
    setPreselectedSupplierId(supplierId);
    setCurrentView('stock-entry');
  };

  const handleNavigateToProducts = (filterStatus?: string) => {
    if (filterStatus) {
      setProductFilterStatus(filterStatus);
    }
    setCurrentView('products');
  };

  const handleSelectCategory = (categoryId: number) => {
    setCurrentView('products');
  };

  const handleSeedDemo = async () => {
    try {
      await api.seedDemo();
      await fetchAllData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Derive notifications items
  const lowStockItems = products.filter(
    (p) => !p.isArchived && p.currentStock > 0 && p.currentStock <= p.minStockThreshold
  );
  const outOfStockItems = products.filter((p) => !p.isArchived && p.currentStock === 0);

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-800 antialiased overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        setCurrentView={(view) => {
          setCurrentView(view);
          setPreselectedProductId(undefined);
          setPreselectedSupplierId(undefined);
        }}
        lowStockCount={lowStockItems.length + outOfStockItems.length}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Sticky Top Header */}
        <Header
          onSearch={handleGlobalSearch}
          onRefresh={fetchAllData}
          lowStockItems={lowStockItems}
          outOfStockItems={outOfStockItems}
          onNavigateToProducts={handleNavigateToProducts}
        />

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {currentView === 'dashboard' && (
            <DashboardView
              stats={dashboardStats}
              loading={loading}
              onNavigate={(view, filter) => {
                if (filter) setProductFilterStatus(filter);
                setCurrentView(view);
              }}
              onSeedDemo={handleSeedDemo}
            />
          )}

          {currentView === 'products' && (
            <ProductsView
              products={products}
              categories={categories}
              loading={loading}
              onRefresh={fetchAllData}
              onQuickMovement={handleQuickMovement}
              initialFilterStatus={productFilterStatus}
            />
          )}

          {currentView === 'categories' && (
            <CategoriesView
              categories={categories}
              onRefresh={fetchAllData}
              onSelectCategory={handleSelectCategory}
            />
          )}

          {currentView === 'stock-entry' && (
            <StockEntryView
              products={products.filter((p) => !p.isArchived)}
              suppliers={suppliers}
              onSuccess={fetchAllData}
              preselectedProductId={preselectedProductId}
            />
          )}

          {currentView === 'stock-exit' && (
            <StockExitView
              products={products.filter((p) => !p.isArchived)}
              onSuccess={fetchAllData}
              preselectedProductId={preselectedProductId}
            />
          )}

          {currentView === 'returns' && (
            <ReturnsView
              products={products.filter((p) => !p.isArchived)}
              suppliers={suppliers}
              onRefreshAll={fetchAllData}
            />
          )}

          {currentView === 'movements' && (
            <MovementsView
              movements={movements}
              categories={categories}
              products={products}
              loading={loading}
              onRefresh={fetchAllData}
            />
          )}

          {currentView === 'suppliers' && (
            <SuppliersView
              suppliers={suppliers}
              onRefresh={fetchAllData}
              onQuickEntryWithSupplier={handleQuickEntryWithSupplier}
            />
          )}

          {currentView === 'inventory' && (
            <InventoryView onSuccess={fetchAllData} />
          )}

          {currentView === 'reports' && <ReportsView />}

          {currentView === 'settings' && (
            <SettingsView onRefreshAll={fetchAllData} />
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
