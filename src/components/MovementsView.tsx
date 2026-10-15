import React, { useState } from 'react';
import {
  History,
  Download,
  Filter,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  ClipboardCheck,
  Calendar,
} from 'lucide-react';
import { formatFCFA } from '../services/api.ts';

interface MovementsViewProps {
  movements: any[];
  categories: any[];
  products: any[];
  loading: boolean;
  onRefresh: () => void;
}

export const MovementsView: React.FC<MovementsViewProps> = ({
  movements,
  categories,
  products,
  loading,
  onRefresh,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCat, setFilterCat] = useState<number | ''>('');
  const [filterProd, setFilterProd] = useState<number | ''>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchReason, setSearchReason] = useState<string>('');

  const filteredMovements = movements.filter((m) => {
    if (filterType !== 'all' && m.movementType !== filterType) return false;
    if (filterCat !== '' && m.categoryId !== filterCat) return false;
    if (filterProd !== '' && m.productId !== filterProd) return false;

    if (searchReason.trim()) {
      const q = searchReason.toLowerCase().trim();
      const match =
        (m.reason && m.reason.toLowerCase().includes(q)) ||
        (m.movementNumber && m.movementNumber.toLowerCase().includes(q)) ||
        (m.recipient && m.recipient.toLowerCase().includes(q)) ||
        (m.supplierName && m.supplierName.toLowerCase().includes(q)) ||
        (m.documentRef && m.documentRef.toLowerCase().includes(q));
      if (!match) return false;
    }

    if (startDate && m.createdAt) {
      if (new Date(m.createdAt) < new Date(startDate)) return false;
    }
    if (endDate && m.createdAt) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (new Date(m.createdAt) > end) return false;
    }

    return true;
  });

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (filterType !== 'all') params.set('movementType', filterType);
    if (filterCat !== '') params.set('categoryId', filterCat.toString());
    if (filterProd !== '') params.set('productId', filterProd.toString());
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);

    window.location.href = `/api/movements/export-csv?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <History className="w-6 h-6 text-slate-700" />
            <span>Historique des Mouvements de Stock</span>
          </h1>
          <p className="text-sm text-slate-500">
            Traçabilité intégrale et inaltérable des entrées, sorties et régularisations
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="flex items-center space-x-1.5 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-lg text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-slate-500" />
          <span>Exporter l'Historique (CSV Excel)</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Movement Type */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Type d'opération</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-amber-500"
            >
              <option value="all">Tous les types</option>
              <option value="IN">Entrées (Réceptions)</option>
              <option value="OUT">Sorties (Ventes/Chantiers)</option>
              <option value="ADJUSTMENT">Régularisations d'Inventaire</option>
            </select>
          </div>

          {/* Product Filter */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Filtrer par produit</label>
            <select
              value={filterProd}
              onChange={(e) => setFilterProd(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-amber-500"
            >
              <option value="">Tous les produits</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} - {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Date début</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Date fin</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-slate-100">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchReason}
              onChange={(e) => setSearchReason(e.target.value)}
              placeholder="Rechercher par motif, numéro de mouvement, bon de livraison, client..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-amber-500 focus:bg-white"
            />
          </div>

          {(filterType !== 'all' || filterProd !== '' || startDate || endDate || searchReason) && (
            <button
              onClick={() => {
                setFilterType('all');
                setFilterCat('');
                setFilterProd('');
                setStartDate('');
                setEndDate('');
                setSearchReason('');
              }}
              className="text-xs text-slate-500 hover:text-slate-800 whitespace-nowrap px-2 py-1"
            >
              Effacer filtres
            </button>
          )}
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200/60">
              <tr>
                <th className="px-4 py-3">Date & Heure</th>
                <th className="px-4 py-3">N° Mouvement</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Produit & Référence</th>
                <th className="px-4 py-3 text-center">Quantité</th>
                <th className="px-4 py-3 text-center">Stock Avant → Après</th>
                <th className="px-4 py-3 text-right">Coût Unitaire (FCFA)</th>
                <th className="px-4 py-3">Motif & Document</th>
                <th className="px-4 py-3">Tiers (Fournisseur/Client)</th>
                <th className="px-4 py-3">Opérateur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    Chargement de l'historique...
                  </td>
                </tr>
              ) : filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    Aucun mouvement trouvé pour cette sélection.
                  </td>
                </tr>
              ) : (
                filteredMovements.map((m) => {
                  const isEntry = m.movementType === 'IN';
                  const isExit = m.movementType === 'OUT';
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {m.createdAt ? new Date(m.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-800 whitespace-nowrap">
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
                        <div className="font-semibold text-slate-900">{m.productName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{m.productSku}</div>
                      </td>
                      <td className="px-4 py-3 text-center font-bold font-mono whitespace-nowrap">
                        <span className={isEntry ? 'text-emerald-600' : isExit ? 'text-amber-600' : 'text-purple-600'}>
                          {isEntry ? `+${m.quantity}` : isExit ? `-${m.quantity}` : m.quantity} {m.unit || 'U'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap font-mono text-[11px] text-slate-500">
                        {m.stockBefore} → <span className="font-bold text-slate-900">{m.stockAfter}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-slate-800 whitespace-nowrap">
                        {formatFCFA(m.unitCost)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{m.reason}</div>
                        {m.documentRef && (
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1 py-0.5 rounded">
                            Réf: {m.documentRef}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {m.supplierName || m.recipient || <span className="text-slate-300 italic">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-500 truncate max-w-[130px]" title={m.userEmail}>
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
