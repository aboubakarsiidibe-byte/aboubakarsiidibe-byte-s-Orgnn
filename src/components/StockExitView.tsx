import React, { useState } from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  Package,
  AlertTriangle,
  Clock,
  ShieldAlert,
  FileCheck2,
  X,
} from 'lucide-react';
import { api, formatFCFA } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface StockExitViewProps {
  products: any[];
  onSuccess: () => void;
  preselectedProductId?: number;
}

export const StockExitView: React.FC<StockExitViewProps> = ({
  products,
  onSuccess,
  preselectedProductId,
}) => {
  const { user } = useAuth();

  const [selectedProductId, setSelectedProductId] = useState<number | ''>(preselectedProductId || (products[0]?.id || ''));
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState('Installation chez un client');
  const [recipient, setRecipient] = useState('');
  const [documentRef, setDocumentRef] = useState('');
  const [notes, setNotes] = useState('');

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<any | null>(null);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const currentAvailableStock = selectedProduct?.currentStock || 0;
  const isStockInsufficient = quantity > currentAvailableStock;
  const projectedRemaining = currentAvailableStock - quantity;

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessInfo(null);

    if (!selectedProductId) {
      setErrorMsg('Veuillez sélectionner un équipement de sécurité.');
      return;
    }
    if (!quantity || quantity <= 0) {
      setErrorMsg('La quantité de sortie doit être un nombre strictement supérieur à 0.');
      return;
    }
    if (isStockInsufficient) {
      setErrorMsg(
        `Opération impossible : Le stock disponible n'est que de ${currentAvailableStock} ${selectedProduct?.unit}, vous ne pouvez pas en sortir ${quantity}.`
      );
      return;
    }

    // Open confirmation modal
    setShowConfirmModal(true);
  };

  const handleConfirmExit = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await api.createStockExit({
        productId: Number(selectedProductId),
        quantity: Math.floor(quantity),
        reason: reason.trim(),
        recipient: recipient.trim() || undefined,
        documentRef: documentRef.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      setSuccessInfo(res);
      setShowConfirmModal(false);
      setQuantity(1);
      setRecipient('');
      setDocumentRef('');
      setNotes('');
      onSuccess();
    } catch (err: any) {
      setShowConfirmModal(false);
      setErrorMsg(err.message || "Échec de l'enregistrement de la sortie.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
          <ArrowUpRight className="w-6 h-6 text-amber-600" />
          <span>Enregistrement d'une Sortie de Stock</span>
        </h1>
        <p className="text-sm text-slate-500">
          Attribution chantier, vente client, utilisation interne ou retour • Décrémentation atomique
        </p>
      </div>

      {/* Success Notification */}
      {successInfo && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl flex items-start space-x-3 text-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-sm">Sortie de stock enregistrée avec succès !</h4>
            <p className="mt-0.5">
              N° Mouvement : <span className="font-mono font-bold">{successInfo.movement?.movementNumber}</span> • Nouveau stock restant :{' '}
              <span className="font-bold">{successInfo.newStock} {selectedProduct?.unit}</span>.
            </p>
          </div>
        </div>
      )}

      {/* Error Notification */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-center space-x-3 text-xs">
          <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {/* Exit Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <form onSubmit={handlePreSubmit} className="space-y-5 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Product selection */}
            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1.5">
                Produit / Matériel à sortir <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
              >
                <option value="">Sélectionnez le matériel...</option>
                {products.map((p) => {
                  const isRupture = p.currentStock === 0;
                  return (
                    <option key={p.id} value={p.id} disabled={isRupture}>
                      [{p.sku}] {p.name} — (Dispo: {p.currentStock} {p.unit}) {isRupture ? '— [EN RUPTURE]' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Live Stock Level Indicator */}
            {selectedProduct && (
              <div
                className={`md:col-span-2 p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs ${
                  isStockInsufficient
                    ? 'bg-red-50 border-red-300 text-red-900'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Package className="w-4 h-4 text-slate-500" />
                  <span>Stock disponible avant sortie :</span>
                  <span className="font-mono font-bold text-sm">{currentAvailableStock} {selectedProduct.unit}</span>
                </div>

                <div className="flex items-center space-x-2">
                  <span>→</span>
                  <span>Solde restant après opération :</span>
                  <span
                    className={`font-mono font-bold text-sm ${
                      isStockInsufficient ? 'text-red-600' : 'text-slate-900'
                    }`}
                  >
                    {projectedRemaining} {selectedProduct.unit}
                  </span>
                  <span className="text-[11px] text-amber-600">(-{quantity || 0})</span>
                </div>

                {isStockInsufficient && (
                  <div className="w-full pt-1 text-red-600 font-bold flex items-center space-x-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Quantité demandée ({quantity}) supérieure au stock réel ({currentAvailableStock}) ! Opération bloquée.</span>
                  </div>
                )}
              </div>
            )}

            {/* Quantity */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                Quantité à déstocker <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max={currentAvailableStock > 0 ? currentAvailableStock : undefined}
                step="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
                className={`w-full px-3.5 py-2.5 border rounded-lg text-sm font-mono font-bold focus:outline-none ${
                  isStockInsufficient
                    ? 'border-red-400 bg-red-50/50 text-red-900'
                    : 'border-slate-200 text-slate-900 focus:border-amber-500'
                }`}
              />
            </div>

            {/* Reason for exit */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                Motif de la sortie <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-amber-500 bg-white"
              >
                <option value="Installation chez un client">Installation chez un client</option>
                <option value="Vente directe / Comptoir">Vente directe / Comptoir</option>
                <option value="Utilisation interne / Atelier test">Utilisation interne / Atelier test</option>
                <option value="Transfert exceptionnel">Transfert exceptionnel</option>
                <option value="Produit endommagé / Défectueux">Produit endommagé / Défectueux</option>
                <option value="Perte constatée">Perte constatée</option>
                <option value="Retour fournisseur / SAV">Retour fournisseur / SAV</option>
                <option value="Autre motif">Autre motif</option>
              </select>
            </div>

            {/* Recipient / Client */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                Client / Destinataire / Chantier
              </label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Ex: Société BTP Ivoire - Chantier Riviera 3"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Document Reference */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                Référence Document (Bon de sortie, devis, facture)
              </label>
              <input
                type="text"
                value={documentRef}
                onChange={(e) => setDocumentRef(e.target.value)}
                placeholder="Ex: BS-2026-042 ou DEV-CLIENT-102"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Operator */}
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
              <label className="block font-bold text-slate-700 mb-1.5">Commentaire / Justification</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Informations sur l'équipe d'installation, numéro de série du produit ou précision..."
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Action button */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="text-slate-400 text-[11px] flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Une confirmation sera requise avant l'impact sur le stock</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !selectedProductId || quantity <= 0 || isStockInsufficient}
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-sm text-xs flex items-center space-x-2 transition-colors disabled:opacity-50"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Valider la Sortie (-)</span>
            </button>
          </div>
        </form>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2 text-amber-600 font-bold">
                <FileCheck2 className="w-5 h-5" />
                <h3 className="text-base text-slate-900">Confirmation de Sortie de Matériel</h3>
              </div>
              <button onClick={() => setShowConfirmModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold">Produit :</span>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{selectedProduct?.name}</p>
                <p className="font-mono text-slate-500 text-[11px]">{selectedProduct?.sku}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Quantité sortie :</span>
                  <p className="font-bold text-amber-700 text-base font-mono">
                    -{quantity} {selectedProduct?.unit}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Nouveau stock :</span>
                  <p className="font-bold text-slate-900 text-base font-mono">
                    {projectedRemaining} {selectedProduct?.unit}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/60">
                <span className="text-slate-400 text-[10px] uppercase font-bold">Motif & Destinataire :</span>
                <p className="font-semibold text-slate-800">{reason}</p>
                {recipient && <p className="text-slate-600">Destinataire : {recipient}</p>}
              </div>
            </div>

            <p className="text-slate-500 mb-4 text-[11px]">
              Cette opération diminuera immédiatement le stock disponible dans la base de données PostgreSQL et créera un mouvement tracé.
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
                onClick={handleConfirmExit}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-sm disabled:opacity-50 flex items-center space-x-1.5"
              >
                <span>{isSubmitting ? 'Traitement...' : 'Confirmer et Déstocker'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
