import React from 'react';
import {
  Package,
  Layers,
  TrendingDown,
  AlertTriangle,
  XCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Database,
  ArrowRight,
  Sparkles,
  ClipboardList,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { formatFCFA } from '../services/api.ts';

interface DashboardViewProps {
  stats: any;
  loading: boolean;
  onNavigate: (view: string, filter?: string) => void;
  onSeedDemo: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ stats, loading, onNavigate, onSeedDemo }) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-slate-500">Chargement des données en temps réel...</p>
      </div>
    );
  }

  const isEmptyStore = !stats || stats.totalReferences === 0;

  return (
    <div className="space-y-6">
      {/* Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tableau de Bord</h1>
          <p className="text-sm text-slate-500">
            Supervision globale du stock de matériel de sécurité • Valeurs en FCFA
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('stock-entry')}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Entrée Marchandise</span>
          </button>
          <button
            onClick={() => onNavigate('stock-exit')}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Sortie Matériel</span>
          </button>
          <button
            onClick={() => onNavigate('inventory')}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <ClipboardList className="w-4 h-4" />
            <span>Inventaire Physique</span>
          </button>
        </div>
      </div>

      {/* Empty State Banner */}
      {isEmptyStore && (
        <div className="p-6 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-amber-500/20 text-amber-600 rounded-xl">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Le magasin est actuellement vide</h3>
              <p className="text-sm text-slate-600 mt-0.5">
                Toutes les statistiques affichent 0 car aucun article n'a encore été créé. Vous pouvez ajouter manuellement vos articles ou charger le jeu de données officiel d'équipements de sécurité (caméras, NVR, alarmes, contrôle d'accès).
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={onSeedDemo}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center space-x-2"
            >
              <Database className="w-4 h-4" />
              <span>Charger le jeu de démo Sécurité</span>
            </button>
            <button
              onClick={() => onNavigate('products')}
              className="px-4 py-2.5 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors"
            >
              Créer un premier produit
            </button>
          </div>
        </div>
      )}

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total References */}
        <div
          onClick={() => onNavigate('products')}
          className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Références Produits</span>
            <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-slate-200 transition-colors">
              <Package className="w-4 h-4 text-slate-700" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold text-slate-900 font-mono">{stats?.totalReferences || 0}</div>
            <span className="text-xs text-slate-400">Articles actifs</span>
          </div>
        </div>

        {/* Total Quantity */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Quantité en Stock</span>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Layers className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold text-slate-900 font-mono">
              {stats?.totalStockQuantity ? new Intl.NumberFormat('fr-FR').format(stats.totalStockQuantity) : 0}
            </div>
            <span className="text-xs text-slate-400">Unités totales</span>
          </div>
        </div>

        {/* Total Stock Valuation FCFA */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Valorisation au Coût d'Achat</span>
            <div className="p-2 bg-emerald-50 rounded-lg">
              <TrendingDown className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-700 font-mono">
              {formatFCFA(stats?.totalStockValuation || 0)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Montant réel calculé en FCFA</p>
          </div>
        </div>

        {/* Critical Alerts (Low + Out of Stock) */}
        <div
          onClick={() => onNavigate('products', 'low_stock')}
          className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-amber-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Alertes & Ruptures</span>
            <div className="p-2 bg-amber-50 rounded-lg group-hover:bg-amber-100 transition-colors">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <div className="mt-3 flex items-center space-x-4">
            <div>
              <span className="text-2xl font-bold text-amber-600 font-mono">{stats?.lowStockCount || 0}</span>
              <p className="text-[11px] text-slate-400">Stock faible</p>
            </div>
            <div className="h-8 w-px bg-slate-200"></div>
            <div>
              <span className="text-2xl font-bold text-red-600 font-mono">{stats?.outOfStockCount || 0}</span>
              <p className="text-[11px] text-slate-400">En rupture</p>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Flow Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gradient-to-r from-emerald-500/10 via-white to-white p-4 rounded-xl border border-emerald-500/20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-lg">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-emerald-800">Entrées de stock du jour</p>
              <p className="text-xs text-slate-500">Réceptions enregistrées aujourd'hui</p>
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-700 font-mono">
            +{stats?.entriesToday || 0}
          </div>
        </div>

        <div className="bg-gradient-to-r from-amber-500/10 via-white to-white p-4 rounded-xl border border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-600 text-white rounded-lg">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-amber-800">Sorties de stock du jour</p>
              <p className="text-xs text-slate-500">Ventes, chantiers et installations</p>
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-700 font-mono">
            -{stats?.exitsToday || 0}
          </div>
        </div>
      </div>

      {/* Chart & Replenishment list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Movements Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Flux des Mouvements (7 derniers jours)</h2>
              <p className="text-xs text-slate-400">Comparatif des entrées et sorties en volume</p>
            </div>
            <button
              onClick={() => onNavigate('movements')}
              className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center space-x-1"
            >
              <span>Voir l'historique complet</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.chartData || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} allowDecimals={false} />
                <Tooltip
                  formatter={(val: any, name: any) => [
                    `${val} unité(s)`,
                    name === 'entries' ? 'Entrées' : 'Sorties',
                  ]}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Legend formatter={(val) => (val === 'entries' ? 'Entrées (Réceptions)' : 'Sorties (Chantiers/Ventes)')} wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="entries" fill="#10b981" radius={[4, 4, 0, 0]} name="entries" />
                <Bar dataKey="exits" fill="#f59e0b" radius={[4, 4, 0, 0]} name="exits" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Replenishment List */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h2 className="text-base font-bold text-slate-900">À Réapprovisionner</h2>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
              {stats?.replenishmentList?.length || 0}
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-4">Articles dont le stock est inférieur ou égal au seuil minimal défini.</p>

          <div className="flex-1 overflow-y-auto space-y-2.5 max-h-60 pr-1">
            {!stats?.replenishmentList || stats.replenishmentList.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
                Aucun produit ne nécessite de réapprovisionnement pour le moment.
              </div>
            ) : (
              stats.replenishmentList.map((item: any) => {
                const isRupture = item.currentStock === 0;
                return (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-lg border border-slate-100 hover:border-slate-200 bg-slate-50/50 flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-slate-800 truncate">{item.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{item.sku}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                          isRupture
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {item.currentStock} / {item.minStockThreshold} {item.unit}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-3 mt-auto border-t border-slate-100">
            <button
              onClick={() => onNavigate('stock-entry')}
              className="w-full py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center space-x-1"
            >
              <span>Commander / Entrer du matériel</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Latest Movements Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Derniers Mouvements Enregistrés</h2>
            <p className="text-xs text-slate-400">Traçabilité en temps réel des 10 dernières opérations</p>
          </div>
          <button
            onClick={() => onNavigate('movements')}
            className="text-xs font-semibold text-amber-600 hover:text-amber-700"
          >
            Consulter tout l'historique →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200/60">
              <tr>
                <th className="px-4 py-3">Date & Heure</th>
                <th className="px-4 py-3">N° Mouvement</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Produit & Réf</th>
                <th className="px-4 py-3 text-center">Quantité</th>
                <th className="px-4 py-3 text-center">Évolution Stock</th>
                <th className="px-4 py-3">Motif / Destinataire</th>
                <th className="px-4 py-3">Opérateur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!stats?.recentMovements || stats.recentMovements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-400">
                    Aucun mouvement n'a été enregistré pour le moment.
                  </td>
                </tr>
              ) : (
                stats.recentMovements.map((m: any) => {
                  const isEntry = m.movementType === 'IN';
                  const isExit = m.movementType === 'OUT';
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {m.createdAt ? new Date(m.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-slate-800 whitespace-nowrap">
                        {m.movementNumber}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            isEntry
                              ? 'bg-emerald-100 text-emerald-800'
                              : isExit
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {isEntry ? 'Entrée' : isExit ? 'Sortie' : 'Régularisation'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{m.productName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{m.productSku}</div>
                      </td>
                      <td className="px-4 py-3 text-center font-bold font-mono whitespace-nowrap">
                        <span className={isEntry ? 'text-emerald-600' : isExit ? 'text-amber-600' : 'text-purple-600'}>
                          {isEntry ? `+${m.quantity}` : isExit ? `-${m.quantity}` : m.quantity} {m.unit || 'U'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap font-mono text-[11px] text-slate-500">
                        {m.stockBefore} → <span className="font-bold text-slate-800">{m.stockAfter}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-800">{m.reason}</div>
                        {m.recipient && <div className="text-[11px] text-slate-500">Dest.: {m.recipient}</div>}
                      </td>
                      <td className="px-4 py-3 text-slate-500 truncate max-w-[120px]">
                        {m.userEmail || 'Système'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
