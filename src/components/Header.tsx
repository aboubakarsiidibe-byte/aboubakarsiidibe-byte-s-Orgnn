import React, { useState } from 'react';
import {
  Search,
  Bell,
  AlertTriangle,
  XCircle,
  RefreshCw,
  LogIn,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface HeaderProps {
  onSearch: (query: string) => void;
  onRefresh: () => void;
  lowStockItems: any[];
  outOfStockItems: any[];
  onNavigateToProducts: (filterStatus?: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onSearch,
  onRefresh,
  lowStockItems,
  outOfStockItems,
  onNavigateToProducts,
}) => {
  const { user, loginWithGoogle, loginAsDemo } = useAuth();
  const [searchVal, setSearchVal] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const totalAlerts = lowStockItems.length + outOfStockItems.length;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchVal);
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Global Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative w-80 lg:w-96">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchVal}
          onChange={(e) => {
            setSearchVal(e.target.value);
            onSearch(e.target.value);
          }}
          placeholder="Recherche produit, référence SKU, code-barres..."
          className="w-full pl-10 pr-4 py-2 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-amber-500 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none transition-all focus:ring-2 focus:ring-amber-500/20"
        />
      </form>

      {/* Right controls */}
      <div className="flex items-center space-x-3">
        {/* Refresh button */}
        <button
          onClick={onRefresh}
          title="Actualiser les données"
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Alertes de stock"
          >
            <Bell className="w-5 h-5" />
            {totalAlerts > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {totalAlerts}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="font-semibold text-sm text-slate-800">Alertes de Stock ({totalAlerts})</span>
                <span className="text-xs text-slate-400">Temps réel</span>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {totalAlerts === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500 flex flex-col items-center">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 mb-1" />
                    <span>Tous les stocks sont à un niveau optimal.</span>
                  </div>
                ) : (
                  <>
                    {outOfStockItems.map((item) => (
                      <div
                        key={'out-' + item.id}
                        onClick={() => {
                          setShowNotifications(false);
                          onNavigateToProducts('out_of_stock');
                        }}
                        className="p-3 hover:bg-red-50/50 cursor-pointer transition-colors flex items-start space-x-3"
                      >
                        <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <div className="flex-1 text-xs">
                          <p className="font-semibold text-slate-800">{item.name}</p>
                          <p className="text-slate-500 font-mono text-[11px]">{item.sku}</p>
                          <span className="inline-block mt-1 font-semibold text-red-600 bg-red-100 px-1.5 py-0.5 rounded text-[10px]">
                            Rupture totale (0 {item.unit})
                          </span>
                        </div>
                      </div>
                    ))}

                    {lowStockItems.map((item) => (
                      <div
                        key={'low-' + item.id}
                        onClick={() => {
                          setShowNotifications(false);
                          onNavigateToProducts('low_stock');
                        }}
                        className="p-3 hover:bg-amber-50/50 cursor-pointer transition-colors flex items-start space-x-3"
                      >
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div className="flex-1 text-xs">
                          <p className="font-semibold text-slate-800">{item.name}</p>
                          <p className="text-slate-500 font-mono text-[11px]">{item.sku}</p>
                          <span className="inline-block mt-1 font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded text-[10px]">
                            Stock faible : {item.currentStock} {item.unit} (Seuil: {item.minStockThreshold})
                          </span>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {totalAlerts > 0 && (
                <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 text-center">
                  <button
                    onClick={() => {
                      setShowNotifications(false);
                      onNavigateToProducts('low_stock');
                    }}
                    className="text-xs font-semibold text-amber-600 hover:text-amber-700"
                  >
                    Voir tous les articles en alerte →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Role Quick Switch Menu (for testing and verification) */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center space-x-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 transition-colors"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                user?.role === 'admin' ? 'bg-amber-500' : 'bg-sky-500'
              }`}
            />
            <span className="capitalize">{user?.role === 'admin' ? 'Administrateur' : 'Magasinier'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50 text-xs">
              <div className="px-3 py-2 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase">
                Changer de rôle (Test de permissions)
              </div>
              <button
                onClick={() => {
                  loginAsDemo('admin');
                  setShowRoleMenu(false);
                }}
                className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 ${
                  user?.role === 'admin' ? 'font-bold text-amber-600' : 'text-slate-700'
                }`}
              >
                <span>Administrateur (Accès Total)</span>
                {user?.role === 'admin' && <CheckCircle2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => {
                  loginAsDemo('storekeeper');
                  setShowRoleMenu(false);
                }}
                className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 ${
                  user?.role === 'storekeeper' ? 'font-bold text-sky-600' : 'text-slate-700'
                }`}
              >
                <span>Magasinier (Opérations de Stock)</span>
                {user?.role === 'storekeeper' && <CheckCircle2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>

        {/* Google Login button */}
        {!user?.uid.startsWith('firebase-') && (
          <button
            onClick={() => loginWithGoogle()}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Connexion Google</span>
          </button>
        )}
      </div>
    </header>
  );
};
