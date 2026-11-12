import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Users, 
  Package, 
  Trash2, 
  Search, 
  Eye, 
  Database,
  CreditCard,
  DollarSign,
  TrendingUp,
  Zap,
  Edit,
  Save,
  History,
  Tag,
  ExternalLink,
  RefreshCw,
  Plus,
  Sparkles,
  X
} from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import { useAuth } from '../context/AuthContext';
import { CATEGORIES as DEFAULT_CATEGORIES } from '../data/categories';
import {
  STRAPI_ORIGIN,
  fetchStrapiUsers,
  fetchStrapiRoles,
  updateUserStrapi,
  fetchStrapiPayments,
  fetchStrapiSubscriptions,
  createCategoryStrapi,
  deleteCategoryStrapi
} from '../services/strapi';

export default function AdminDashboard({ onClose, onSelectAd }) {
  const { 
    ads, 
    categories,
    adsError,
    isDemoMode,
    reports, 
    plans,
    boostPackages,
    payments: localPayments,
    adminLogs,
    stats, 
    adminApproveAd, 
    adminRejectAd, 
    deleteAd, 
    adminResolveReport,
    updatePlan,
    updateBoostPackage,
    adminRefundPayment,
    refreshData
  } = useMarketplace();
  const { user, jwt, isAdmin, isSuperAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState('moderation');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [chartPeriod, setChartPeriod] = useState('daily');

  // Données réelles Strapi pour l'espace Admin
  const [strapiUsers, setStrapiUsers] = useState([]);
  const [strapiRoles, setStrapiRoles] = useState([]);
  const [strapiPayments, setStrapiPayments] = useState([]);
  const [strapiSubscriptions, setStrapiSubscriptions] = useState([]);

  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState(null);
  const [paymentsError, setPaymentsError] = useState(null);
  const [actionFeedback, setActionFeedback] = useState(null);

  // Ajout / Import Catégories Strapi
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Layers');
  const [catBusy, setCatBusy] = useState(false);

  // Édition dynamique des tarifs
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [editPlanPrice, setEditPlanPrice] = useState(0);
  const [editPlanLimit, setEditPlanLimit] = useState(3);
  const [editPlanCredits, setEditPlanCredits] = useState(0);

  const [editingBoostId, setEditingBoostId] = useState(null);
  const [editBoostPrice, setEditBoostPrice] = useState(500);

  const loadAdminStrapiData = useCallback(async () => {
    if (!jwt) {
      setUsersError("Connectez-vous avec un compte Strapi pour charger la liste des utilisateurs.");
      setPaymentsError("Authentification requise pour consulter les paiements Strapi.");
      return;
    }

    setLoadingUsers(true);
    setUsersError(null);
    setPaymentsError(null);

    // 1. Utilisateurs & Rôles Strapi
    try {
      const [usersData, rolesData] = await Promise.all([
        fetchStrapiUsers(jwt),
        fetchStrapiRoles(jwt).catch(() => [])
      ]);
      setStrapiUsers(usersData);
      setStrapiRoles(rolesData);
    } catch (err) {
      if (err.status === 403) {
        setUsersError("Accès refusé (403) sur GET /api/users. Dans Strapi Admin > Settings > Roles, autorisez 'Users-Permissions > User > find & update' pour ce rôle.");
      } else {
        setUsersError(err.message);
      }
    } finally {
      setLoadingUsers(false);
    }

    // 2. Paiements & Abonnements Strapi
    try {
      const [payData, subData] = await Promise.all([
        fetchStrapiPayments(jwt),
        fetchStrapiSubscriptions(jwt).catch(() => [])
      ]);
      setStrapiPayments(payData);
      setStrapiSubscriptions(subData);
    } catch (err) {
      if (err.status === 403) {
        setPaymentsError("Accès refusé (403) sur GET /api/paiements. Activez la permission 'Paiement > find' pour votre rôle dans Strapi.");
      } else {
        setPaymentsError(err.message);
      }
    }
  }, [jwt]);

  useEffect(() => {
    loadAdminStrapiData();
  }, [loadAdminStrapiData]);

  const showToast = (msg) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  // Bloquer / Débloquer un utilisateur dans Strapi (PUT /api/users/:id)
  const toggleUserBlock = async (targetUser) => {
    try {
      const updated = await updateUserStrapi(targetUser.id, { blocked: !targetUser.blocked }, jwt);
      setStrapiUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, blocked: updated.blocked } : u));
      showToast(`Utilisateur ${targetUser.username} ${updated.blocked ? 'suspendu' : 'réactivé'} dans Strapi.`);
    } catch (err) {
      alert(`Impossible de modifier l'utilisateur : ${err.message} (Vérifiez la permission User > update dans Strapi).`);
    }
  };

  // Changer le rôle d'un utilisateur dans Strapi (PUT /api/users/:id)
  const handleRoleChange = async (targetUser, newRoleId) => {
    try {
      await updateUserStrapi(targetUser.id, { role: Number(newRoleId) }, jwt);
      await loadAdminStrapiData();
      showToast(`Rôle mis à jour dans Strapi pour ${targetUser.username}.`);
    } catch (err) {
      alert(`Erreur changement de rôle : ${err.message}`);
    }
  };

  // Créer une catégorie dans Strapi
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setCatBusy(true);
    try {
      await createCategoryStrapi({ nom: newCatName.trim(), icone: newCatIcon }, jwt);
      setNewCatName('');
      await refreshData();
      showToast(`Catégorie "${newCatName}" créée dans Strapi !`);
    } catch (err) {
      alert(`Erreur Strapi POST /categories : ${err.message}. Activez 'Categorie > create' dans Strapi Settings > Roles.`);
    } finally {
      setCatBusy(false);
    }
  };

  // Supprimer une catégorie dans Strapi
  const handleDeleteCategory = async (cat) => {
    if (!window.confirm(`Supprimer la catégorie "${cat.name}" de Strapi ?`)) return;
    try {
      await deleteCategoryStrapi(cat.documentId || cat.id, jwt);
      await refreshData();
      showToast(`Catégorie "${cat.name}" supprimée.`);
    } catch (err) {
      alert(`Erreur Strapi DELETE /categories : ${err.message}`);
    }
  };

  // Importer les 12 catégories officielles dans Strapi en 1 clic
  const handleSeedCategoriesToStrapi = async () => {
    setCatBusy(true);
    let createdCount = 0;
    try {
      for (const cat of DEFAULT_CATEGORIES) {
        try {
          await createCategoryStrapi({ nom: cat.name, icone: cat.icon }, jwt);
          createdCount++;
        } catch {
          // Ignore si doublon unique
        }
      }
      await refreshData();
      showToast(`${createdCount} catégorie(s) importée(s) dans Strapi avec succès !`);
    } catch (err) {
      alert(`Erreur import Strapi : ${err.message}`);
    } finally {
      setCatBusy(false);
    }
  };

  const startEditPlan = (plan) => {
    setEditingPlanId(plan.id);
    setEditPlanPrice(plan.price_fcfa);
    setEditPlanLimit(plan.active_ads_limit);
    setEditPlanCredits(plan.monthly_boost_credits || 0);
  };

  const saveEditPlan = (planId) => {
    updatePlan(planId, {
      price_fcfa: Number(editPlanPrice),
      active_ads_limit: Number(editPlanLimit),
      monthly_boost_credits: Number(editPlanCredits)
    });
    setEditingPlanId(null);
  };

  const startEditBoost = (pkg) => {
    setEditingBoostId(pkg.id);
    setEditBoostPrice(pkg.price_fcfa);
  };

  const saveEditBoost = (pkgId) => {
    updateBoostPackage(pkgId, { price_fcfa: Number(editBoostPrice) });
    setEditingBoostId(null);
  };

  const filteredAds = ads.filter(ad => {
    if (statusFilter !== 'all' && ad.status !== statusFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        ad.title?.toLowerCase().includes(q) ||
        ad.contactName?.toLowerCase().includes(q) ||
        ad.commune?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const activeBoostedAds = ads.filter(a => a.is_boosted);

  // Combiner paiements Strapi réels et transactions locales éventuelles
  const combinedPayments = strapiPayments.length > 0 ? strapiPayments : localPayments;
  const confirmedCombined = combinedPayments.filter(p => p.status === 'confirmed');
  const realTotalRevenue = confirmedCombined.reduce((acc, p) => acc + Number(p.amount), 0);
  const realSubRevenue = confirmedCombined.filter(p => p.payment_type === 'subscription').reduce((acc, p) => acc + Number(p.amount), 0);
  const realBoostRevenue = confirmedCombined.filter(p => p.payment_type === 'boost').reduce((acc, p) => acc + Number(p.amount), 0);
  const realRefunded = combinedPayments.filter(p => p.status === 'refunded').reduce((acc, p) => acc + Number(p.amount), 0);
  const realFees = confirmedCombined.reduce((acc, p) => acc + (Number(p.gateway_fee) || 0), 0);
  const realNetRevenue = realTotalRevenue - realFees - realRefunded;

  const chartData = [
    { label: "Abonnements", value: realSubRevenue, color: "bg-eco-600" },
    { label: "Boosts", value: realBoostRevenue, color: "bg-warm-500" },
    { label: "Publicité", value: stats.adRevenue, color: "bg-blue-500" },
    { label: "Remboursés", value: realRefunded, color: "bg-red-500" }
  ];
  const maxChartValue = Math.max(1000, ...chartData.map(d => d.value));

  const isStrapiOnline = !adsError && !isDemoMode;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-0 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full h-full sm:h-auto max-w-6xl bg-white rounded-none sm:rounded-3xl shadow-2xl border-0 sm:border border-creme-300 overflow-hidden my-auto sm:max-h-[95vh] flex flex-col">
        
        {/* Header Admin */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-eco-950 text-white p-4 sm:px-8 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl sm:p-2.5 sm:rounded-2xl bg-warm-500 text-white shadow-md">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-base sm:text-2xl font-black tracking-tight text-white">
                {isSuperAdmin ? 'Espace Super Admin — Seconde Vie' : 'Espace Administrateur — Seconde Vie'}
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-300">
                Connecté : <strong>{user?.full_name || 'Visiteur'}</strong> ({isSuperAdmin ? <span className="text-amber-300 font-bold">Super Admin</span> : <>Rôle Strapi : <span className="text-emerald-300 font-bold">{user?.roleName || user?.role || 'Aucun'}</span></>})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <a
              href={`${STRAPI_ORIGIN}/admin`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 flex items-center gap-1.5 transition"
            >
              <span>Strapi Admin</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <div className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border ${
              isStrapiOnline 
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
            }`}>
              <Database className="w-3.5 h-3.5" />
              <span>{isStrapiOnline ? 'Strapi v5 Connecté ⚡' : 'Strapi Hors Ligne'}</span>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Bannière Feedback & Avertissement Rôle */}
        {actionFeedback && (
          <div className="bg-emerald-600 text-white text-xs font-bold px-6 py-2 text-center">
            ✓ {actionFeedback}
          </div>
        )}

        {!isAdmin && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-8 py-2.5 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2">
            <span>
              ⚠️ Votre compte Strapi actuel a le rôle <strong>{user?.roleName || user?.role || 'Public'}</strong>. Pour gérer les utilisateurs ou paiements via l'API, attribuez-lui un rôle <strong>Admin</strong> ou ajustez les permissions dans <a href={`${STRAPI_ORIGIN}/admin`} target="_blank" rel="noopener noreferrer" className="underline font-bold">Strapi Admin</a>.
            </span>
            <button onClick={loadAdminStrapiData} className="px-2.5 py-1 bg-amber-200/70 hover:bg-amber-200 rounded-lg font-bold text-[11px] flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Actualiser
            </button>
          </div>
        )}

        {/* Barre des 5 KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 sm:px-8 bg-creme-50/70 border-b border-creme-200">
          <div className="p-3 bg-white rounded-2xl border border-creme-200 shadow-xs">
            <span className="text-[10px] font-black uppercase text-slate-400">Chiffre d'Affaires Total</span>
            <div className="mt-1">
              <span className="text-xl font-black text-slate-900">{realTotalRevenue.toLocaleString('fr-FR')}</span>
              <span className="text-[10px] font-bold text-slate-400 ml-1">FCFA</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 mt-1 block">
              Net estimé : {realNetRevenue.toLocaleString('fr-FR')} F
            </span>
          </div>

          <div className="p-3 bg-white rounded-2xl border border-creme-200 shadow-xs">
            <span className="text-[10px] font-black uppercase text-slate-400">Annonces Strapi</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-eco-900">{ads.length}</span>
              <span className="text-xs font-bold text-eco-700">{stats.approvedAds} actives</span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium">{stats.freeDonations} don(s) gratuit(s)</span>
          </div>

          <div className="p-3 bg-white rounded-2xl border border-creme-200 shadow-xs">
            <span className="text-[10px] font-black uppercase text-slate-400">Utilisateurs Strapi</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-slate-900">{strapiUsers.length}</span>
              <span className="text-xs font-bold text-slate-500">{strapiSubscriptions.length} abo(s)</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {usersError ? 'Permission requise' : 'Synchronisé'}
            </span>
          </div>

          <div className="p-3 bg-white rounded-2xl border border-creme-200 shadow-xs">
            <span className="text-[10px] font-black uppercase text-slate-400">Catégories Strapi</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-slate-900">{categories.length}</span>
              <span className="text-xs font-bold text-eco-700">Univers</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">GET /api/categories</span>
          </div>

          <div className="p-3 bg-white rounded-2xl border border-creme-200 shadow-xs col-span-2 md:col-span-1">
            <span className="text-[10px] font-black uppercase text-slate-400">Boosts & Sécurité</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-black text-warm-700">{activeBoostedAds.length}</span>
              <span className="text-xs font-bold text-warm-700">Sponsorisées</span>
            </div>
            <span className="text-[10px] font-bold text-slate-500 mt-1 block">
              {stats.totalReports} signalement(s)
            </span>
          </div>
        </div>

        {/* Navigation Onglets */}
        <div className="flex border-b border-creme-200 px-4 sm:px-8 bg-white overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('moderation')}
            className={`py-3.5 px-3 text-xs font-extrabold border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'moderation' ? 'border-eco-700 text-eco-900 bg-eco-50/30' : 'border-transparent text-slate-500'
            }`}
          >
            <Package className="w-4 h-4" />
            Annonces Strapi ({ads.length})
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`py-3.5 px-3 text-xs font-extrabold border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'users' ? 'border-eco-700 text-eco-900 bg-eco-50/30' : 'border-transparent text-slate-500'
            }`}
          >
            <Users className="w-4 h-4" />
            Utilisateurs & Rôles ({strapiUsers.length})
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`py-3.5 px-3 text-xs font-extrabold border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'categories' ? 'border-eco-700 text-eco-900 bg-eco-50/30' : 'border-transparent text-slate-500'
            }`}
          >
            <Tag className="w-4 h-4" />
            Catégories ({categories.length})
          </button>

          <button
            onClick={() => setActiveTab('finance')}
            className={`py-3.5 px-3 text-xs font-extrabold border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'finance' ? 'border-eco-700 text-eco-900 bg-eco-50/30' : 'border-transparent text-slate-500'
            }`}
          >
            <CreditCard className="w-4 h-4 text-emerald-600" />
            Finances & Paiements ({combinedPayments.length})
          </button>

          <button
            onClick={() => setActiveTab('pricing')}
            className={`py-3.5 px-3 text-xs font-extrabold border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'pricing' ? 'border-eco-700 text-eco-900 bg-eco-50/30' : 'border-transparent text-slate-500'
            }`}
          >
            <DollarSign className="w-4 h-4 text-warm-600" />
            Tarifs & Quotas
          </button>

          <button
            onClick={() => setActiveTab('boosts')}
            className={`py-3.5 px-3 text-xs font-extrabold border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'boosts' ? 'border-eco-700 text-eco-900 bg-eco-50/30' : 'border-transparent text-slate-500'
            }`}
          >
            <Zap className="w-4 h-4 text-warm-500" />
            Boosts ({activeBoostedAds.length})
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`py-3.5 px-3 text-xs font-extrabold border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'reports' ? 'border-eco-700 text-eco-900 bg-eco-50/30' : 'border-transparent text-slate-500'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Signalements ({reports.length})
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3.5 px-3 text-xs font-extrabold border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'audit' ? 'border-eco-700 text-eco-900 bg-eco-50/30' : 'border-transparent text-slate-500'
            }`}
          >
            <History className="w-4 h-4 text-slate-600" />
            Journaux ({adminLogs.length})
          </button>
        </div>

        {/* Contenu */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-creme-50/30">
          
          {/* ONGLET 1 : MODÉRATION DES ANNONCES STRAPI */}
          {activeTab === 'moderation' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-creme-200">
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold ${
                      statusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Toutes ({ads.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('approved')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold ${
                      statusFilter === 'approved' ? 'bg-eco-700 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Actives ({stats.approvedAds})
                  </button>
                  <button
                    onClick={() => setStatusFilter('pending')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold ${
                      statusFilter === 'pending' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    En attente ({stats.pendingAds})
                  </button>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-60">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Rechercher..."
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs outline-none"
                    />
                  </div>
                  <button
                    onClick={refreshData}
                    className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700"
                    title="Rafraîchir depuis Strapi"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {filteredAds.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-creme-200 text-xs text-slate-500">
                  Aucune annonce dans ce filtre.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {filteredAds.map(ad => (
                    <div key={ad.id} className="bg-white rounded-2xl p-4 border border-creme-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5 flex-1 min-w-0">
                        <img src={ad.images?.[0]} alt={ad.title} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold bg-eco-50 text-eco-800 px-2 py-0.5 rounded">{ad.category}</span>
                            <span className="text-[10px] font-mono text-slate-400">docId: {ad.documentId}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              ad.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>{ad.status}</span>
                          </div>
                          <h4 className="font-extrabold text-slate-900 text-sm truncate mt-1">{ad.title}</h4>
                          <p className="text-xs font-bold text-slate-700">
                            {ad.type === 'don' ? 'DON GRATUIT (0 FCFA)' : `${Number(ad.price).toLocaleString('fr-FR')} FCFA`} • {ad.commune}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-end md:self-center">
                        <button onClick={() => onSelectAd(ad)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl" title="Voir"><Eye className="w-4 h-4" /></button>
                        {ad.status !== 'approved' && (
                          <button onClick={() => adminApproveAd(ad.id)} className="px-3 py-1.5 bg-eco-700 text-white font-black text-xs rounded-xl">✓ Activer</button>
                        )}
                        {ad.status === 'approved' && (
                          <button onClick={() => adminRejectAd(ad.id, "Suspendue par admin")} className="px-3 py-1.5 bg-amber-600 text-white font-black text-xs rounded-xl">Suspendre</button>
                        )}
                        <button onClick={() => { if (window.confirm('Supprimer cette annonce de Strapi ?')) deleteAd(ad.id); }} className="p-2 text-red-500 hover:bg-red-50 rounded-xl"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ONGLET 2 : UTILISATEURS & RÔLES RÉELS STRAPI */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              {usersError && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" /> Permission Strapi requise pour les utilisateurs
                  </p>
                  <p>{usersError}</p>
                </div>
              )}

              <div className="bg-white rounded-2xl border border-creme-200 overflow-hidden shadow-xs">
                {loadingUsers ? (
                  <div className="p-8 text-center text-xs text-slate-500">Chargement des utilisateurs Strapi...</div>
                ) : strapiUsers.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    Aucun utilisateur chargé. Vérifiez votre connexion et les permissions `Users-Permissions &gt; User &gt; find` dans Strapi.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px] text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-creme-200">
                        <tr>
                          <th className="p-3.5">Utilisateur Strapi</th>
                          <th className="p-3.5">Email</th>
                          <th className="p-3.5">Rôle BDD</th>
                          <th className="p-3.5">Statut</th>
                          <th className="p-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {strapiUsers.map(u => (
                          <tr key={u.id}>
                            <td className="p-3.5 font-bold text-slate-900">
                              {u.username || u.full_name}
                              <div className="text-[10px] text-slate-400 font-normal">ID: {u.id}</div>
                            </td>
                            <td className="p-3.5 text-slate-600">{u.email}</td>
                            <td className="p-3.5">
                              {strapiRoles.length > 0 ? (
                                <select
                                  value={strapiRoles.find(r => r.name === u.roleName || r.type === u.roleType)?.id || ''}
                                  onChange={e => handleRoleChange(u, e.target.value)}
                                  className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                                >
                                  {strapiRoles.map(r => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                  ))}
                                </select>
                              ) : (
                                <span className="px-2 py-0.5 bg-eco-50 text-eco-800 rounded font-bold">{u.roleName}</span>
                              )}
                            </td>
                            <td className="p-3.5">
                              {u.blocked ? (
                                <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded font-bold">Bloqué</span>
                              ) : (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">Actif</span>
                              )}
                            </td>
                            <td className="p-3.5 text-right">
                              <button
                                onClick={() => toggleUserBlock(u)}
                                className={`px-3 py-1.5 rounded-lg font-bold text-xs ${
                                  u.blocked ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {u.blocked ? 'Débloquer' : 'Bloquer'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ONGLET 3 : GESTION DES CATÉGORIES STRAPI */}
          {activeTab === 'categories' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-creme-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <form onSubmit={handleCreateCategory} className="flex flex-wrap sm:flex-nowrap items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    placeholder="Nouvelle catégorie Strapi (ex: Électroménager)..."
                    className="flex-1 min-w-[180px] p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-eco-600"
                  />
                  <select
                    value={newCatIcon}
                    onChange={e => setNewCatIcon(e.target.value)}
                    className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold outline-none"
                  >
                    <option value="Layers">Layers</option>
                    <option value="Shirt">Shirt (Mode)</option>
                    <option value="Smartphone">Smartphone</option>
                    <option value="Laptop">Laptop</option>
                    <option value="Home">Home (Maison)</option>
                    <option value="Armchair">Armchair (Meuble)</option>
                    <option value="Tv">Tv (Électro)</option>
                    <option value="BookOpen">BookOpen (Livres)</option>
                    <option value="Baby">Baby (Enfants)</option>
                    <option value="Trophy">Trophy (Sport)</option>
                  </select>
                  <button
                    type="submit"
                    disabled={catBusy}
                    className="px-4 py-2.5 bg-eco-700 hover:bg-eco-800 text-white font-bold text-xs rounded-xl flex items-center gap-1 disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" /> Créer
                  </button>
                </form>

                <button
                  type="button"
                  disabled={catBusy}
                  onClick={handleSeedCategoriesToStrapi}
                  className="px-4 py-2.5 bg-warm-600 hover:bg-warm-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 whitespace-nowrap disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" /> Importer les 12 catégories dans Strapi
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {categories.map(c => (
                  <div key={c.id} className="bg-white p-4 rounded-2xl border border-creme-200 flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-900">{c.name}</h4>
                      <span className="text-[10px] text-slate-400">
                        {ads.filter(a => a.category === c.id).length} annonce(s) {c.documentId ? `• Strapi #${c.numericId}` : '• Locale'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">Actif</span>
                      {c.documentId && (
                        <button
                          onClick={() => handleDeleteCategory(c)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                          title="Supprimer de Strapi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ONGLET 4 : FINANCES & PAIEMENTS */}
          {activeTab === 'finance' && (
            <div className="space-y-6">
              {paymentsError && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                  <strong>Info Strapi Paiements :</strong> {paymentsError}
                </div>
              )}

              <div className="bg-white rounded-3xl p-6 border border-creme-200 shadow-xs space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-eco-600" />
                      Évolution des Recettes & Ventilation (Orqex / Strapi)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Aucune donnée inventée : reflète les paiements enregistrés dans Strapi (`GET /api/paiements`).
                    </p>
                  </div>

                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    {['daily', 'weekly', 'monthly'].map(period => (
                      <button
                        key={period}
                        onClick={() => setChartPeriod(period)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                          chartPeriod === period ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                        }`}
                      >
                        {period === 'daily' ? 'Jour' : period === 'weekly' ? 'Semaine' : 'Mois'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="p-5 rounded-2xl bg-creme-50 border border-creme-200 space-y-3">
                    <span className="text-xs font-black uppercase text-slate-400">
                      Recettes Encaissées
                    </span>
                    <div className="text-4xl font-black text-eco-900">
                      {realTotalRevenue.toLocaleString('fr-FR')} FCFA
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-creme-200">
                      <div>
                        <span className="text-slate-400 block">Transactions confirmées :</span>
                        <span className="font-bold text-slate-900">{confirmedCombined.length}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Frais passerelle (~1.5%) :</span>
                        <span className="font-bold text-slate-900">{realFees.toLocaleString('fr-FR')} FCFA</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {chartData.map(item => (
                      <div key={item.label} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-600">{item.label}</span>
                          <span className="text-slate-900">{item.value.toLocaleString('fr-FR')} FCFA</span>
                        </div>
                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${item.color} transition-all duration-500`}
                            style={{ width: `${Math.min(100, (item.value / maxChartValue) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-creme-200 overflow-hidden shadow-xs">
                {combinedPayments.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    Aucune transaction enregistrée pour le moment dans Strapi (`/api/paiements`).
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[680px] text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-creme-200">
                        <tr>
                          <th className="p-3.5">Référence</th>
                          <th className="p-3.5">Utilisateur</th>
                          <th className="p-3.5">Type</th>
                          <th className="p-3.5">Passerelle</th>
                          <th className="p-3.5">Montant</th>
                          <th className="p-3.5">Statut</th>
                          <th className="p-3.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {combinedPayments.map(p => (
                          <tr key={p.id}>
                            <td className="p-3.5 font-mono font-bold text-slate-800">{p.transaction_id}</td>
                            <td className="p-3.5 font-bold text-slate-900">{p.user_name}</td>
                            <td className="p-3.5">{p.plan_id || p.payment_type}</td>
                            <td className="p-3.5 uppercase font-bold text-eco-700">{p.payment_provider}</td>
                            <td className="p-3.5 font-black text-slate-900">{Number(p.amount).toLocaleString('fr-FR')} F</td>
                            <td className="p-3.5">
                              <span className={`px-2 py-0.5 rounded font-bold ${
                                p.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' :
                                p.status === 'refunded' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                              }`}>{p.status}</span>
                            </td>
                            <td className="p-3.5 text-right">
                              {p.status === 'confirmed' && (
                                <button
                                  onClick={() => {
                                    const reason = window.prompt("Motif du remboursement :", "Remboursement approuvé");
                                    if (reason) adminRefundPayment(p.transaction_id, reason);
                                  }}
                                  className="px-2.5 py-1 text-[11px] font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg"
                                >
                                  Rembourser
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ONGLET 5 : TARIFS & QUOTAS */}
          {activeTab === 'pricing' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plans.map(plan => {
                  const isEditing = editingPlanId === plan.id;
                  return (
                    <div key={plan.id} className="bg-white p-5 rounded-3xl border border-creme-200 shadow-xs space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase bg-eco-50 text-eco-800 px-2 py-0.5 rounded">{plan.name}</span>
                        {!isEditing ? (
                          <button onClick={() => startEditPlan(plan)} className="text-slate-500 hover:text-eco-700"><Edit className="w-4 h-4" /></button>
                        ) : (
                          <button onClick={() => saveEditPlan(plan.id)} className="px-2 py-1 bg-eco-700 text-white text-xs font-bold rounded-lg flex items-center gap-1"><Save className="w-3 h-3" /> Enregistrer</button>
                        )}
                      </div>
                      {isEditing ? (
                        <div className="space-y-2 text-xs">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400">Prix (FCFA/mois)</label>
                            <input type="number" value={editPlanPrice} onChange={e => setEditPlanPrice(e.target.value)} className="w-full p-2 border rounded-xl font-bold" />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400">Quota Annonces Actives</label>
                            <input type="number" value={editPlanLimit} onChange={e => setEditPlanLimit(e.target.value)} className="w-full p-2 border rounded-xl font-bold" />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400">Crédits de Boost Mensuels</label>
                            <input type="number" value={editPlanCredits} onChange={e => setEditPlanCredits(e.target.value)} className="w-full p-2 border rounded-xl font-bold" />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 text-xs text-slate-700">
                          <div className="flex justify-between py-1 border-b border-slate-100">
                            <span className="text-slate-400">Prix mensuel :</span>
                            <span className="font-extrabold text-slate-900">{Number(plan.price_fcfa).toLocaleString('fr-FR')} FCFA</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-100">
                            <span className="text-slate-400">Annonces actives max :</span>
                            <span className="font-black text-eco-800">{plan.active_ads_limit}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-100">
                            <span className="text-slate-400">Crédits boost / mois :</span>
                            <span className="font-black text-warm-700">{plan.monthly_boost_credits || 0}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="bg-white p-5 rounded-3xl border border-creme-200 shadow-xs space-y-4">
                <h4 className="font-black text-sm text-slate-900">Tarifs des Boosts Individuels</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {boostPackages.map(pkg => {
                    const isEditing = editingBoostId === pkg.id;
                    return (
                      <div key={pkg.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                        <div>
                          <p className="font-black text-xs text-slate-900">{pkg.name}</p>
                          <span className="text-[10px] text-slate-400">{pkg.duration_hours}h</span>
                        </div>
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input type="number" value={editBoostPrice} onChange={e => setEditBoostPrice(e.target.value)} className="w-20 p-1 text-xs font-bold border rounded" />
                            <button onClick={() => saveEditBoost(pkg.id)} className="px-2 py-1 bg-eco-700 text-white rounded text-[10px] font-bold">OK</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-black text-xs text-warm-700">{Number(pkg.price_fcfa).toLocaleString('fr-FR')} FCFA</span>
                            <button onClick={() => startEditBoost(pkg)} className="text-slate-400 hover:text-slate-700"><Edit className="w-3.5 h-3.5" /></button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ONGLET 6 : BOOSTS */}
          {activeTab === 'boosts' && (
            <div className="space-y-3">
              {activeBoostedAds.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-creme-200 text-xs text-slate-500">
                  Aucun boost actif en ce moment.
                </div>
              ) : (
                activeBoostedAds.map(ad => (
                  <div key={ad.id} className="bg-white p-4 rounded-2xl border border-warm-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={ad.images?.[0]} alt="" className="w-12 h-12 rounded-xl object-cover" />
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">{ad.title}</h4>
                        <span className="text-[10px] text-slate-400">{ad.commune}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-warm-700 bg-warm-50 px-2.5 py-1 rounded-lg border border-warm-200">
                      Expire le {ad.boost_expires_at ? new Date(ad.boost_expires_at).toLocaleString('fr-FR') : '-'}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ONGLET 7 : SIGNALEMENTS */}
          {activeTab === 'reports' && (
            <div className="space-y-3">
              {reports.length === 0 ? (
                <div className="bg-white p-8 text-center rounded-2xl border border-creme-200 text-xs text-slate-500">Aucun signalement en attente.</div>
              ) : (
                reports.map(rep => (
                  <div key={rep.id} className="bg-white p-4 rounded-2xl border border-amber-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-red-700 bg-red-50 px-2 py-0.5 rounded">{rep.reason}</span>
                      <p className="text-xs text-slate-700 mt-1 italic">"{rep.details}"</p>
                    </div>
                    <button onClick={() => adminResolveReport(rep.id)} className="px-3 py-1.5 bg-eco-700 text-white font-bold text-xs rounded-xl">✓ Classer</button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ONGLET 8 : JOURNAUX */}
          {activeTab === 'audit' && (
            <div className="bg-white rounded-2xl border border-creme-200 overflow-hidden shadow-xs">
              {adminLogs.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">Aucune opération sensible journalisée pour l'instant.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[540px] text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-creme-200">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Acteur</th>
                        <th className="p-3">Action</th>
                        <th className="p-3">Cible</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {adminLogs.map(log => (
                        <tr key={log.id}>
                          <td className="p-3 text-slate-400">{new Date(log.created_at).toLocaleString('fr-FR')}</td>
                          <td className="p-3 font-bold text-slate-800">{log.actor_name}</td>
                          <td className="p-3"><span className="px-2 py-0.5 bg-slate-100 rounded font-mono font-bold text-[10px]">{log.action}</span></td>
                          <td className="p-3 font-mono text-[11px] text-slate-600">{log.target_type} ({log.target_id})</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
