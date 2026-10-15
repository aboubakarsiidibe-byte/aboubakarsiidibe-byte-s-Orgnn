import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  Plus,
  Search,
  Filter,
  Download,
  Package,
  Truck,
  User,
  CheckCircle2,
  AlertTriangle,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldAlert,
  FileCheck2,
  HelpCircle,
} from 'lucide-react';
import { api, formatFCFA } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface ReturnsViewProps {
  products: any[];
  suppliers: any[];
  onRefreshAll: () => void;
}

export const ReturnsView: React.FC<ReturnsViewProps> = ({
  products,
  suppliers,
  onRefreshAll,
}) => {
  const { user } = useAuth();

  const [returnsList, setReturnsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [directionFilter, setDirectionFilter] = useState<'all' | 'CUSTOMER' | 'SUPPLIER'>('all');
  const [search, setSearch] = useState('');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    returnDirection: 'CUSTOMER' as 'CUSTOMER' | 'SUPPLIER',
    productId: products[0]?.id || '',
    quantity: 1,
    itemCondition: 'NEW' as 'NEW' | 'DEFECTIVE' | 'TO_INSPECT',
    stockAction: 'RESTOCK' as 'RESTOCK' | 'NO_RESTOCK' | 'SUPPLIER_EXIT',
    thirdPartyName: '',
    supplierId: '' as number | '',
    documentRef: '',
    reason: 'Annulation chantier / Matériel non utilisé',
    notes: '',
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successInfo, setSuccessInfo] = useState<any | null>(null);

  const loadReturns = async () => {
    setLoading(true);
    try {
      const data = await api.getReturns();
      setReturnsList(data);
    } catch (err: any) {
      console.error('Error loading returns:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReturns();
  }, []);

  const handleOpenAdd = () => {
    setFormData({
      returnDirection: 'CUSTOMER',
      productId: products[0]?.id || '',
      quantity: 1,
      itemCondition: 'NEW',
      stockAction: 'RESTOCK',
      thirdPartyName: '',
      supplierId: '',
      documentRef: '',
      reason: 'Annulation chantier / Matériel non utilisé',
      notes: '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const selectedProduct = products.find((p) => p.id === formData.productId);
  const currentStock = selectedProduct?.currentStock || 0;
  const isSupplierExit = formData.returnDirection === 'SUPPLIER';
  const isStockInsufficient = isSupplierExit && formData.quantity > currentStock;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.productId) {
      setFormError('Veuillez sélectionner un équipement de sécurité.');
      return;
    }
    if (!formData.quantity || formData.quantity <= 0) {
      setFormError('La quantité retournée doit être supérieure à 0.');
      return;
    }
    if (isStockInsufficient) {
      setFormError(
        `Stock insuffisant : impossible de renvoyer ${formData.quantity} unité(s) au fournisseur, le stock disponible n'est que de ${currentStock} ${selectedProduct?.unit}.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.createReturn({
        returnDirection: formData.returnDirection,
        productId: Number(formData.productId),
        quantity: Math.floor(formData.quantity),
        itemCondition: formData.itemCondition,
        stockAction:
          formData.returnDirection === 'CUSTOMER' ? formData.stockAction : 'SUPPLIER_EXIT',
        thirdPartyName: formData.thirdPartyName.trim() || undefined,
        supplierId: formData.supplierId ? Number(formData.supplierId) : undefined,
        documentRef: formData.documentRef.trim() || undefined,
        reason: formData.reason.trim(),
        notes: formData.notes.trim() || undefined,
      });

      setSuccessInfo(res);
      setIsModalOpen(false);
      onRefreshAll();
      loadReturns();
    } catch (err: any) {
      setFormError(err.message || "Échec de l'enregistrement du retour.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportCsv = () => {
    window.location.href = '/api/returns/export-csv';
  };

  // Filter returns
  const filteredReturns = returnsList.filter((r) => {
    if (directionFilter !== 'all' && r.returnDirection !== directionFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const match =
        r.returnNumber.toLowerCase().includes(q) ||
        r.productName?.toLowerCase().includes(q) ||
        r.productSku?.toLowerCase().includes(q) ||
        (r.thirdPartyName && r.thirdPartyName.toLowerCase().includes(q)) ||
        (r.supplierName && r.supplierName.toLowerCase().includes(q)) ||
        (r.reason && r.reason.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const totalCustomerReturns = returnsList.filter((r) => r.returnDirection === 'CUSTOMER').length;
  const totalSupplierReturns = returnsList.filter((r) => r.returnDirection === 'SUPPLIER').length;
  const totalReturnsValue = returnsList.reduce((sum, r) => sum + (r.totalCost || 0), 0);

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <RotateCcw className="w-6 h-6 text-amber-500" />
            <span>Gestion des Retours de Marchandise</span>
          </h1>
          <p className="text-sm text-slate-500">
            Traçabilité des retours clients (réintégrations / SAV) et des renvois fournisseurs • FCFA
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Exporter CSV</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center space-x-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Retour de Marchandise</span>
          </button>
        </div>
      </div>

      {successInfo && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl flex items-start space-x-3 text-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">Retour de marchandise enregistré avec succès !</h4>
            <p className="mt-0.5">
              N° Dossier : <span className="font-mono font-bold">{successInfo.returnRecord?.returnNumber}</span> • Nouveau stock disponible :{' '}
              <strong className="font-bold font-mono">{successInfo.newStock} {selectedProduct?.unit}</strong>.
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400">Total des Retours</span>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{returnsList.length}</div>
          <p className="text-[11px] text-slate-400">Dossiers traités</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400">Retours Clients / Chantiers</span>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
            {totalCustomerReturns}
          </div>
          <p className="text-[11px] text-slate-400">Réintégrations & SAV clients</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400">Retours Fournisseurs / SAV</span>
          <div className="text-2xl font-bold font-mono text-amber-700 mt-1">
            {totalSupplierReturns}
          </div>
          <p className="text-[11px] text-slate-400">Renvois distributeurs</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400">Valeur Totale Traitée</span>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {formatFCFA(totalReturnsValue)}
          </div>
          <p className="text-[11px] text-slate-400">Coût d'acquisition FCFA</p>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setDirectionFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              directionFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tous les retours ({returnsList.length})
          </button>
          <button
            onClick={() => setDirectionFilter('CUSTOMER')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1 ${
              directionFilter === 'CUSTOMER'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Retours Clients ({totalCustomerReturns})</span>
          </button>
          <button
            onClick={() => setDirectionFilter('SUPPLIER')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1 ${
              directionFilter === 'SUPPLIER'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Retours Fournisseurs ({totalSupplierReturns})</span>
          </button>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Recherche dossier, référence, motif..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Returns Data Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200/60">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">N° Dossier</th>
                <th className="px-4 py-3">Direction</th>
                <th className="px-4 py-3">Équipement</th>
                <th className="px-4 py-3 text-center">Quantité</th>
                <th className="px-4 py-3 text-center">État & Stock</th>
                <th className="px-4 py-3 text-right">Valeur (FCFA)</th>
                <th className="px-4 py-3">Tiers (Client / Fournisseur)</th>
                <th className="px-4 py-3">Motif du retour</th>
                <th className="px-4 py-3">Opérateur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    Chargement des retours...
                  </td>
                </tr>
              ) : filteredReturns.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    Aucun retour de marchandise enregistré pour l'instant.
                  </td>
                </tr>
              ) : (
                filteredReturns.map((r) => {
                  const isCustomer = r.returnDirection === 'CUSTOMER';
                  const isRestocked = r.stockAction === 'RESTOCK';

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {r.returnNumber}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            isCustomer
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isCustomer ? 'Retour Client' : 'Retour Fournisseur'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{r.productName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{r.productSku}</div>
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold whitespace-nowrap">
                        <span className={isCustomer && isRestocked ? 'text-emerald-700' : 'text-amber-700'}>
                          {isCustomer && isRestocked ? `+${r.quantity}` : `-${r.quantity}`} {r.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            r.itemCondition === 'NEW'
                              ? 'bg-emerald-100 text-emerald-800'
                              : r.itemCondition === 'DEFECTIVE'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {r.itemCondition === 'NEW'
                            ? 'Neuf'
                            : r.itemCondition === 'DEFECTIVE'
                            ? 'Défectueux'
                            : 'À expertiser'}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {isRestocked
                            ? 'Réintégré en stock'
                            : r.stockAction === 'NO_RESTOCK'
                            ? 'Quarantaine SAV'
                            : 'Sortie distributeur'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                        {formatFCFA(r.totalCost)}
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-medium">
                        {r.thirdPartyName || r.supplierName || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-800">{r.reason}</div>
                        {r.documentRef && (
                          <span className="text-[10px] font-mono text-slate-400">
                            Réf: {r.documentRef}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 truncate max-w-[120px]">
                        {r.userEmail || 'Admin'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Goods Return */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <RotateCcw className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900">Enregistrer un Retour de Marchandise</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {/* Return Direction Toggle */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Sens du retour <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        returnDirection: 'CUSTOMER',
                        stockAction: 'RESTOCK',
                        reason: 'Annulation chantier / Matériel non utilisé',
                      });
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      formData.returnDirection === 'CUSTOMER'
                        ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2 font-bold text-emerald-800">
                      <ArrowDownLeft className="w-4 h-4" />
                      <span>Retour Client / Chantier</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Réception de matériel retourné par un client ou surplus de chantier.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        returnDirection: 'SUPPLIER',
                        stockAction: 'SUPPLIER_EXIT',
                        reason: 'Matériel défaillant sous garantie / SAV fournisseur',
                      });
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      formData.returnDirection === 'SUPPLIER'
                        ? 'border-amber-500 bg-amber-50/50 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2 font-bold text-amber-800">
                      <ArrowUpRight className="w-4 h-4" />
                      <span>Retour Fournisseur (SAV)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Renvoi d'équipement défectueux ou échange au distributeur/fabricant.
                    </p>
                  </button>
                </div>
              </div>

              {/* Product selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Équipement de sécurité concerné <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.productId}
                  onChange={(e) => setFormData({ ...formData, productId: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-amber-500"
                >
                  <option value="">Sélectionner un produit...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.sku}] {p.name} — (Stock actuel: {p.currentStock} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Live stock preview */}
              {selectedProduct && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-[11px]">
                  <div>
                    <span className="text-slate-500">Stock actuel : </span>
                    <strong className="font-mono text-slate-900">{currentStock} {selectedProduct.unit}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Impact prévisionnel : </span>
                    <strong className={`font-mono ${isStockInsufficient ? 'text-red-600' : 'text-slate-900'}`}>
                      {formData.returnDirection === 'CUSTOMER' && formData.stockAction === 'RESTOCK'
                        ? `${currentStock + formData.quantity} ${selectedProduct.unit} (+${formData.quantity})`
                        : formData.returnDirection === 'SUPPLIER'
                        ? `${currentStock - formData.quantity} ${selectedProduct.unit} (-${formData.quantity})`
                        : `${currentStock} ${selectedProduct.unit} (Inchangé)`}
                    </strong>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {/* Quantity */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Quantité <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Item Condition */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">État du matériel</label>
                  <select
                    value={formData.itemCondition}
                    onChange={(e) => setFormData({ ...formData, itemCondition: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 bg-white"
                  >
                    <option value="NEW">Neuf (Remise en rayon directe)</option>
                    <option value="DEFECTIVE">Défectueux / Panne constatée</option>
                    <option value="TO_INSPECT">À expertiser en atelier</option>
                  </select>
                </div>
              </div>

              {/* Stock Action for Customer Returns */}
              {formData.returnDirection === 'CUSTOMER' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Action sur le stock magasin</label>
                  <select
                    value={formData.stockAction}
                    onChange={(e) => setFormData({ ...formData, stockAction: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 bg-white"
                  >
                    <option value="RESTOCK">Réintégrer directement au stock disponible (+Qte)</option>
                    <option value="NO_RESTOCK">Quarantaine SAV (Ne pas augmenter le stock vendable)</option>
                  </select>
                </div>
              )}

              {/* Third Party (Client or Supplier) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {formData.returnDirection === 'CUSTOMER' ? 'Client / Chantier' : 'Fournisseur destinataire'}
                  </label>
                  {formData.returnDirection === 'CUSTOMER' ? (
                    <input
                      type="text"
                      value={formData.thirdPartyName}
                      onChange={(e) => setFormData({ ...formData, thirdPartyName: e.target.value })}
                      placeholder="Ex: Société Ivoire Télécom"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500"
                    />
                  ) : (
                    <select
                      value={formData.supplierId}
                      onChange={(e) => setFormData({ ...formData, supplierId: e.target.value ? Number(e.target.value) : '' })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 bg-white"
                    >
                      <option value="">Sélectionner fournisseur...</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Référence Document (Bon de retour / Facture)
                  </label>
                  <input
                    type="text"
                    value={formData.documentRef}
                    onChange={(e) => setFormData({ ...formData, documentRef: e.target.value })}
                    placeholder="Ex: BR-2026-004 ou FACT-089"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Motif du retour <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Ex: Erreur de référence, composant HS sous garantie..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Rapport de panne / Remarques</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Numéro de série de l'appareil, description du défaut ou diagnostic..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.productId || formData.quantity <= 0 || isStockInsufficient}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Enregistrement...' : 'Valider le retour'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
