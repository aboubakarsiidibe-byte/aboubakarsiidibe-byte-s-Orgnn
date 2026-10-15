import React, { useState } from 'react';
import { Truck, Plus, Phone, Mail, MapPin, Edit2, Eye, X, ArrowDownLeft, Calendar } from 'lucide-react';
import { api, formatFCFA } from '../services/api.ts';

interface SuppliersViewProps {
  suppliers: any[];
  onRefresh: () => void;
  onQuickEntryWithSupplier: (supplierId: number) => void;
}

export const SuppliersView: React.FC<SuppliersViewProps> = ({
  suppliers,
  onRefresh,
  onQuickEntryWithSupplier,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null);
  const [viewingSupplier, setViewingSupplier] = useState<any | null>(null);
  const [supplierDetails, setSupplierDetails] = useState<{ supplier: any; deliveries: any[] } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    contactName: '',
    phone: '',
    address: '',
    email: '',
    notes: '',
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenAdd = () => {
    setFormData({ name: '', contactName: '', phone: '', address: '', email: '', notes: '' });
    setErrorMsg(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (s: any) => {
    setEditingSupplier(s);
    setFormData({
      name: s.name,
      contactName: s.contactName || '',
      phone: s.phone,
      address: s.address || '',
      email: s.email || '',
      notes: s.notes || '',
    });
    setErrorMsg(null);
  };

  const handleOpenView = async (s: any) => {
    setViewingSupplier(s);
    setSupplierDetails(null);
    try {
      const data = await api.getSupplier(s.id);
      setSupplierDetails(data);
    } catch (err: any) {
      console.error('Error fetching supplier details:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      setErrorMsg('Le nom de l\'entreprise et le téléphone sont obligatoires.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      if (editingSupplier) {
        await api.updateSupplier(editingSupplier.id, formData);
        setEditingSupplier(null);
      } else {
        await api.createSupplier(formData);
        setIsAddModalOpen(false);
      }
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de l\'enregistrement du fournisseur.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <Truck className="w-6 h-6 text-amber-500" />
            <span>Gestion des Fournisseurs</span>
          </h1>
          <p className="text-sm text-slate-500">
            Distributeurs agréés, constructeurs et partenaires d'approvisionnement en matériel de sécurité
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center space-x-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nouveau Fournisseur</span>
        </button>
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {suppliers.length === 0 ? (
          <div className="col-span-full p-8 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
            Aucun fournisseur enregistré. Cliquez sur "Nouveau Fournisseur" pour en ajouter un.
          </div>
        ) : (
          suppliers.map((s) => (
            <div
              key={s.id}
              className="bg-white p-5 rounded-xl border border-slate-200/80 hover:border-slate-300 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-slate-900 text-sm">{s.name}</h3>
                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => handleOpenView(s)}
                      title="Historique des livraisons"
                      className="p-1.5 text-slate-500 hover:bg-slate-100 rounded"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(s)}
                      title="Modifier les coordonnées"
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {s.contactName && (
                  <p className="text-xs text-amber-700 font-semibold mt-0.5">
                    Contact : {s.contactName}
                  </p>
                )}

                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center space-x-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono">{s.phone}</span>
                  </div>

                  {s.email && (
                    <div className="flex items-center space-x-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{s.email}</span>
                    </div>
                  )}

                  {s.address && (
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{s.address}</span>
                    </div>
                  )}
                </div>

                {s.notes && (
                  <p className="mt-3 text-[11px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 line-clamp-2">
                    {s.notes}
                  </p>
                )}
              </div>

              <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => onQuickEntryWithSupplier(s.id)}
                  className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center space-x-1"
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>Enregistrer réception</span>
                </button>

                <button
                  onClick={() => handleOpenView(s)}
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium"
                >
                  Livraisons passées →
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Add or Edit Supplier */}
      {(isAddModalOpen || editingSupplier) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingSupplier ? `Modifier : ${editingSupplier.name}` : 'Nouveau Fournisseur de Sécurité'}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingSupplier(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg my-3 border border-red-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nom de l'entreprise / Raison sociale <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Hikvision Distribution West Africa"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nom du contact / Responsable</label>
                <input
                  type="text"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  placeholder="Ex: M. Jean-Marc Touré"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Numéro de Téléphone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+225 07 00 00 00 00"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Adresse E-mail</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contact@fournisseur.com"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Adresse physique / Ville</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Ex: Boulevard Giscard d'Estaing, Abidjan"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes et conditions commerciales</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Délai moyen de livraison, remises accordées..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingSupplier(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Enregistrement...' : editingSupplier ? 'Mettre à jour' : 'Ajouter le fournisseur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Supplier Deliveries */}
      {viewingSupplier && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 text-xs max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900">{viewingSupplier.name}</h3>
                <p className="text-slate-500 text-[11px] font-mono">{viewingSupplier.phone} • {viewingSupplier.address || 'Abidjan'}</p>
              </div>
              <button onClick={() => setViewingSupplier(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              <h4 className="font-bold text-slate-800 text-xs">Historique des réceptions associées à ce fournisseur</h4>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">N° Mouvement</th>
                      <th className="px-3 py-2">Matériel</th>
                      <th className="px-3 py-2 text-center">Quantité</th>
                      <th className="px-3 py-2 text-right">Montant (FCFA)</th>
                      <th className="px-3 py-2">Document</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {!supplierDetails?.deliveries || supplierDetails.deliveries.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-slate-400">
                          Aucune livraison enregistrée pour ce fournisseur pour l'instant.
                        </td>
                      </tr>
                    ) : (
                      supplierDetails.deliveries.map((d: any) => (
                        <tr key={d.id} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2 whitespace-nowrap text-slate-500">
                            {d.createdAt ? new Date(d.createdAt).toLocaleDateString('fr-FR') : '—'}
                          </td>
                          <td className="px-3 py-2 font-mono font-semibold text-slate-700">
                            {d.movementNumber}
                          </td>
                          <td className="px-3 py-2">
                            <span className="font-semibold text-slate-900">{d.productName}</span>
                            <span className="block text-[10px] text-slate-400 font-mono">{d.productSku}</span>
                          </td>
                          <td className="px-3 py-2 text-center font-mono font-bold text-emerald-700">
                            +{d.quantity}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-slate-700">
                            {formatFCFA(d.totalCost)}
                          </td>
                          <td className="px-3 py-2 text-slate-500 font-mono text-[11px]">
                            {d.documentRef || '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
              <button
                onClick={() => {
                  const sId = viewingSupplier.id;
                  setViewingSupplier(null);
                  onQuickEntryWithSupplier(sId);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center space-x-1"
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>Nouvelle entrée avec ce fournisseur</span>
              </button>

              <button
                onClick={() => setViewingSupplier(null)}
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
