import React, { useState } from 'react';
import { Layers, Plus, Package, ShieldCheck, X } from 'lucide-react';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface CategoriesViewProps {
  categories: any[];
  onRefresh: () => void;
  onSelectCategory: (categoryId: number) => void;
}

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  categories,
  onRefresh,
  onSelectCategory,
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await api.createCategory({ name, code, description });
      setIsAddModalOpen(false);
      setName('');
      setCode('');
      setDescription('');
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Impossible de créer la catégorie.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <Layers className="w-6 h-6 text-amber-500" />
            <span>Catégories d'Équipements de Sécurité</span>
          </h1>
          <p className="text-sm text-slate-500">
            Organisation du matériel selon les standards de protection des biens et des personnes
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs shadow-sm transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter une Catégorie</span>
          </button>
        )}
      </div>

      {/* Grid of Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((c) => (
          <div
            key={c.id}
            onClick={() => onSelectCategory(c.id)}
            className="bg-white p-5 rounded-xl border border-slate-200/80 hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-slate-100 group-hover:bg-amber-100 rounded-lg transition-colors text-slate-700 group-hover:text-amber-800">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  {c.code && (
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      {c.code}
                    </span>
                  )}
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 border border-amber-200 text-amber-800 flex items-center space-x-1">
                  <Package className="w-3 h-3 text-amber-600" />
                  <span>{c.productCount || 0} produit(s)</span>
                </span>
              </div>

              <h3 className="font-bold text-slate-900 group-hover:text-amber-600 transition-colors text-sm">
                {c.name}
              </h3>

              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                {c.description || "Équipements et accessoires spécialisés pour la sécurité électronique et physique."}
              </p>
            </div>

            <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 group-hover:text-amber-600 font-semibold">
              <span>Voir les produits associés</span>
              <span>→</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Add Category */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Nouvelle Catégorie de Sécurité</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg my-3 border border-red-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreate} className="mt-4 space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nom de la catégorie <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Télésurveillance & Transmetteurs"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Code court (Facultatif)</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Ex: TEL"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 uppercase font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Détails sur les types de matériels regroupés..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !name.trim()}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Création...' : 'Créer la catégorie'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
