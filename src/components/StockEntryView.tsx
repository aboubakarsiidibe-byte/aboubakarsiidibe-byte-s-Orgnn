import React, { useState } from 'react';
import {
  ArrowDownLeft,
  CheckCircle2,
  Package,
  Truck,
  FileText,
  AlertCircle,
  Clock,
  Layers,
} from 'lucide-react';
import { api, formatFCFA } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface StockEntryViewProps {
  products: any[];
  suppliers: any[];
  onSuccess: () => void;
  preselectedProductId?: number;
}

export const StockEntryView: React.FC<StockEntryViewProps> = ({
  products,
  suppliers,
  onSuccess,
  preselectedProductId,
}) => {
  const { user } = useAuth();

  const [selectedProductId, setSelectedProductId] = useState<number | ''>(preselectedProductId || (products[0]?.id || ''));
  const [quantity, setQuantity] = useState<number>(1);
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [documentRef, setDocumentRef] = useState('');
  const [reason, setReason] = useState('Réception commande fournisseur');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<any | null>(null);

  // Update default price when selected product changes
  const selectedProduct = products.find((p) => p.id === selectedProductId);

  React.useEffect(() => {
    if (selectedProduct) {
      setPurchasePrice(selectedProduct.purchasePrice || 0);
    }
  }, [selectedProductId, products]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessInfo(null);

    if (!selectedProductId) {
      setErrorMsg('Veuillez sélectionner un équipement de sécurité.');
      return;
    }
    if (!quantity || quantity <= 0) {
      setErrorMsg('La quantité reçue doit être strictement supérieure à 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.createStockEntry({
        productId: Number(selectedProductId),
        quantity: Math.floor(quantity),
        purchasePrice: Math.floor(purchasePrice),
        supplierId: supplierId ? Number(supplierId) : undefined,
        documentRef: documentRef.trim() || undefined,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
      });

      setSuccessInfo(res);
      // Reset form
      setQuantity(1);
      setDocumentRef('');
      setNotes('');
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || "Échec de l'enregistrement de l'entrée.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculatedTotal = (quantity || 0) * (purchasePrice || 0);
  const projectedStock = (selectedProduct?.currentStock || 0) + (quantity || 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
          <ArrowDownLeft className="w-6 h-6 text-emerald-600" />
          <span>Enregistrement d'une Entrée de Stock</span>
        </h1>
        <p className="text-sm text-slate-500">
          Réception de marchandises, approvisionnement fournisseurs et retours chantiers • Devise FCFA
        </p>
      </div>

      {/* Success Banner */}
      {successInfo && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl flex items-start space-x-3 text-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-sm">Entrée de stock validée avec succès !</h4>
            <p className="mt-0.5">
              N° Mouvement : <span className="font-mono font-bold">{successInfo.movement?.movementNumber}</span> • Nouveau stock disponible :{' '}
              <span className="font-bold">{successInfo.newStock} {selectedProduct?.unit}</span>.
            </p>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-center space-x-3 text-xs">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {/* Main Entry Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Product selection */}
            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1.5">
                Produit / Matériel concerné <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  required
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                >
                  <option value="">Sélectionnez un équipement...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.sku}] {p.name} — (Stock actuel: {p.currentStock} {p.unit})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Current Stock Preview Chip */}
            {selectedProduct && (
              <div className="md:col-span-2 p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center space-x-2">
                  <Package className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-600">Stock actuel en magasin :</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {selectedProduct.currentStock} {selectedProduct.unit}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-slate-400">→</span>
                  <span className="text-emerald-700 font-semibold">Après validation :</span>
                  <span className="font-mono font-bold text-emerald-700 text-sm">
                    {projectedStock} {selectedProduct.unit}
                  </span>
                  <span className="text-[11px] text-emerald-600">(+{quantity || 0})</span>
                </div>
                <div className="text-slate-500 text-[11px]">
                  Emplacement: <span className="font-semibold">{selectedProduct.location || 'Non défini'}</span>
                </div>
              </div>
            )}

            {/* Quantity received */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                Quantité reçue <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
                placeholder="Ex: 10"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Unit purchase price */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                Prix d'achat unitaire (FCFA)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm font-mono text-slate-900 focus:outline-none focus:border-amber-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Montant total de la réception : <strong className="font-mono text-slate-700">{formatFCFA(calculatedTotal)}</strong>
              </span>
            </div>

            {/* Supplier */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                Fournisseur (Facultatif)
              </label>
              <div className="relative">
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white"
                >
                  <option value="">Sélectionner un fournisseur...</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.phone})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Document Reference */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                N° Bon de Livraison / Facture Fournisseur
              </label>
              <input
                type="text"
                value={documentRef}
                onChange={(e) => setDocumentRef(e.target.value)}
                placeholder="Ex: BL-2026-8912 ou FACT-HIK-450"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Reason */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                Motif de l'entrée <span className="text-red-500">*</span>
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-amber-500 bg-white"
              >
                <option value="Réception commande fournisseur">Réception commande fournisseur</option>
                <option value="Retour chantier / Matériel non utilisé">Retour chantier / Matériel non utilisé</option>
                <option value="Retour client / Annulation installation">Retour client / Annulation installation</option>
                <option value="Réception exceptionnelle">Réception exceptionnelle</option>
                <option value="Échantillon constructeur / Don">Échantillon constructeur / Don</option>
                <option value="Autre motif d'entrée">Autre motif d'entrée</option>
              </select>
            </div>

            {/* Operator info */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Opérateur responsable</label>
              <input
                type="text"
                disabled
                value={`${user?.displayName || 'Opérateur'} (${user?.email || 'session active'})`}
                className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-600 font-medium"
              />
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1.5">Observations / Remarques</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="État des cartons, conformité de livraison, réserves éventuelles..."
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Action button */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="text-slate-400 text-[11px] flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Numéro de mouvement généré automatiquement après validation</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !selectedProductId || quantity <= 0}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm text-xs flex items-center space-x-2 transition-colors disabled:opacity-50"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>{isSubmitting ? 'Validation...' : 'Valider la Réception (+)'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
