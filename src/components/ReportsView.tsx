import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  TrendingDown,
  Layers,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
  PieChart,
} from 'lucide-react';
import { api, formatFCFA } from '../services/api.ts';

export const ReportsView: React.FC = () => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await api.getReportsSummary();
      setData(res);
    } catch (err: any) {
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleExportStockCsv = () => {
    window.location.href = '/api/products/export-csv';
  };

  const handleExportMovementsCsv = () => {
    window.location.href = '/api/movements/export-csv';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500">Génération des rapports financiers en cours...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <BarChart3 className="w-6 h-6 text-amber-500" />
            <span>Rapports & Valorisation du Stock</span>
          </h1>
          <p className="text-sm text-slate-500">
            États financiers, répartition par famille d'équipements et synthèses opérationnelles • FCFA
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportStockCsv}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Valorisation (Excel CSV)</span>
          </button>
          <button
            onClick={handleExportMovementsCsv}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Mouvements (Excel CSV)</span>
          </button>
        </div>
      </div>

      {/* Global Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Valorisation Globale au Coût d'Achat
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-2">
            {formatFCFA(data?.totalValuation || 0)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Basé sur {data?.totalProductsCount || 0} références d'équipements
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Équipements en Rupture Totale
          </span>
          <div className="text-2xl font-bold font-mono text-red-600 mt-2">
            {data?.outOfStock?.length || 0} référence(s)
          </div>
          <p className="text-xs text-slate-500 mt-1">Articles avec un stock égal à zéro</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Articles Sous Seuil d'Alerte
          </span>
          <div className="text-2xl font-bold font-mono text-amber-600 mt-2">
            {data?.lowStock?.length || 0} référence(s)
          </div>
          <p className="text-xs text-slate-500 mt-1">Nécessitent un réapprovisionnement rapide</p>
        </div>
      </div>

      {/* Valuation Breakdown by Category Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Valorisation par Famille d'Équipements</h2>
            <p className="text-xs text-slate-400">Répartition des capitaux immobilisés en magasin</p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {data?.valuationByCat?.length || 0} familles
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200/60">
              <tr>
                <th className="px-4 py-3">Catégorie</th>
                <th className="px-4 py-3 text-center">Nombre de Références</th>
                <th className="px-4 py-3 text-center">Quantité Totale en Stock</th>
                <th className="px-4 py-3 text-right">Valeur au Coût d'Achat (FCFA)</th>
                <th className="px-4 py-3 text-right">Part du Stock Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.valuationByCat?.map((c: any) => {
                const totalVal = data?.totalValuation || 1;
                const sharePercent = totalVal > 0 ? ((c.totalValuation / totalVal) * 100).toFixed(1) : '0';
                return (
                  <tr key={c.categoryId} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {c.categoryName}
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-medium">
                      {c.productsCount}
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-slate-800">
                      {c.totalQty}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {formatFCFA(c.totalValuation)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-2">
                        <span className="font-mono text-slate-600 font-medium">{sharePercent}%</span>
                        <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-amber-500 h-full rounded-full"
                            style={{ width: `${Math.min(100, Math.max(0, parseFloat(sharePercent)))}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Out of Stock and Replenishment Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Out of stock table */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <XCircle className="w-4 h-4 text-red-500" />
              <h3 className="font-bold text-slate-900 text-sm">Produits en Rupture de Stock</h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
              {data?.outOfStock?.length || 0}
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="px-3 py-2">Réf. SKU</th>
                  <th className="px-3 py-2">Désignation</th>
                  <th className="px-3 py-2 text-right">Prix Achat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!data?.outOfStock || data.outOfStock.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-slate-400">
                      Aucun produit en rupture totale.
                    </td>
                  </tr>
                ) : (
                  data.outOfStock.map((p: any) => (
                    <tr key={p.id} className="hover:bg-red-50/20">
                      <td className="px-3 py-2 font-mono font-bold text-slate-900">{p.sku}</td>
                      <td className="px-3 py-2 font-medium text-slate-800">{p.name}</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-700 whitespace-nowrap">
                        {formatFCFA(p.purchasePrice)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Table */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-slate-900 text-sm">Articles Sous Seuil Minimal</h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
              {data?.lowStock?.length || 0}
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="px-3 py-2">Réf. SKU</th>
                  <th className="px-3 py-2">Désignation</th>
                  <th className="px-3 py-2 text-center">Stock / Seuil</th>
                  <th className="px-3 py-2 text-right">Prix Achat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!data?.lowStock || data.lowStock.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-slate-400">
                      Tous les stocks sont au-dessus de leur seuil minimal.
                    </td>
                  </tr>
                ) : (
                  data.lowStock.map((p: any) => (
                    <tr key={p.id} className="hover:bg-amber-50/20">
                      <td className="px-3 py-2 font-mono font-bold text-slate-900">{p.sku}</td>
                      <td className="px-3 py-2 font-medium text-slate-800">{p.name}</td>
                      <td className="px-3 py-2 text-center font-mono font-bold text-amber-700">
                        {p.currentStock} / {p.minStockThreshold} {p.unit}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-slate-700 whitespace-nowrap">
                        {formatFCFA(p.purchasePrice)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
