import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  LogOut,
  Info,
  X
} from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import { useAuth } from '../context/AuthContext';
import { CATEGORIES as DEFAULT_CATEGORIES } from '../data/categories';
import { isAdBoostActive } from '../utils/adHelpers';
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

const FALLBACK_ADMIN_IMAGE =
  'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&auto=format&fit=crop&q=80';

export default function AdminDashboard({ onClose, onSelectAd, initialTab = 'moderation' }) {
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
    adminToggleBoostAd,
    deleteAd,
    adminResolveReport,
    updatePlan,
    updateBoostPackage,
    adminRefundPayment,
    refreshData
  } = useMarketplace();
  const { user, jwt, isAdmin, isSuperAdmin, logout } = useAuth();

  const [activeTab, setActiveTab] = useState(initialTab);
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [chartPeriod, setChartPeriod] = useState('all');
  const [syncing, setSyncing] = useState(false);

  // Données Strapi pour l'espace Admin
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

  const isStrapiOnline = !adsError && !isDemoMode;

  const showToast = (msg) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  const loadAdminStrapiData = useCallback(async () => {
    if (!isStrapiOnline) {
      setUsersError(null);
      setPaymentsError(null);
      setStrapiUsers([]);
      setStrapiPayments([]);
      return;
    }

    if (!jwt) {
      setUsersError('Session JWT Strapi absente. Reconnectez-vous pour synchroniser les utilisateurs.');
      setPaymentsError('Session JWT Strapi absente pour charger les paiements.');
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
        setUsersError(
          "Accès refusé (403) sur GET /api/users. Activez 'Users-Permissions > User > find & update' dans Strapi Admin."
        );
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
        setPaymentsError(
          "Accès refusé (403) sur GET /api/paiements. Activez 'Paiement > find' dans Strapi Admin."
        );
      } else {
        setPaymentsError(err.message);
      }
    }
  }, [jwt, isStrapiOnline]);

  useEffect(() => {
    loadAdminStrapiData();
  }, [loadAdminStrapiData]);

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      await refreshData();
      await loadAdminStrapiData();
      showToast('Données administrateur actualisées.');
    } finally {
      setSyncing(false);
    }
  };

  // Liste locale de repli en mode aperçu (utilisateur connecté + vendeurs du catalogue)
  const isOfflineNetwork =
    !isStrapiOnline || Boolean(usersError && /failed to fetch|network|injoignable/i.test(usersError));
  const isPermission403 = !isOfflineNetwork && Boolean(usersError && /403|refusé|permission/i.test(usersError));

  const previewUsers = useMemo(() => {
    const map = new Map();
    if (user) {
      const adminKey = user.email || user.username || user.id || 'session-admin';
      map.set(adminKey, {
        id: user.id || 'session-admin',
        username: user.username || user.full_name || 'Super Admin',
        full_name: user.full_name || user.username || 'Super Admin',
        email: user.email || 'Session active',
        roleName: isSuperAdmin ? 'Super Admin' : user.roleName || 'Admin',
        blocked: false,
        isPreview: true,
        isCurrentSession: true
      });
    }
    ads.forEach((ad) => {
      const key = ad.sellerId || ad.contactPhone || ad.contactName;
      if (key && !map.has(key)) {
        map.set(key, {
          id: key,
          username: ad.contactName || 'Vendeur Abidjan',
          full_name: ad.contactName || 'Vendeur Abidjan',
          email: ad.contactWhatsapp || ad.contactPhone || ad.commune || 'Abidjan',
          roleName: 'Vendeur',
          blocked: false,
          isPreview: true
        });
      }
    });
    return Array.from(map.values());
  }, [user, isSuperAdmin, ads]);

  // Si Strapi ne renvoie aucun utilisateur (offline ou 403), on affiche toujours les comptes locaux avec la session active
  const displayedUsers = strapiUsers.length > 0 ? strapiUsers : previewUsers;

  // Bloquer / Débloquer un utilisateur dans Strapi (PUT /api/users/:id)
  const toggleUserBlock = async (targetUser) => {
    if (targetUser.isPreview) {
      showToast('Action disponible dès que l’API Strapi est connectée.');
      return;
    }
    try {
      const updated = await updateUserStrapi(targetUser.id, { blocked: !targetUser.blocked }, jwt);
      setStrapiUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, blocked: updated.blocked } : u))
      );
      showToast(`Utilisateur ${targetUser.username} ${updated.blocked ? 'suspendu' : 'réactivé'}.`);
    } catch (err) {
      alert(`Impossible de modifier l'utilisateur : ${err.message}`);
    }
  };

  // Changer le rôle d'un utilisateur dans Strapi (PUT /api/users/:id)
  const handleRoleChange = async (targetUser, newRoleId) => {
    if (targetUser.isPreview) return;
    try {
      await updateUserStrapi(targetUser.id, { role: Number(newRoleId) }, jwt);
      await loadAdminStrapiData();
      showToast(`Rôle mis à jour pour ${targetUser.username}.`);
    } catch (err) {
      alert(`Erreur changement de rôle : ${err.message}`);
    }
  };

  // Créer une catégorie dans Strapi
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    if (!isStrapiOnline || !jwt) {
      showToast('Connectez l’API Strapi pour enregistrer une nouvelle catégorie en base.');
      return;
    }
    setCatBusy(true);
    try {
      await createCategoryStrapi({ nom: newCatName.trim(), icone: newCatIcon }, jwt);
      setNewCatName('');
      await refreshData();
      showToast(`Catégorie "${newCatName}" créée dans Strapi !`);
    } catch (err) {
      alert(`Erreur Strapi POST /categories : ${err.message}`);
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
    if (!isStrapiOnline || !jwt) {
      showToast('Les 12 catégories locales sont déjà chargées en mode aperçu.');
      return;
    }
    setCatBusy(true);
    let createdCount = 0;
    try {
      for (const cat of DEFAULT_CATEGORIES) {
        try {
          await createCategoryStrapi({ nom: cat.name, icone: cat.icon }, jwt);
          createdCount++;
        } catch {
          // Ignore doublons
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
    showToast('Formule mise à jour.');
  };

  const startEditBoost = (pkg) => {
    setEditingBoostId(pkg.id);
    setEditBoostPrice(pkg.price_fcfa);
  };

  const saveEditBoost = (pkgId) => {
    updateBoostPackage(pkgId, { price_fcfa: Number(editBoostPrice) });
    setEditingBoostId(null);
    showToast('Tarif boost mis à jour.');
  };

  const filteredAds = ads.filter((ad) => {
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

  const activeBoostedAds = ads.filter((a) => isAdBoostActive(a));
  const activeCategoriesCount = categories.filter((c) => ads.some((a) => a.category === c.id)).length;

  // Combiner paiements Strapi réels et transactions locales éventuelles
  const combinedPayments = strapiPayments.length > 0 ? strapiPayments : localPayments;
  const periodCutoffMs =
    chartPeriod === 'daily'
      ? Date.now() - 86400000
      : chartPeriod === 'weekly'
        ? Date.now() - 7 * 86400000
        : chartPeriod === 'monthly'
          ? Date.now() - 30 * 86400000
          : 0;

  const periodPayments = useMemo(
    () =>
      periodCutoffMs === 0
        ? combinedPayments
        : combinedPayments.filter((p) => {
            const ts = new Date(p.confirmed_at || p.created_at || 0).getTime();
            return ts >= periodCutoffMs;
          }),
    [combinedPayments, periodCutoffMs]
  );

  // Comptabilité corrigée : confirmedPayments exclut déjà les remboursements
  const confirmedCombined = combinedPayments.filter((p) => p.status === 'confirmed');
  const realTotalRevenue = confirmedCombined.reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const realRefunded = combinedPayments
    .filter((p) => p.status === 'refunded')
    .reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const realFees = confirmedCombined.reduce((acc, p) => acc + (Number(p.gateway_fee) || 0), 0);
  const realNetRevenue = Math.max(0, realTotalRevenue - realFees);

  const periodConfirmed = periodPayments.filter((p) => p.status === 'confirmed');
  const periodTotalRevenue = periodConfirmed.reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const periodSubRevenue = periodConfirmed
    .filter((p) => p.payment_type === 'subscription')
    .reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const periodBoostRevenue = periodConfirmed
    .filter((p) => p.payment_type === 'boost')
    .reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const periodRefunded = periodPayments
    .filter((p) => p.status === 'refunded')
    .reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const periodFees = periodConfirmed.reduce((acc, p) => acc + (Number(p.gateway_fee) || 0), 0);

  const chartData = [
    { label: 'Abonnements', value: periodSubRevenue, color: 'bg-eco-600' },
    { label: 'Boosts', value: periodBoostRevenue, color: 'bg-warm-500' },
    { label: 'Publicité', value: stats.adRevenue, color: 'bg-blue-500' },
    { label: 'Remboursés', value: periodRefunded, color: 'bg-red-500' }
  ];
  const maxChartValue = Math.max(1000, ...chartData.map((d) => d.value));

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-0 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full h-full sm:h-auto max-w-6xl bg-white rounded-none sm:rounded-3xl shadow-2xl border-0 sm:border border-creme-300 overflow-hidden my-auto sm:max-h-[94vh] flex flex-col">
        {/* Header Super Admin — Boutons de session fixes en haut à droite */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-eco-950 text-white px-4 py-3.5 sm:px-7 sm:py-4 border-b border-slate-800 space-y-2.5 flex-shrink-0">
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="p-2 sm:p-2.5 rounded-xl bg-warm-500 text-white shadow-md flex-shrink-0">
                <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-sm sm:text-xl font-black tracking-tight text-white truncate">
                    {isSuperAdmin ? 'Espace Super Admin — Seconde Vie' : 'Espace Administrateur — Seconde Vie'}
                  </h1>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/30 whitespace-nowrap">
                    {isSuperAdmin ? 'Super Admin' : user?.roleName || 'Admin'}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-300 truncate mt-0.5">
                  Connecté :{' '}
                  <strong className="text-white">
                    {user?.full_name || user?.username || 'Administrateur'}
                  </strong>
                  {user?.email ? (
                    <span className="hidden sm:inline text-slate-400"> • {user.email}</span>
                  ) : null}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={handleSyncAll}
                title="Actualiser les données"
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-100 transition"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => {
                  logout();
                  onClose();
                }}
                title="Se déconnecter de la session admin"
                className="px-2.5 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/30 border border-red-400/25 text-red-200 text-xs font-bold flex items-center gap-1 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Déconnexion</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer l'espace admin"
                className="p-2 rounded-xl bg-white/10 hover:bg-white/25 text-white transition"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10 text-[11px] flex-wrap">
            <div
              className={`px-2.5 py-1 rounded-lg font-bold inline-flex items-center gap-1.5 border ${
                isStrapiOnline
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-sky-500/15 text-sky-200 border-sky-400/30'
              }`}
            >
              <Database className="w-3.5 h-3.5 flex-shrink-0" />
              <span>
                {isStrapiOnline
                  ? 'API Strapi v5 connectée'
                  : 'Mode Vitrine Autonome (Hors ligne)'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {!isStrapiOnline && (
                <button
                  type="button"
                  onClick={handleSyncAll}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15 transition flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
                  <span>Tester la connexion</span>
                </button>
              )}
              {isStrapiOnline && (
                <a
                  href={`${STRAPI_ORIGIN}/admin`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 inline-flex items-center gap-1 transition"
                >
                  <span>Console Strapi</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Bannière Feedback */}
        {actionFeedback && (
          <div className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 text-center flex-shrink-0">
            ✓ {actionFeedback}
          </div>
        )}

        {!isAdmin && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-7 py-2 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
            <span>
              ⚠️ Votre compte actuel a le rôle <strong>{user?.roleName || user?.role || 'Public'}</strong>.
            </span>
            <button
              onClick={loadAdminStrapiData}
              className="px-2.5 py-1 bg-amber-200/70 hover:bg-amber-200 rounded-lg font-bold text-[11px] flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Actualiser
            </button>
          </div>
        )}

        {/* Barre des 5 KPIs compacts */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3 p-3 sm:px-7 sm:py-4 bg-creme-50/70 border-b border-creme-200 flex-shrink-0">
          <div className="p-2.5 sm:p-3 bg-white rounded-2xl border border-creme-200 shadow-xs">
            <span className="text-[10px] font-black uppercase text-slate-400 block truncate">
              Chiffre d&apos;affaires
            </span>
            <div className="mt-1 flex items-baseline gap-1 flex-wrap">
              <span className="text-lg sm:text-xl font-black text-slate-900 whitespace-nowrap">
                {realTotalRevenue.toLocaleString('fr-FR')}
              </span>
              <span className="text-[10px] font-bold text-slate-400">FCFA</span>
            </div>
            <div className="mt-0.5 flex items-center justify-between gap-1 flex-wrap">
              <span className="text-[10px] font-bold text-emerald-700 whitespace-nowrap">
                Net : {Math.max(0, realNetRevenue).toLocaleString('fr-FR')} F
              </span>
              {realRefunded > 0 && (
                <span className="text-[10px] font-semibold text-amber-700 whitespace-nowrap">
                  Remb. {realRefunded.toLocaleString('fr-FR')} F
                </span>
              )}
            </div>
          </div>

          <div className="p-2.5 sm:p-3 bg-white rounded-2xl border border-creme-200 shadow-xs">
            <span className="text-[10px] font-black uppercase text-slate-400 block truncate">
              Catalogue Annonces
            </span>
            <div className="flex items-baseline justify-between mt-1 gap-1">
              <span className="text-xl sm:text-2xl font-black text-eco-900">{ads.length}</span>
              <span className="text-[11px] font-bold text-eco-700 whitespace-nowrap">
                {stats.approvedAds} actives
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium block truncate">
              {stats.freeDonations} don(s) • {stats.pendingAds} en attente
            </span>
          </div>

          <div className="p-2.5 sm:p-3 bg-white rounded-2xl border border-creme-200 shadow-xs">
            <span className="text-[10px] font-black uppercase text-slate-400 block truncate">
              Membres & Vendeurs
            </span>
            <div className="flex items-baseline justify-between mt-1 gap-1">
              <span className="text-xl sm:text-2xl font-black text-slate-900">
                {displayedUsers.length}
              </span>
              <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">
                {strapiSubscriptions.length} abo(s)
              </span>
            </div>
            <span
              className={`text-[10px] block mt-0.5 truncate font-semibold ${
                strapiUsers.length > 0 ? 'text-emerald-700' : 'text-slate-500'
              }`}
            >
              {strapiUsers.length > 0
                ? '✓ Synchronisé Strapi'
                : '1 session active + vendeurs'}
            </span>
          </div>

          <div className="p-2.5 sm:p-3 bg-white rounded-2xl border border-creme-200 shadow-xs">
            <span className="text-[10px] font-black uppercase text-slate-400 block truncate">
              Catégories
            </span>
            <div className="flex items-baseline justify-between mt-1 gap-1">
              <span className="text-xl sm:text-2xl font-black text-slate-900">{categories.length}</span>
              <span className="text-[11px] font-bold text-eco-700 whitespace-nowrap">
                {activeCategoriesCount} actives
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
              Univers marketplace
            </span>
          </div>

          <div className="p-2.5 sm:p-3 bg-white rounded-2xl border border-creme-200 shadow-xs col-span-2 sm:col-span-1">
            <span className="text-[10px] font-black uppercase text-slate-400 block truncate">
              Boosts & Signalements
            </span>
            <div className="mt-1 flex items-baseline justify-between gap-1">
              <span className="text-xl font-black text-warm-700">{activeBoostedAds.length}</span>
              <span className="text-[11px] font-bold text-warm-700 whitespace-nowrap">
                Sponsorisées
              </span>
            </div>
            <span className="text-[10px] font-bold text-slate-500 mt-0.5 block truncate">
              {stats.totalReports} signalement(s)
            </span>
          </div>
        </div>

        {/* Navigation Onglets */}
        <div className="flex border-b border-creme-200 px-3 sm:px-7 bg-white overflow-x-auto no-scrollbar flex-shrink-0">
          <button
            onClick={() => setActiveTab('moderation')}
            className={`py-3 px-3 text-xs font-extrabold border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'moderation'
                ? 'border-eco-700 text-eco-900 bg-eco-50/30'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Package className="w-4 h-4" />
            Annonces ({ads.length})
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`py-3 px-3 text-xs font-extrabold border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'users'
                ? 'border-eco-700 text-eco-900 bg-eco-50/30'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            Comptes ({displayedUsers.length})
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`py-3 px-3 text-xs font-extrabold border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'categories'
                ? 'border-eco-700 text-eco-900 bg-eco-50/30'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Tag className="w-4 h-4" />
            Catégories ({categories.length})
          </button>

          <button
            onClick={() => setActiveTab('finance')}
            className={`py-3 px-3 text-xs font-extrabold border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'finance'
                ? 'border-eco-700 text-eco-900 bg-eco-50/30'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CreditCard className="w-4 h-4 text-emerald-600" />
            Finances ({combinedPayments.length})
          </button>

          <button
            onClick={() => setActiveTab('pricing')}
            className={`py-3 px-3 text-xs font-extrabold border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'pricing'
                ? 'border-eco-700 text-eco-900 bg-eco-50/30'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <DollarSign className="w-4 h-4 text-warm-600" />
            Tarifs & Quotas
          </button>

          <button
            onClick={() => setActiveTab('boosts')}
            className={`py-3 px-3 text-xs font-extrabold border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'boosts'
                ? 'border-eco-700 text-eco-900 bg-eco-50/30'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Zap className="w-4 h-4 text-warm-500" />
            Boosts ({activeBoostedAds.length})
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`py-3 px-3 text-xs font-extrabold border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'reports'
                ? 'border-eco-700 text-eco-900 bg-eco-50/30'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Signalements ({reports.length})
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 px-3 text-xs font-extrabold border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'audit'
                ? 'border-eco-700 text-eco-900 bg-eco-50/30'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4 text-slate-600" />
            Journaux ({adminLogs.length})
          </button>
        </div>

        {/* Contenu principal */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1 bg-creme-50/30">
          {/* ONGLET 1 : MODÉRATION DES ANNONCES */}
          {activeTab === 'moderation' && (
            <div className="space-y-3.5">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white p-3 rounded-2xl border border-creme-200">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap ${
                      statusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Toutes ({ads.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('approved')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap ${
                      statusFilter === 'approved' ? 'bg-eco-700 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Actives ({stats.approvedAds})
                  </button>
                  <button
                    onClick={() => setStatusFilter('pending')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap ${
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
                      placeholder="Rechercher annonce, ville..."
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs outline-none focus:border-eco-600"
                    />
                  </div>
                  <button
                    onClick={handleSyncAll}
                    className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 flex-shrink-0"
                    title="Actualiser"
                  >
                    <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {filteredAds.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-creme-200 text-xs text-slate-500">
                  Aucune annonce dans ce filtre.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5">
                  {filteredAds.map((ad) => {
                    const boosted = isAdBoostActive(ad);
                    return (
                      <div
                        key={ad.id}
                        className="bg-white rounded-2xl p-3 sm:p-4 border border-creme-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0 w-full">
                          <img
                            src={ad.images?.[0] || FALLBACK_ADMIN_IMAGE}
                            alt={ad.title}
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = FALLBACK_ADMIN_IMAGE;
                            }}
                            className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover flex-shrink-0 bg-slate-100"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-bold bg-eco-50 text-eco-800 px-2 py-0.5 rounded">
                                {ad.category}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">
                                {ad.documentId ? `#${ad.documentId}` : `Réf. ${ad.id}`}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  ad.status === 'approved'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : ad.status === 'rejected'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {ad.status === 'approved'
                                  ? 'Active'
                                  : ad.status === 'rejected'
                                    ? 'Suspendue'
                                    : 'En attente'}
                              </span>
                              {boosted && (
                                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 inline-flex items-center gap-0.5">
                                  <Zap className="w-2.5 h-2.5" /> Sponsorisée
                                </span>
                              )}
                            </div>
                            <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm truncate mt-1">
                              {ad.title}
                            </h4>
                            <p className="text-[11px] sm:text-xs font-bold text-slate-700 mt-0.5">
                              {ad.type === 'don' || ad.price === 0
                                ? 'DON GRATUIT (0 FCFA)'
                                : `${Number(ad.price).toLocaleString('fr-FR')} FCFA`}{' '}
                              • {ad.commune}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 self-end md:self-center flex-wrap">
                          <button
                            onClick={() => onSelectAd(ad)}
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200"
                            title="Voir l'annonce"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              const active = adminToggleBoostAd(ad.id);
                              showToast(active ? 'Annonce sponsorisée (+7 jours).' : 'Boost retiré.');
                            }}
                            className={`px-2.5 py-1.5 font-black text-[11px] rounded-xl inline-flex items-center gap-1 border transition ${
                              boosted
                                ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-amber-50 hover:text-amber-800'
                            }`}
                            title={boosted ? 'Retirer la mise en avant' : 'Sponsoriser cette annonce'}
                          >
                            <Zap className="w-3 h-3" />
                            <span>{boosted ? 'Boostée' : 'Booster'}</span>
                          </button>
                          {ad.status !== 'approved' ? (
                            <button
                              onClick={() => {
                                adminApproveAd(ad.id);
                                showToast('Annonce activée.');
                              }}
                              className="px-2.5 py-1.5 bg-eco-700 hover:bg-eco-800 text-white font-black text-[11px] rounded-xl"
                            >
                              ✓ Activer
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                adminRejectAd(ad.id, 'Suspendue par admin');
                                showToast('Annonce suspendue.');
                              }}
                              className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-[11px] rounded-xl"
                            >
                              Suspendre
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (window.confirm('Supprimer définitivement cette annonce ?')) {
                                deleteAd(ad.id);
                                showToast('Annonce supprimée.');
                              }
                            }}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-xl"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ONGLET 2 : UTILISATEURS & GESTION DE SESSION */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              {/* Carte Récapitulative de la Session Administrateur */}
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-eco-950 text-white rounded-2xl p-4 sm:p-5 border border-slate-700 shadow-md space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center justify-center font-black text-lg flex-shrink-0">
                      {user?.username?.charAt(0)?.toUpperCase() || user?.full_name?.charAt(0)?.toUpperCase() || 'A'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-sm sm:text-base text-white truncate">
                          {user?.full_name || user?.username || 'Administrateur'}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/30">
                          {isSuperAdmin ? 'Super Administrateur' : user?.roleName || 'Administrateur'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          ● Session en cours
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 truncate mt-0.5">
                        {user?.email || 'Compte local administrateur'} • Commune : {user?.commune || 'Abidjan'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <button
                      type="button"
                      onClick={handleSyncAll}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                      <span>Actualiser</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-xs font-bold text-red-200 transition flex items-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Déconnexion</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/10 text-[11px] text-slate-300">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Statut serveur :</span>
                    <strong className={isStrapiOnline ? 'text-emerald-300' : 'text-sky-300'}>
                      {isStrapiOnline ? 'Strapi v5 Connecté' : 'Mode Vitrine Autonome'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Droits :</span>
                    <strong className="text-amber-300">Accès Total (Admin)</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Validation annonces :</span>
                    <strong className="text-white">Immédiate</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Gestion tarifs :</span>
                    <strong className="text-white">Active</strong>
                  </div>
                </div>
              </div>

              {isOfflineNetwork && (
                <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 text-xs flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Mode autonome / aperçu sécurisé</p>
                    <p className="text-[11px] text-sky-800 mt-0.5">
                      Votre session Super Admin et les vendeurs du catalogue sont disponibles ci-dessous. Dès que Strapi est joignable, les modifications de permissions sont automatiquement répercutées dans la base de données.
                    </p>
                  </div>
                </div>
              )}

              {isPermission403 && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" /> Permission API requise sur Strapi (403)
                  </p>
                  <p>{usersError}</p>
                </div>
              )}

              <div className="bg-white rounded-2xl border border-creme-200 overflow-hidden shadow-xs">
                {loadingUsers ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    Chargement des utilisateurs...
                  </div>
                ) : displayedUsers.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    Aucun utilisateur disponible pour le moment.
                  </div>
                ) : (
                  <>
                    {/* Vue Cartes Mobile */}
                    <div className="sm:hidden divide-y divide-slate-100">
                      {displayedUsers.map((u) => (
                        <div key={u.id} className="p-3.5 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-extrabold text-xs text-slate-900 truncate">
                                {u.full_name || u.username}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate">{u.email}</p>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded font-bold text-[10px] whitespace-nowrap ${
                                u.isCurrentSession
                                  ? 'bg-amber-100 text-amber-800'
                                  : u.blocked
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {u.blocked ? 'Bloqué' : u.roleName || 'Actif'}
                            </span>
                          </div>
                          {!u.isPreview && (
                            <div className="flex items-center justify-between gap-2 pt-1">
                              {strapiRoles.length > 0 && (
                                <select
                                  value={
                                    strapiRoles.find(
                                      (r) => r.name === u.roleName || r.type === u.roleType
                                    )?.id || ''
                                  }
                                  onChange={(e) => handleRoleChange(u, e.target.value)}
                                  className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold flex-1"
                                >
                                  {strapiRoles.map((r) => (
                                    <option key={r.id} value={r.id}>
                                      {r.name}
                                    </option>
                                  ))}
                                </select>
                              )}
                              <button
                                onClick={() => toggleUserBlock(u)}
                                className={`px-3 py-1.5 rounded-lg font-bold text-[11px] ${
                                  u.blocked
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {u.blocked ? 'Débloquer' : 'Bloquer'}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Vue Tableau Desktop */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full min-w-[600px] text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-creme-200">
                          <tr>
                            <th className="p-3.5">Compte</th>
                            <th className="p-3.5">Contact / E-mail</th>
                            <th className="p-3.5">Rôle</th>
                            <th className="p-3.5">Statut</th>
                            <th className="p-3.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {displayedUsers.map((u) => (
                            <tr key={u.id}>
                              <td className="p-3.5 font-bold text-slate-900">
                                {u.username || u.full_name}
                                <div className="text-[10px] text-slate-400 font-normal">
                                  {u.isPreview ? 'Aperçu session' : `ID: ${u.id}`}
                                </div>
                              </td>
                              <td className="p-3.5 text-slate-600">{u.email}</td>
                              <td className="p-3.5">
                                {!u.isPreview && strapiRoles.length > 0 ? (
                                  <select
                                    value={
                                      strapiRoles.find(
                                        (r) => r.name === u.roleName || r.type === u.roleType
                                      )?.id || ''
                                    }
                                    onChange={(e) => handleRoleChange(u, e.target.value)}
                                    className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                                  >
                                    {strapiRoles.map((r) => (
                                      <option key={r.id} value={r.id}>
                                        {r.name}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span
                                    className={`px-2 py-0.5 rounded font-bold ${
                                      u.isCurrentSession
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-eco-50 text-eco-800'
                                    }`}
                                  >
                                    {u.roleName}
                                  </span>
                                )}
                              </td>
                              <td className="p-3.5">
                                {u.blocked ? (
                                  <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded font-bold">
                                    Bloqué
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">
                                    Actif
                                  </span>
                                )}
                              </td>
                              <td className="p-3.5 text-right">
                                {u.isPreview ? (
                                  <span className="text-[11px] text-slate-400 font-semibold">
                                    {u.isCurrentSession ? 'Session active' : 'Aperçu local'}
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => toggleUserBlock(u)}
                                    className={`px-3 py-1.5 rounded-lg font-bold text-xs ${
                                      u.blocked
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-red-100 text-red-700'
                                    }`}
                                  >
                                    {u.blocked ? 'Débloquer' : 'Bloquer'}
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ONGLET 3 : GESTION DES CATÉGORIES */}
          {activeTab === 'categories' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-creme-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <form
                  onSubmit={handleCreateCategory}
                  className="flex flex-wrap sm:flex-nowrap items-center gap-2 flex-1"
                >
                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="Nouvelle catégorie (ex: Électroménager)..."
                    className="flex-1 min-w-[160px] p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-eco-600"
                  />
                  <select
                    value={newCatIcon}
                    onChange={(e) => setNewCatIcon(e.target.value)}
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
                  <Sparkles className="w-4 h-4" /> Synchroniser les 12 catégories
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {categories.map((c) => (
                  <div
                    key={c.id}
                    className="bg-white p-3.5 sm:p-4 rounded-2xl border border-creme-200 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-xs text-slate-900 truncate">{c.name}</h4>
                      <span className="text-[10px] text-slate-400 block truncate">
                        {ads.filter((a) => a.category === c.id).length} annonce(s){' '}
                        {c.documentId ? `• Strapi #${c.numericId}` : '• Locale'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">
                        Actif
                      </span>
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
            <div className="space-y-5">
              {paymentsError && isStrapiOnline && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                  <strong>Info Strapi Paiements :</strong> {paymentsError}
                </div>
              )}

              <div className="bg-white rounded-3xl p-4 sm:p-6 border border-creme-200 shadow-xs space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-black text-sm sm:text-base text-slate-900 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-eco-600" />
                      Recettes & Ventilation Mobile Money
                    </h3>
                    <p className="text-xs text-slate-400">
                      Suivi des transactions confirmées, frais de passerelle et remboursements.
                    </p>
                  </div>

                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    {[
                      { id: 'all', label: 'Tout' },
                      { id: 'daily', label: '24h' },
                      { id: 'weekly', label: '7 j' },
                      { id: 'monthly', label: '30 j' }
                    ].map((period) => (
                      <button
                        key={period.id}
                        onClick={() => setChartPeriod(period.id)}
                        className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition ${
                          chartPeriod === period.id
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-500'
                        }`}
                      >
                        {period.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
                  <div className="p-4 sm:p-5 rounded-2xl bg-creme-50 border border-creme-200 space-y-3">
                    <span className="text-xs font-black uppercase text-slate-400">
                      Recettes Encaissées
                    </span>
                    <div className="text-3xl sm:text-4xl font-black text-eco-900 whitespace-nowrap">
                      {periodTotalRevenue.toLocaleString('fr-FR')} FCFA
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-creme-200">
                      <div>
                        <span className="text-slate-400 block">Transactions confirmées :</span>
                        <span className="font-bold text-slate-900">{periodConfirmed.length}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Frais passerelle (~1.5%) :</span>
                        <span className="font-bold text-slate-900 whitespace-nowrap">
                          {periodFees.toLocaleString('fr-FR')} FCFA
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {chartData.map((item) => (
                      <div key={item.label} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-600">{item.label}</span>
                          <span className="text-slate-900 whitespace-nowrap">
                            {item.value.toLocaleString('fr-FR')} FCFA
                          </span>
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
                    Aucune transaction enregistrée pour le moment.
                  </div>
                ) : (
                  <>
                    {/* Mobile Cards */}
                    <div className="sm:hidden divide-y divide-slate-100">
                      {combinedPayments.map((p) => (
                        <div key={p.id || p.transaction_id} className="p-3.5 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono font-bold text-slate-800 truncate">
                              {p.transaction_id}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                p.status === 'confirmed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : p.status === 'refunded'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {p.status}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-600 font-semibold">
                              {p.user_name} • {p.plan_id || p.payment_type}
                            </span>
                            <span className="font-black text-slate-900 whitespace-nowrap">
                              {Number(p.amount).toLocaleString('fr-FR')} F
                            </span>
                          </div>
                          {p.status === 'confirmed' && (
                            <div className="pt-1 text-right">
                              <button
                                onClick={() => {
                                  const reason = window.prompt(
                                    'Motif du remboursement :',
                                    'Remboursement approuvé'
                                  );
                                  if (reason) adminRefundPayment(p.transaction_id, reason);
                                }}
                                className="px-2.5 py-1 text-[11px] font-bold text-red-700 bg-red-50 rounded-lg"
                              >
                                Rembourser
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden sm:block overflow-x-auto">
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
                          {combinedPayments.map((p) => (
                            <tr key={p.id || p.transaction_id}>
                              <td className="p-3.5 font-mono font-bold text-slate-800">
                                {p.transaction_id}
                              </td>
                              <td className="p-3.5 font-bold text-slate-900">{p.user_name}</td>
                              <td className="p-3.5">{p.plan_id || p.payment_type}</td>
                              <td className="p-3.5 uppercase font-bold text-eco-700">
                                {p.payment_provider}
                              </td>
                              <td className="p-3.5 font-black text-slate-900 whitespace-nowrap">
                                {Number(p.amount).toLocaleString('fr-FR')} F
                              </td>
                              <td className="p-3.5">
                                <span
                                  className={`px-2 py-0.5 rounded font-bold ${
                                    p.status === 'confirmed'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : p.status === 'refunded'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {p.status}
                                </span>
                              </td>
                              <td className="p-3.5 text-right">
                                {p.status === 'confirmed' && (
                                  <button
                                    onClick={() => {
                                      const reason = window.prompt(
                                        'Motif du remboursement :',
                                        'Remboursement approuvé'
                                      );
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
                  </>
                )}
              </div>
            </div>
          )}

          {/* ONGLET 5 : TARIFS & QUOTAS */}
          {activeTab === 'pricing' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plans.map((plan) => {
                  const isEditing = editingPlanId === plan.id;
                  return (
                    <div
                      key={plan.id}
                      className="bg-white p-5 rounded-3xl border border-creme-200 shadow-xs space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase bg-eco-50 text-eco-800 px-2 py-0.5 rounded">
                          {plan.name}
                        </span>
                        {!isEditing ? (
                          <button
                            onClick={() => startEditPlan(plan)}
                            className="text-slate-500 hover:text-eco-700"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => saveEditPlan(plan.id)}
                            className="px-2 py-1 bg-eco-700 text-white text-xs font-bold rounded-lg flex items-center gap-1"
                          >
                            <Save className="w-3 h-3" /> Enregistrer
                          </button>
                        )}
                      </div>
                      {isEditing ? (
                        <div className="space-y-2 text-xs">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400">
                              Prix (FCFA/mois)
                            </label>
                            <input
                              type="number"
                              value={editPlanPrice}
                              onChange={(e) => setEditPlanPrice(e.target.value)}
                              className="w-full p-2 border rounded-xl font-bold"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400">
                              Quota Annonces Actives
                            </label>
                            <input
                              type="number"
                              value={editPlanLimit}
                              onChange={(e) => setEditPlanLimit(e.target.value)}
                              className="w-full p-2 border rounded-xl font-bold"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400">
                              Crédits de Boost Mensuels
                            </label>
                            <input
                              type="number"
                              value={editPlanCredits}
                              onChange={(e) => setEditPlanCredits(e.target.value)}
                              className="w-full p-2 border rounded-xl font-bold"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 text-xs text-slate-700">
                          <div className="flex justify-between py-1 border-b border-slate-100">
                            <span className="text-slate-400">Prix mensuel :</span>
                            <span className="font-extrabold text-slate-900 whitespace-nowrap">
                              {Number(plan.price_fcfa).toLocaleString('fr-FR')} FCFA
                            </span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-100">
                            <span className="text-slate-400">Annonces actives max :</span>
                            <span className="font-black text-eco-800">{plan.active_ads_limit}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-100">
                            <span className="text-slate-400">Crédits boost / mois :</span>
                            <span className="font-black text-warm-700">
                              {plan.monthly_boost_credits || 0}
                            </span>
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
                  {boostPackages.map((pkg) => {
                    const isEditing = editingBoostId === pkg.id;
                    return (
                      <div
                        key={pkg.id}
                        className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                      >
                        <div>
                          <p className="font-black text-xs text-slate-900">{pkg.name}</p>
                          <span className="text-[10px] text-slate-400">{pkg.duration_hours}h</span>
                        </div>
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={editBoostPrice}
                              onChange={(e) => setEditBoostPrice(e.target.value)}
                              className="w-20 p-1 text-xs font-bold border rounded"
                            />
                            <button
                              onClick={() => saveEditBoost(pkg.id)}
                              className="px-2 py-1 bg-eco-700 text-white rounded text-[10px] font-bold"
                            >
                              OK
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-black text-xs text-warm-700 whitespace-nowrap">
                              {Number(pkg.price_fcfa).toLocaleString('fr-FR')} FCFA
                            </span>
                            <button
                              onClick={() => startEditBoost(pkg)}
                              className="text-slate-400 hover:text-slate-700"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
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
                  Aucun boost actif. Utilisez le bouton « Booster » dans l&apos;onglet Annonces pour
                  mettre une annonce en avant.
                </div>
              ) : (
                activeBoostedAds.map((ad) => (
                  <div
                    key={ad.id}
                    className="bg-white p-3.5 sm:p-4 rounded-2xl border border-warm-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={ad.images?.[0] || FALLBACK_ADMIN_IMAGE}
                        alt={ad.title}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = FALLBACK_ADMIN_IMAGE;
                        }}
                        className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-slate-900 truncate">{ad.title}</h4>
                        <span className="text-[10px] text-slate-400">{ad.commune}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-2">
                      <span className="text-[10px] font-black text-warm-700 bg-warm-50 px-2.5 py-1 rounded-lg border border-warm-200 whitespace-nowrap">
                        Expire le{' '}
                        {ad.boost_expires_at
                          ? new Date(ad.boost_expires_at).toLocaleDateString('fr-FR')
                          : '-'}
                      </span>
                      <button
                        onClick={() => {
                          adminToggleBoostAd(ad.id);
                          showToast('Boost retiré.');
                        }}
                        className="px-2.5 py-1 text-[11px] font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg"
                      >
                        Retirer
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ONGLET 7 : SIGNALEMENTS */}
          {activeTab === 'reports' && (
            <div className="space-y-3">
              {reports.length === 0 ? (
                <div className="bg-white p-8 text-center rounded-2xl border border-creme-200 text-xs text-slate-500">
                  Aucun signalement en attente.
                </div>
              ) : (
                reports.map((rep) => (
                  <div
                    key={rep.id}
                    className="bg-white p-4 rounded-2xl border border-amber-200 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-black text-red-700 bg-red-50 px-2 py-0.5 rounded">
                        {rep.reason}
                      </span>
                      <p className="text-xs text-slate-700 mt-1 italic">&quot;{rep.details}&quot;</p>
                    </div>
                    <button
                      onClick={() => {
                        adminResolveReport(rep.id);
                        showToast('Signalement classé.');
                      }}
                      className="px-3 py-1.5 bg-eco-700 text-white font-bold text-xs rounded-xl whitespace-nowrap"
                    >
                      ✓ Classer
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ONGLET 8 : JOURNAUX */}
          {activeTab === 'audit' && (
            <div className="bg-white rounded-2xl border border-creme-200 overflow-hidden shadow-xs">
              {adminLogs.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Aucune opération journalisée pour l&apos;instant.
                </div>
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
                      {adminLogs.map((log) => (
                        <tr key={log.id}>
                          <td className="p-3 text-slate-400">
                            {new Date(log.created_at).toLocaleString('fr-FR')}
                          </td>
                          <td className="p-3 font-bold text-slate-800">{log.actor_name}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 bg-slate-100 rounded font-mono font-bold text-[10px]">
                              {log.action}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-[11px] text-slate-600">
                            {log.target_type} ({log.target_id})
                          </td>
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
