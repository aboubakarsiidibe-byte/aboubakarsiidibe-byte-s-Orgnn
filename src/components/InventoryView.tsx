import React, { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  History,
  FileCheck2,
  Calendar,
  X,
  Search,
  ArrowRight,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { api, formatFCFA } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface InventoryViewProps {
  onSuccess: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ onSuccess }) => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'count' | 'history'>('count');
  const [sheetItems, setSheetItems] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [search, setSearch] = useState('');

  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionDetail, setSelectedSessionDetail] = useState<any | null>(null);

  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [resultMessage, setResultMessage] = useState<any | null>(null);

  const loadInventorySheet = async () => {
    setLoading(true);
    try {
      const data = await api.getInventorySheet();
      setSheetItems(data);
      // Initialize count inputs with theoretical stock by default
      const initial: Record<number, number> = {};
      data.forEach((p) => {
        initial[p.id] = p.theoreticalStock;
      });
      setCounts(initial);
      setSessionTitle(`Inventaire physique du ${new Date().toLocaleDateString('fr-FR')}`);
    } catch (err: any) {
      console.error('Error loading inventory sheet:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSessionsHistory = async () => {
    setLoading(true);
    try {
      const data = await api.getInventorySessions();
      setSessions(data);
    } catch (err: any) {
      console.error('Error loading sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'count') {
      loadInventorySheet();
    } else {
      loadSessionsHistory();
    }
  }, [activeTab]);

  const handleCountChange = (productId: number, valStr: string) => {
    const val = parseInt(valStr, 10);
    setCounts((prev) => ({
      ...prev,
      [productId]: isNaN(val) ? 0 : Math.max(0, val),
    }));
  };

  // Calculate discrepancies
  const calculatedItems = sheetItems.map((item) => {
    const counted = counts[item.id] !== undefined ? counts[item.id] : item.theoreticalStock;
    const diff = counted - item.theoreticalStock;
    const diffVal = diff * item.purchasePrice;
    return {
      ...item,
      countedStock: counted,
      discrepancy: diff,
      discrepancyValue: diffVal,
    };
  });

  const filteredItems = calculatedItems.filter((i) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      i.name.toLowerCase().includes(q) ||
      i.sku.toLowerCase().includes(q) ||
      (i.location && i.location.toLowerCase().includes(q))
    );
  });

  const discrepanciesCount = calculatedItems.filter((i) => i.discrepancy !== 0).length;
  const netQuantityDiff = calculatedItems.reduce((sum, i) => sum + i.discrepancy, 0);
  const netValuationDiff = calculatedItems.reduce((sum, i) => sum + i.discrepancyValue, 0);

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirmModal(true);
  };

  const handleConfirmRegularization = async () => {
    setIsSubmitting(true);
    setResultMessage(null);
    try {
      const payload = {
        title: sessionTitle.trim(),
        notes: sessionNotes.trim() || undefined,
        counts: calculatedItems.map((item) => ({
          productId: item.id,
          countedStock: item.countedStock,
        })),
      };

      const res = await api.submitInventory(payload);
      setResultMessage(res);
      setShowConfirmModal(false);
      onSuccess();
      loadInventorySheet();
    } catch (err: any) {
      setShowConfirmModal(false);
      alert(err.message || "Échec de l'enregistrement de l'inventaire.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewSession = async (sessionId: number) => {
    try {
      const data = await api.getInventorySession(sessionId);
      setSelectedSessionDetail(data);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <ClipboardCheck className="w-6 h-6 text-amber-500" />
            <span>Inventaire Physique & Régularisation</span>
          </h1>
          <p className="text-sm text-slate-500">
            Comptage physique des équipements, calcul d'écarts et ajustements de stock tracés • FCFA
          </p>
        </div>

        <div className="flex items-center space-x-1 bg-slate-200/70 p-1 rounded-xl self-start sm:self-auto text-xs">
          <button
            onClick={() => setActiveTab('count')}
            className={`px-4 py-2 rounded-lg font-bold transition-all ${
              activeTab === 'count' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Saisie de l'Inventaire
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg font-bold transition-all ${
              activeTab === 'history' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sessions Précédentes
          </button>
        </div>
      </div>

      {resultMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl flex items-start space-x-3 text-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">Inventaire clôturé et stock synchronisé !</h4>
            <p className="mt-0.5">
              N° Session : <span className="font-mono font-bold">{resultMessage.sessionNumber}</span> • {resultMessage.totalCounted} articles contrôlés • Écart net de stock :{' '}
              <strong className="font-mono">{resultMessage.totalDiscrepancy} unité(s)</strong> (Impact financier :{' '}
              <strong className="font-mono">{formatFCFA(resultMessage.valuationDiscrepancy)}</strong>).
            </p>
            <p className="text-[11px] text-emerald-700 mt-1">
              Des mouvements de régularisation "REG" automatiques ont été générés pour chaque article présentant un écart.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'count' ? (
        <div className="space-y-6">
          {/* Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-slate-400 text-[10px] uppercase font-bold">Articles avec écart</span>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                {discrepanciesCount} <span className="text-xs text-slate-400 font-sans">/ {sheetItems.length} articles</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-slate-400 text-[10px] uppercase font-bold">Écart Net en Quantité</span>
              <div className={`text-2xl font-bold font-mono mt-1 ${netQuantityDiff < 0 ? 'text-red-600' : netQuantityDiff > 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                {netQuantityDiff > 0 ? `+${netQuantityDiff}` : netQuantityDiff} <span className="text-xs text-slate-400 font-sans">unités</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-slate-400 text-[10px] uppercase font-bold">Impact Financier Net</span>
              <div className={`text-2xl font-bold font-mono mt-1 ${netValuationDiff < 0 ? 'text-red-600' : netValuationDiff > 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                {formatFCFA(netValuationDiff)}
              </div>
            </div>
          </div>

          {/* Form and Counting Table */}
          <form onSubmit={handlePreSubmit} className="space-y-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Titre de la session d'inventaire</label>
                <input
                  type="text"
                  required
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Filtrer les lignes</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Recherche article, SKU, rayon..."
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="md:col-span-3">
                <label className="block font-semibold text-slate-700 mb-1">Notes de session / Observateur</label>
                <input
                  type="text"
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  placeholder="Ex: Réalisé avec le magasinier chef. Tous les cartons du rayon B vérifiés."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Sheet Table */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200/60">
                    <tr>
                      <th className="px-4 py-3">Réf. SKU</th>
                      <th className="px-4 py-3">Désignation</th>
                      <th className="px-4 py-3">Emplacement</th>
                      <th className="px-4 py-3 text-right">Prix Achat</th>
                      <th className="px-4 py-3 text-center">Stock Théorique</th>
                      <th className="px-4 py-3 text-center w-36">Comptage Réel</th>
                      <th className="px-4 py-3 text-center">Écart (Unités)</th>
                      <th className="px-4 py-3 text-right">Écart Valeur (FCFA)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400">
                          Chargement de la feuille d'inventaire...
                        </td>
                      </tr>
                    ) : filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400">
                          Aucun équipement trouvé.
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item) => {
                        const hasDiff = item.discrepancy !== 0;
                        const isSurplus = item.discrepancy > 0;
                        const isMissing = item.discrepancy < 0;

                        return (
                          <tr
                            key={item.id}
                            className={`hover:bg-slate-50/70 transition-colors ${
                              hasDiff ? (isMissing ? 'bg-red-50/30' : 'bg-emerald-50/30') : ''
                            }`}
                          >
                            <td className="px-4 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                              {item.sku}
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-semibold text-slate-900">{item.name}</div>
                              <div className="text-[11px] text-slate-400">{item.categoryName}</div>
                            </td>
                            <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                              {item.location || '—'}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-medium text-slate-700 whitespace-nowrap">
                              {formatFCFA(item.purchasePrice)}
                            </td>
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              <span className="font-mono font-bold text-slate-800 text-sm">
                                {item.theoreticalStock}
                              </span>
                              <span className="text-[11px] text-slate-400 ml-1">{item.unit}</span>
                            </td>
                            <td className="px-4 py-2 text-center whitespace-nowrap">
                              <input
                                type="number"
                                min="0"
                                step="1"
                                required
                                value={counts[item.id] !== undefined ? counts[item.id] : item.theoreticalStock}
                                onChange={(e) => handleCountChange(item.id, e.target.value)}
                                className={`w-24 text-center px-2 py-1.5 border rounded-lg font-mono font-bold text-sm focus:outline-none ${
                                  hasDiff
                                    ? isMissing
                                      ? 'border-red-400 bg-red-50 text-red-700'
                                      : 'border-emerald-400 bg-emerald-50 text-emerald-700'
                                    : 'border-slate-200 text-slate-900 focus:border-amber-500'
                                }`}
                              />
                            </td>
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              {hasDiff ? (
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                                    isMissing ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                                  }`}
                                >
                                  {isSurplus ? `+${item.discrepancy}` : item.discrepancy} {item.unit}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-mono text-[11px]">0</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap font-mono font-medium">
                              {hasDiff ? (
                                <span className={isMissing ? 'text-red-600' : 'text-emerald-600'}>
                                  {isSurplus ? '+' : ''}
                                  {formatFCFA(item.discrepancyValue)}
                                </span>
                              ) : (
                                <span className="text-slate-300">0 FCFA</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Submit Button Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div className="text-xs text-slate-500">
                {discrepanciesCount === 0
                  ? 'Aucun écart détecté. Les stocks comptés sont identiques aux stocks théoriques.'
                  : `${discrepanciesCount} article(s) présentent un écart et feront l'objet d'un mouvement de régularisation automatique.`}
              </div>

              <button
                type="submit"
                disabled={isSubmitting || sheetItems.length === 0}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg shadow-sm text-xs flex items-center space-x-2 transition-colors disabled:opacity-50"
              >
                <ClipboardCheck className="w-4 h-4" />
                <span>Valider et Clôturer l'Inventaire</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* History of Past Sessions Tab */
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200/60">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">N° Session</th>
                  <th className="px-4 py-3">Titre de la session</th>
                  <th className="px-4 py-3 text-center">Articles Contrôlés</th>
                  <th className="px-4 py-3 text-center">Écart Net (Quantité)</th>
                  <th className="px-4 py-3 text-right">Écart Financier Net</th>
                  <th className="px-4 py-3">Opérateur</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      Chargement des sessions...
                    </td>
                  </tr>
                ) : sessions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      Aucune session d'inventaire enregistrée dans l'historique.
                    </td>
                  </tr>
                ) : (
                  sessions.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {s.createdAt ? new Date(s.createdAt).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                        {s.sessionNumber}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {s.title}
                        {s.notes && <p className="text-[11px] text-slate-400 font-normal">{s.notes}</p>}
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-medium">
                        {s.totalItemsCounted}
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold">
                        <span className={s.totalDiscrepancy < 0 ? 'text-red-600' : s.totalDiscrepancy > 0 ? 'text-emerald-600' : 'text-slate-500'}>
                          {s.totalDiscrepancy > 0 ? `+${s.totalDiscrepancy}` : s.totalDiscrepancy}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold whitespace-nowrap">
                        <span className={s.valuationDiscrepancy < 0 ? 'text-red-600' : s.valuationDiscrepancy > 0 ? 'text-emerald-600' : 'text-slate-700'}>
                          {formatFCFA(s.valuationDiscrepancy)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 truncate max-w-[120px]">
                        {s.userEmail || 'Admin'}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleViewSession(s.id)}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded text-xs"
                        >
                          Détails
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2 text-amber-600 font-bold">
                <FileCheck2 className="w-5 h-5" />
                <h3 className="text-base text-slate-900">Validation de la Régularisation d'Inventaire</h3>
              </div>
              <button onClick={() => setShowConfirmModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <p className="font-semibold text-slate-800">
                Session : <span className="text-slate-900 font-bold">{sessionTitle}</span>
              </p>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Articles avec ajustement :</span>
                  <p className="font-bold text-slate-900 text-base font-mono">{discrepanciesCount} article(s)</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Impact financier net :</span>
                  <p className={`font-bold text-base font-mono ${netValuationDiff < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                    {formatFCFA(netValuationDiff)}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-slate-500 mb-4 leading-relaxed text-[11px]">
              Cette action va mettre à jour le stock disponible de chaque équipement selon le comptage réel et créer automatiquement un mouvement de régularisation "REG" dans l'historique inaltérable pour chaque différence.
            </p>

            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmRegularization}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? 'Régularisation...' : 'Confirmer et Appliquer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Session Details Modal */}
      {selectedSessionDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 text-xs max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div>
                <span className="font-mono text-amber-600 font-bold">{selectedSessionDetail.session?.sessionNumber}</span>
                <h3 className="text-base font-bold text-slate-900">{selectedSessionDetail.session?.title}</h3>
              </div>
              <button onClick={() => setSelectedSessionDetail(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                    <tr>
                      <th className="px-3 py-2">Réf. SKU</th>
                      <th className="px-3 py-2">Produit</th>
                      <th className="px-3 py-2 text-center">Théorique</th>
                      <th className="px-3 py-2 text-center">Compté</th>
                      <th className="px-3 py-2 text-center">Écart</th>
                      <th className="px-3 py-2 text-right">Impact Valeur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedSessionDetail.items?.map((it: any) => (
                      <tr key={it.id} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2 font-mono font-bold text-slate-900">{it.productSku}</td>
                        <td className="px-3 py-2 font-medium text-slate-800">{it.productName}</td>
                        <td className="px-3 py-2 text-center font-mono">{it.theoreticalStock}</td>
                        <td className="px-3 py-2 text-center font-mono font-bold">{it.countedStock}</td>
                        <td className="px-3 py-2 text-center font-mono font-bold">
                          <span className={it.discrepancy < 0 ? 'text-red-600' : it.discrepancy > 0 ? 'text-emerald-600' : 'text-slate-400'}>
                            {it.discrepancy > 0 ? `+${it.discrepancy}` : it.discrepancy}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-medium">
                          {formatFCFA(it.discrepancyValue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end shrink-0">
              <button
                onClick={() => setSelectedSessionDetail(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
