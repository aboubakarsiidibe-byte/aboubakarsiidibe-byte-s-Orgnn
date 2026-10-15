import React, { useState } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  AlertTriangle,
  XCircle,
  Eye,
  Edit2,
  Archive,
  Trash2,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldAlert,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { api, formatFCFA } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface ProductsViewProps {
  products: any[];
  categories: any[];
  loading: boolean;
  onRefresh: () => void;
  onQuickMovement: (type: 'IN' | 'OUT', productId: number) => void;
  initialFilterStatus?: string;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  categories,
  loading,
  onRefresh,
  onQuickMovement,
  initialFilterStatus,
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Filters state
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<number | ''>('');
  const [statusFilter, setStatusFilter] = useState<string>(initialFilterStatus || 'all');
  const [showArchived, setShowArchived] = useState<boolean>(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [viewingProduct, setViewingProduct] = useState<any | null>(null);
  const [viewProductDetails, setViewProductDetails] = useState<{ product: any; movements: any[] } | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importCsvText, setImportCsvText] = useState('');
  const [importResult, setImportResult] = useState<any | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    sku: '',
    barcode: '',
    name: '',
    categoryId: categories[0]?.id || 1,
    brand: '',
    description: '',
    purchasePrice: 0,
    sellingPrice: 0,
    initialStock: 0,
    minStockThreshold: 5,
    unit: 'Unité',
    location: '',
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter products locally
  const filteredProducts = products.filter((p) => {
    if (showArchived ? !p.isArchived : p.isArchived) return false;

    if (selectedCat && p.categoryId !== selectedCat) return false;

    if (statusFilter === 'available' && p.currentStock <= p.minStockThreshold) return false;
    if (statusFilter === 'low_stock' && (p.currentStock === 0 || p.currentStock > p.minStockThreshold)) return false;
    if (statusFilter === 'out_of_stock' && p.currentStock > 0) return false;
    if (statusFilter === 'replenish' && p.currentStock > p.minStockThreshold) return false;

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const match =
        p.sku.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        (p.location && p.location.toLowerCase().includes(q));
      if (!match) return false;
    }

    return true;
  });

  // Calculate quick stats
  const totalCount = products.filter((p) => !p.isArchived).length;
  const lowCount = products.filter((p) => !p.isArchived && p.currentStock > 0 && p.currentStock <= p.minStockThreshold).length;
  const outCount = products.filter((p) => !p.isArchived && p.currentStock === 0).length;

  const handleOpenAdd = () => {
    setFormData({
      sku: '',
      barcode: '',
      name: '',
      categoryId: categories[0]?.id || 1,
      brand: '',
      description: '',
      purchasePrice: 0,
      sellingPrice: 0,
      initialStock: 0,
      minStockThreshold: 5,
      unit: 'Unité',
      location: '',
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (p: any) => {
    setEditingProduct(p);
    setFormData({
      sku: p.sku,
      barcode: p.barcode || '',
      name: p.name,
      categoryId: p.categoryId,
      brand: p.brand || '',
      description: p.description || '',
      purchasePrice: p.purchasePrice,
      sellingPrice: p.sellingPrice || 0,
      initialStock: p.currentStock,
      minStockThreshold: p.minStockThreshold,
      unit: p.unit || 'Unité',
      location: p.location || '',
    });
    setFormError(null);
  };

  const handleOpenDetail = async (p: any) => {
    setViewingProduct(p);
    setViewProductDetails(null);
    try {
      const details = await api.getProduct(p.id);
      setViewProductDetails(details);
    } catch (err: any) {
      console.error('Error fetching details:', err);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.sku.trim()) {
      setFormError('La référence SKU est obligatoire.');
      return;
    }
    if (!formData.name.trim()) {
      setFormError('Le nom du matériel est obligatoire.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, formData);
        setEditingProduct(null);
      } else {
        await api.createProduct(formData);
        setIsAddModalOpen(false);
      }
      onRefresh();
    } catch (err: any) {
      setFormError(err.message || 'Une erreur est survenue lors de l\'enregistrement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async (p: any) => {
    if (!window.confirm(`Confirmez-vous l'archivage du produit "${p.name}" (${p.sku}) ? Il ne sera plus proposé pour les ventes.`)) {
      return;
    }
    try {
      await api.archiveProduct(p.id);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (p: any) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement le produit "${p.name}" ? Cette action est irréversible.`)) {
      return;
    }
    try {
      await api.deleteProduct(p.id);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleExportCsv = () => {
    window.location.href = '/api/products/export-csv';
  };

  const handleImportCsv = async () => {
    if (!importCsvText.trim()) return;
    setIsSubmitting(true);
    setImportResult(null);
    try {
      const res = await api.importCsv(importCsvText);
      setImportResult(res);
      onRefresh();
    } catch (err: any) {
      setImportResult({ success: false, error: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Catalogue des Produits</h1>
          <p className="text-sm text-slate-500">
            Gestion des équipements de sécurité, seuils de stock et emplacements • FCFA
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Exporter CSV</span>
          </button>

          <button
            onClick={() => {
              setImportCsvText('');
              setImportResult(null);
              setIsImportModalOpen(true);
            }}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Importer CSV</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center space-x-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Produit</span>
          </button>
        </div>
      </div>

      {/* Quick Status Chips */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
            statusFilter === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Tous ({totalCount})
        </button>
        <button
          onClick={() => setStatusFilter('available')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
            statusFilter === 'available'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Disponibles ({totalCount - lowCount - outCount})
        </button>
        <button
          onClick={() => setStatusFilter('replenish')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 ${
            statusFilter === 'replenish'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'bg-amber-50 border border-amber-300 text-amber-800 hover:bg-amber-100'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          <span>À réapprovisionner ({lowCount + outCount})</span>
        </button>
        <button
          onClick={() => setStatusFilter('out_of_stock')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 ${
            statusFilter === 'out_of_stock'
              ? 'bg-red-600 text-white shadow-xs'
              : 'bg-red-50 border border-red-300 text-red-700 hover:bg-red-100'
          }`}
        >
          <XCircle className="w-3.5 h-3.5 text-red-600" />
          <span>En Rupture ({outCount})</span>
        </button>

        <div className="ml-auto flex items-center space-x-2">
          <label className="flex items-center space-x-1.5 text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded text-amber-500 focus:ring-amber-500 border-slate-300"
            />
            <span>Afficher les archivés</span>
          </label>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrer par nom, référence SKU, marque, emplacement..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="flex items-center space-x-2 w-full md:w-64">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value ? parseInt(e.target.value, 10) : '')}
              className="w-full py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-700"
            >
              <option value="">Toutes les catégories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {(search || selectedCat !== '' || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedCat('');
                setStatusFilter('all');
              }}
              className="text-xs text-slate-500 hover:text-slate-800 whitespace-nowrap px-2 py-1"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Products Data Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200/60">
              <tr>
                <th className="px-4 py-3">Référence SKU</th>
                <th className="px-4 py-3">Désignation</th>
                <th className="px-4 py-3">Catégorie</th>
                <th className="px-4 py-3">Emplacement</th>
                <th className="px-4 py-3 text-right">Prix Achat (FCFA)</th>
                <th className="px-4 py-3 text-center">Quantité Stock</th>
                <th className="px-4 py-3 text-center">État</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Chargement des articles...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Aucun produit ne correspond aux critères de recherche.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isRupture = p.currentStock === 0;
                  const isLow = p.currentStock > 0 && p.currentStock <= p.minStockThreshold;

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        p.isArchived ? 'opacity-60 bg-slate-50/50' : ''
                      }`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap font-mono font-bold text-slate-900">
                        {p.sku}
                        {p.barcode && <span className="block text-[10px] text-slate-400 font-normal">{p.barcode}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{p.name}</div>
                        {p.brand && <span className="text-[11px] text-slate-500 font-medium">Marque: {p.brand}</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                          {p.categoryName || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                        {p.location || <span className="text-slate-300 italic">Non défini</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-slate-800 whitespace-nowrap">
                        {formatFCFA(p.purchasePrice)}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className="text-sm font-bold font-mono text-slate-900">{p.currentStock}</span>
                        <span className="text-[11px] text-slate-400 ml-1">{p.unit}</span>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {isRupture ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                            Rupture (0)
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            Faible (≤ {p.minStockThreshold})
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                            Disponible
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1">
                          {/* Quick movement buttons */}
                          <button
                            onClick={() => onQuickMovement('IN', p.id)}
                            title="Entrée rapide de stock"
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"
                          >
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onQuickMovement('OUT', p.id)}
                            title="Sortie rapide de stock"
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>

                          {/* View details */}
                          <button
                            onClick={() => handleOpenDetail(p)}
                            title="Consulter la fiche détaillée"
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleOpenEdit(p)}
                            title="Modifier le produit"
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Archive */}
                          {!p.isArchived && (
                            <button
                              onClick={() => handleArchive(p)}
                              title="Archiver le produit"
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete if admin */}
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(p)}
                              title="Supprimer définitivement (si sans mouvements)"
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add or Edit Product */}
      {(isAddModalOpen || editingProduct) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Package className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-bold text-slate-900">
                  {editingProduct ? `Modifier : ${editingProduct.name}` : 'Nouveau Matériel de Sécurité'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingProduct(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Référence SKU unique <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                    placeholder="Ex: CAM-IP-DOME-4MP"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Code-barres (Facultatif)</label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="Ex: 693444550012"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nom / Désignation du produit <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Caméra Tube IP 8MP 4K Ultra HD Motorisée"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Catégorie <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Marque / Fabricant</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="Ex: Hikvision, Dahua, Ajax, Legrand..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Prix d'achat unitaire (FCFA) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Prix de vente conseillé (FCFA)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                {!editingProduct && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Stock initial</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={formData.initialStock}
                      onChange={(e) => setFormData({ ...formData, initialStock: parseInt(e.target.value, 10) || 0 })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 font-mono"
                    />
                    <span className="text-[10px] text-slate-400">Créera automatiquement le mouvement initial.</span>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Seuil d'alerte minimal <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={formData.minStockThreshold}
                    onChange={(e) => setFormData({ ...formData, minStockThreshold: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unité de mesure</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 bg-white"
                  >
                    <option value="Unité">Unité</option>
                    <option value="Mètre">Mètre</option>
                    <option value="Kit">Kit</option>
                    <option value="Rouleau">Rouleau</option>
                    <option value="Carton">Carton</option>
                    <option value="Boîte">Boîte</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Emplacement Magasin</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Ex: Rayon A1, Étagère 3"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Description technique</label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Caractéristiques, optique, portée infrarouge, certification..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingProduct(null);
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
                  {isSubmitting ? 'Enregistrement...' : editingProduct ? 'Mettre à jour' : 'Enregistrer le matériel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Product Detailed Sheet */}
      {viewingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div>
                <span className="font-mono text-xs text-amber-600 font-bold uppercase">{viewingProduct.sku}</span>
                <h3 className="text-xl font-bold text-slate-900">{viewingProduct.name}</h3>
              </div>
              <button onClick={() => setViewingProduct(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-6 text-xs">
              {/* Product Info Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Stock Actuel</span>
                  <div className="text-lg font-bold font-mono text-slate-900 mt-1">
                    {viewingProduct.currentStock} {viewingProduct.unit}
                  </div>
                  <span className="text-[10px] text-slate-500">Seuil min: {viewingProduct.minStockThreshold}</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Prix d'Achat</span>
                  <div className="text-lg font-bold font-mono text-emerald-700 mt-1">
                    {formatFCFA(viewingProduct.purchasePrice)}
                  </div>
                  <span className="text-[10px] text-slate-500">Unitaire HT</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Valeur en Stock</span>
                  <div className="text-lg font-bold font-mono text-slate-900 mt-1">
                    {formatFCFA(viewingProduct.currentStock * viewingProduct.purchasePrice)}
                  </div>
                  <span className="text-[10px] text-slate-500">Coût d'acquisition total</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Emplacement</span>
                  <div className="text-sm font-bold text-slate-800 mt-1">
                    {viewingProduct.location || 'Non assigné'}
                  </div>
                  <span className="text-[10px] text-slate-500">{viewingProduct.brand || 'Sans marque'}</span>
                </div>
              </div>

              {viewingProduct.description && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="font-semibold text-slate-700 block mb-1">Description technique :</span>
                  <p className="text-slate-600 leading-relaxed">{viewingProduct.description}</p>
                </div>
              )}

              {/* Linked Stock Movements History */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-900 text-sm">Historique des mouvements de ce produit</h4>
                  <span className="text-[11px] text-slate-400">
                    {viewProductDetails?.movements?.length || 0} opération(s)
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                      <tr>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">N° Mouvement</th>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2 text-center">Quantité</th>
                        <th className="px-3 py-2 text-center">Stock</th>
                        <th className="px-3 py-2">Motif</th>
                        <th className="px-3 py-2">Tiers / Fournisseur</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {!viewProductDetails?.movements || viewProductDetails.movements.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-4 text-center text-slate-400">
                            Aucun mouvement enregistré pour cet article.
                          </td>
                        </tr>
                      ) : (
                        viewProductDetails.movements.map((m: any) => {
                          const isEntry = m.movementType === 'IN';
                          const isExit = m.movementType === 'OUT';
                          return (
                            <tr key={m.id} className="hover:bg-slate-50/50">
                              <td className="px-3 py-2 whitespace-nowrap text-slate-500">
                                {m.createdAt ? new Date(m.createdAt).toLocaleDateString('fr-FR') : '—'}
                              </td>
                              <td className="px-3 py-2 font-mono text-[11px] font-semibold text-slate-700">
                                {m.movementNumber}
                              </td>
                              <td className="px-3 py-2">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    isEntry
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : isExit
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-purple-100 text-purple-800'
                                  }`}
                                >
                                  {isEntry ? 'Entrée' : isExit ? 'Sortie' : 'Régul.'}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-center font-mono font-bold">
                                <span className={isEntry ? 'text-emerald-600' : isExit ? 'text-amber-600' : 'text-purple-600'}>
                                  {isEntry ? `+${m.quantity}` : isExit ? `-${m.quantity}` : m.quantity}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-center font-mono text-slate-500 text-[11px]">
                                {m.stockBefore} → <span className="font-bold text-slate-800">{m.stockAfter}</span>
                              </td>
                              <td className="px-3 py-2 text-slate-700 truncate max-w-[150px]">{m.reason}</td>
                              <td className="px-3 py-2 text-slate-500 truncate max-w-[120px]">
                                {m.supplierName || m.recipient || '—'}
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

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setViewingProduct(null);
                    onQuickMovement('IN', viewingProduct.id);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 text-xs flex items-center space-x-1"
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>Enregistrer une Entrée</span>
                </button>
                <button
                  onClick={() => {
                    setViewingProduct(null);
                    onQuickMovement('OUT', viewingProduct.id);
                  }}
                  className="px-3 py-1.5 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 text-xs flex items-center space-x-1"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Enregistrer une Sortie</span>
                </button>
              </div>

              <button
                onClick={() => setViewingProduct(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: CSV Import */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Importation de Produits par CSV</h3>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-slate-600 mt-3">
              Collez vos lignes CSV ci-dessous (avec séparateur virgule ou point-virgule). Le format minimal accepté doit comporter les colonnes :
            </p>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-700 my-2 select-all">
              Reference;Nom;Categorie;PrixAchat;StockInitial;SeuilMin;Unite;Marque
            </div>

            <textarea
              rows={8}
              value={importCsvText}
              onChange={(e) => setImportCsvText(e.target.value)}
              placeholder={`Reference;Nom;Categorie;PrixAchat;StockInitial;SeuilMin;Unite;Marque\nCAM-IP-01;Camera IP Dome 2MP;Caméras de surveillance;35000;10;3;Unité;Hikvision\nNVR-04-POE;Enregistreur 4 voies;Enregistreurs DVR et NVR;85000;4;2;Unité;Dahua`}
              className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 font-mono text-[11px]"
            />

            {importResult && (
              <div
                className={`p-3 rounded-lg mt-3 ${
                  importResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {importResult.success ? (
                  <div>
                    <p className="font-bold">
                      {importResult.importedCount} produit(s) importé(s) avec succès !
                    </p>
                    {importResult.errorsCount > 0 && (
                      <p className="text-[11px] text-amber-700 mt-1">
                        {importResult.errorsCount} avertissement(s) ou doublons ignorés.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="font-bold">{importResult.error}</p>
                )}
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3 mt-4">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={handleImportCsv}
                disabled={isSubmitting || !importCsvText.trim()}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? 'Traitement en cours...' : 'Lancer l\'importation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
