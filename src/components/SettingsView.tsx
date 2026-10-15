import React, { useState, useEffect } from 'react';
import {
  Settings,
  Users,
  ShieldCheck,
  Database,
  Download,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Key,
  Shield,
  ShieldAlert,
  Clock,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface SettingsViewProps {
  onRefreshAll: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onRefreshAll }) => {
  const { user, loginAsDemo } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [activeTab, setActiveTab] = useState<'users' | 'backup' | 'audit'>('users');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Restore state
  const [restoreJson, setRestoreJson] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);

  const loadSettingsData = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      if (activeTab === 'users') {
        const u = await api.getUsers();
        setUsersList(u);
      } else if (activeTab === 'audit') {
        const logs = await api.getAuditLogs();
        setAuditLogs(logs);
      }
    } catch (err: any) {
      console.warn('Settings load:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettingsData();
  }, [activeTab, isAdmin]);

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      await api.updateUserRole(userId, newRole);
      setStatusMsg({ type: 'success', text: 'Rôle mis à jour avec succès.' });
      loadSettingsData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  const handleDownloadBackup = () => {
    window.location.href = '/api/backup';
  };

  const handleRestoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restoreJson.trim()) return;
    setIsRestoring(true);
    setStatusMsg(null);
    try {
      const parsed = JSON.parse(restoreJson);
      const res = await api.restoreBackup(parsed);
      setStatusMsg({ type: 'success', text: res.message || 'Base restaurée avec succès.' });
      setRestoreJson('');
      onRefreshAll();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'Erreur lors de la restauration : ' + err.message });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleSeedDemo = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await api.seedDemo();
      setStatusMsg({ type: 'success', text: res.message || 'Jeu de démonstration chargé avec succès !' });
      onRefreshAll();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
          <Settings className="w-6 h-6 text-slate-700" />
          <span>Paramètres du Système & Administration</span>
        </h1>
        <p className="text-sm text-slate-500">
          Gestion des utilisateurs, contrôle des accès RBAC, sauvegardes de la base et traçabilité d'audit
        </p>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl flex items-center space-x-2 text-xs border ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-red-50 text-red-900 border-red-200'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span className="font-semibold">{statusMsg.text}</span>
        </div>
      )}

      {/* Profile Overview Card */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              {user?.displayName || 'Utilisateur Connecté'}
            </h3>
            <p className="text-xs text-slate-500 font-mono">{user?.email}</p>
            <div className="mt-1 flex items-center space-x-2">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isAdmin ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800'
                }`}
              >
                Rôle : {isAdmin ? 'Administrateur (Contrôle total)' : 'Magasinier (Opérations de stock)'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Demo Role Switch Buttons */}
        <div className="flex items-center space-x-2 bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs">
          <span className="text-slate-500 font-semibold px-2">Basculer le rôle pour test :</span>
          <button
            onClick={() => loginAsDemo('admin')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              user?.role === 'admin'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Directeur Admin
          </button>
          <button
            onClick={() => loginAsDemo('storekeeper')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              user?.role === 'storekeeper'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Magasinier
          </button>
        </div>
      </div>

      {/* Seed Demo Data Card */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-white p-5 rounded-xl border border-amber-500/30 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-amber-500/20 text-amber-700 rounded-lg shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm">
              Jeu de Démonstration de Matériel de Sécurité
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">
              Initialise des équipements réalistes (caméras IP 4MP et 8MP 4K, enregistreurs NVR, alarmes sans fil Ajax, contrôle d'accès biométrique, rouleaux de câbles RJ45, extincteurs, batteries) avec stocks, alertes et mouvements réels en base de données.
            </p>
          </div>
        </div>

        <button
          onClick={handleSeedDemo}
          disabled={loading}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs shadow-sm transition-colors shrink-0 disabled:opacity-50 flex items-center space-x-1.5"
        >
          <Database className="w-4 h-4" />
          <span>{loading ? 'Chargement...' : 'Peupler le matériel démo'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 text-xs font-bold">
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 px-3 transition-colors border-b-2 flex items-center space-x-1.5 ${
            activeTab === 'users'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Utilisateurs & Rôles</span>
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`pb-3 px-3 transition-colors border-b-2 flex items-center space-x-1.5 ${
            activeTab === 'backup'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Sauvegarde & Restauration</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 px-3 transition-colors border-b-2 flex items-center space-x-1.5 ${
            activeTab === 'audit'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Journal d'Audit & Sécurité</span>
        </button>
      </div>

      {/* Tab: Users & Roles */}
      {activeTab === 'users' && (
        <div className="space-y-6 text-xs">
          {/* Permission Matrix Guide */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-900 mb-2 flex items-center space-x-1.5">
              <Shield className="w-4 h-4 text-amber-600" />
              <span>Matrice des Permissions & Rôles</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="font-bold text-amber-700 block mb-1">Administrateur :</span>
                <ul className="list-disc list-inside text-slate-600 space-y-1">
                  <li>Accès complet à l'application</li>
                  <li>Création, modification, archivage et suppression de produits</li>
                  <li>Création de catégories et de fournisseurs</li>
                  <li>Modification des rôles d'utilisateurs</li>
                  <li>Export de sauvegardes et restauration de base</li>
                  <li>Consultation du journal d'audit sensible</li>
                </ul>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="font-bold text-sky-700 block mb-1">Magasinier :</span>
                <ul className="list-disc list-inside text-slate-600 space-y-1">
                  <li>Consultation du catalogue et recherche des équipements</li>
                  <li>Enregistrement des entrées de stock</li>
                  <li>Enregistrement des sorties (avec contrôle anti-stock négatif)</li>
                  <li>Réalisation des inventaires physiques</li>
                  <li>Consultation de l'historique des mouvements</li>
                  <li>Téléchargement des rapports CSV Excel</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Utilisateurs Enregistrés en Base</h3>
              <span className="text-slate-400">{usersList.length} utilisateur(s)</span>
            </div>

            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Utilisateur</th>
                  <th className="px-4 py-3">Adresse E-mail</th>
                  <th className="px-4 py-3">Rôle Actuel</th>
                  <th className="px-4 py-3">Date d'inscription</th>
                  {isAdmin && <th className="px-4 py-3 text-right">Modifier le Rôle</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-semibold text-slate-900">{u.displayName || '—'}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.role === 'admin'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-sky-100 text-sky-800'
                        }`}
                      >
                        {u.role === 'admin' ? 'Administrateur' : 'Magasinier'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-semibold focus:outline-none focus:border-amber-500"
                        >
                          <option value="admin">Administrateur</option>
                          <option value="storekeeper">Magasinier</option>
                        </select>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Backup & Restore */}
      {activeTab === 'backup' && (
        <div className="space-y-6 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Export Card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                <Download className="w-5 h-5 text-amber-500" />
                <h3>Sauvegarde Complète (Export JSON)</h3>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Téléchargez l'intégralité des tables de la base de données PostgreSQL (produits, catégories, fournisseurs, mouvements de stock, sessions d'inventaire, utilisateurs).
              </p>
              <button
                onClick={handleDownloadBackup}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs flex items-center justify-center space-x-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Télécharger le fichier de sauvegarde (.json)</span>
              </button>
            </div>

            {/* Restore Card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                <Upload className="w-5 h-5 text-emerald-600" />
                <h3>Restauration de la Base de Données</h3>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Collez ci-dessous le contenu JSON d'un fichier de sauvegarde pour réinsérer les catégories, fournisseurs et articles.
              </p>
              <form onSubmit={handleRestoreSubmit} className="space-y-3">
                <textarea
                  rows={4}
                  value={restoreJson}
                  onChange={(e) => setRestoreJson(e.target.value)}
                  placeholder='{"version": "1.0", "data": { ... }}'
                  className="w-full p-2.5 border border-slate-200 rounded-lg font-mono text-[11px] focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  disabled={isRestoring || !restoreJson.trim()}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  <span>{isRestoring ? 'Restauration en cours...' : 'Exécuter la Restauration'}</span>
                </button>
              </form>
            </div>
          </div>

          {/* Wipe to Zero Card (Danger Zone) */}
          <div className="p-5 rounded-xl border border-red-200 bg-red-50/40 space-y-3">
            <div className="flex items-center space-x-2 text-red-800 font-bold text-sm">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              <h3>Zone de Danger : Remise à Zéro Complète du Magasin</h3>
            </div>
            <p className="text-slate-600 leading-relaxed text-xs">
              Cette action réinitialise complètement la base de données : tous les produits, mouvements de stock, retours de marchandise, fournisseurs et sessions d'inventaire seront supprimés. Les indicateurs du tableau de bord reviendront immédiatement à zéro. Les catégories de sécurité et les comptes utilisateurs sont conservés.
            </p>
            <button
              onClick={async () => {
                if (
                  window.confirm(
                    'ATTENTION : Êtes-vous ABSOLUMENT certain de vouloir remettre toutes les informations du magasin à zéro ? Cette action est irréversible.'
                  )
                ) {
                  try {
                    const res = await api.resetStore();
                    setStatusMsg({ type: 'success', text: res.message || 'Le magasin a été remis à zéro.' });
                    onRefreshAll();
                  } catch (err: any) {
                    setStatusMsg({ type: 'error', text: err.message });
                  }
                }
              }}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs flex items-center space-x-2 shadow-xs transition-colors"
            >
              <span>Remettre toutes les informations à zéro (Magasin Vierge)</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab: Audit Log */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden text-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900">Journal d'Audit & Traçabilité des Actions</h3>
              <p className="text-slate-400 text-[11px]">Enregistrement immuable des créations, modifications et régularisations</p>
            </div>
            <span className="font-semibold text-slate-500">{auditLogs.length} entrées</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-slate-600">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Date & Heure</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entité & Réf</th>
                  <th className="px-4 py-3">Détails de l'opération</th>
                  <th className="px-4 py-3">Utilisateur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400">
                      Aucune action enregistrée dans le journal.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString('fr-FR') : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[11px]">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-slate-700 whitespace-nowrap">
                        {log.entityType}: {log.entityId || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-800 font-medium">
                        {log.details || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 truncate max-w-[150px]">
                        {log.userEmail || 'Système'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
