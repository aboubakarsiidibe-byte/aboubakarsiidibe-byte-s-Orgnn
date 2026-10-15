import React from 'react';
import {
  LayoutDashboard,
  Package,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  Truck,
  ClipboardCheck,
  BarChart3,
  Settings,
  ShieldCheck,
  LogOut,
  UserCheck,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  lowStockCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, lowStockCount }) => {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';

  const menuItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'products', label: 'Produits', icon: Package, badge: lowStockCount > 0 ? lowStockCount : undefined },
    { id: 'categories', label: 'Catégories', icon: Layers },
    { id: 'stock-entry', label: 'Entrées de stock', icon: ArrowDownLeft, color: 'text-emerald-400' },
    { id: 'stock-exit', label: 'Sorties de stock', icon: ArrowUpRight, color: 'text-amber-400' },
    { id: 'returns', label: 'Retours de marchandise', icon: RotateCcw, color: 'text-purple-400' },
    { id: 'movements', label: 'Historique des mouvements', icon: History },
    { id: 'suppliers', label: 'Fournisseurs', icon: Truck },
    { id: 'inventory', label: 'Inventaire physique', icon: ClipboardCheck },
    { id: 'reports', label: 'Rapports & Valorisation', icon: BarChart3 },
    { id: 'settings', label: 'Paramètres & Rôles', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-200 flex flex-col shrink-0 min-h-screen">
      {/* Brand logo */}
      <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-sm">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center space-x-1.5">
            <span className="font-bold text-lg text-white tracking-tight">SecuStock</span>
            <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-amber-500 text-slate-950">
              Pro
            </span>
          </div>
          <p className="text-xs text-slate-400">Gestion de Stock Sécurité</p>
        </div>
      </div>

      {/* Role Pill Banner */}
      <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800/80">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <UserCheck className={`w-3.5 h-3.5 ${isAdmin ? 'text-amber-400' : 'text-sky-400'}`} />
            <span className="text-slate-300 font-medium truncate max-w-[110px]">
              {user?.displayName || user?.email?.split('@')[0] || 'Utilisateur'}
            </span>
          </div>
          <span
            className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
              isAdmin
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                : 'bg-sky-500/15 border-sky-500/30 text-sky-400'
            }`}
          >
            {isAdmin ? 'Administrateur' : 'Magasinier'}
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Menu Principal
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : item.color || 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-slate-950 text-amber-400' : 'bg-red-500/20 border border-red-500/40 text-red-400'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Store status and Sign out */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40 space-y-2">
        <div className="px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Magasin Central</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Devise: FCFA</span>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
};
