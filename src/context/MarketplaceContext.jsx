import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CATEGORIES as FALLBACK_CATEGORIES } from '../data/categories';
import { INITIAL_ADS } from '../data/seedAds';
import { useAuth } from './AuthContext';
import {
  fetchActiveAds,
  fetchCategories,
  createAd,
  updateAdStrapi,
  deleteAdStrapi,
  createStrapiPayment,
  updateStrapiPaymentStatus,
  STRAPI_API_URL
} from '../services/strapi';
import { initializeMonerooCheckout, verifyMonerooTransaction } from '../services/payments';
import { notifyPaymentConfirmed, notifyAdStatusEvent } from '../services/notifications';

const MarketplaceContext = createContext();

const INITIAL_PLANS = [
  {
    id: 'gratuit',
    name: 'GRATUIT',
    price_fcfa: 0,
    duration_days: 30,
    active_ads_limit: 3,
    monthly_boost_credits: 0,
    badge_label: null,
    has_consultation_stats: false,
    has_advanced_stats: false,
    has_catalogue_management: false,
    description: 'Formule de base pour les particuliers.',
    features: [
      '3 annonces actives maximum',
      'Vente et don gratuit autorisés',
      'Photos et descriptions',
      'Gestion des annonces',
      'Favoris et contact vendeur'
    ]
  },
  {
    id: 'plus',
    name: 'PLUS',
    price_fcfa: 2000,
    duration_days: 30,
    active_ads_limit: 20,
    monthly_boost_credits: 2,
    badge_label: 'PLUS',
    has_consultation_stats: true,
    has_advanced_stats: false,
    has_catalogue_management: false,
    description: 'Idéal pour les vendeurs réguliers à Abidjan.',
    features: [
      '20 annonces actives maximum',
      '2 crédits de boost mensuels (non cumulables)',
      'Statistiques de consultation',
      'Badge PLUS officiel'
    ]
  },
  {
    id: 'business',
    name: 'BUSINESS',
    price_fcfa: 5000,
    duration_days: 30,
    active_ads_limit: 100,
    monthly_boost_credits: 5,
    badge_label: 'PROFESSIONNEL',
    has_consultation_stats: true,
    has_advanced_stats: true,
    has_catalogue_management: true,
    description: 'Conçu pour les boutiques, commerçants et professionnels.',
    features: [
      '100 annonces actives maximum',
      '5 crédits de boost mensuels (non cumulables)',
      'Statistiques avancées',
      'Badge professionnel vérifié',
      'Gestion de catalogue'
    ]
  }
];

const INITIAL_BOOST_PACKAGES = [
  { id: 'boost_24h', name: 'Boost 24 heures', duration_hours: 24, price_fcfa: 500, badge: 'Sponsorisé 24h' },
  { id: 'boost_7d', name: 'Boost 7 jours', duration_hours: 168, price_fcfa: 1500, badge: 'Sponsorisé 7j', popular: true },
  { id: 'boost_14d', name: 'Boost 14 jours', duration_hours: 336, price_fcfa: 2500, badge: 'Sponsorisé 14j' }
];

export const MarketplaceProvider = ({ children }) => {
  const { user, jwt, isAdmin, updateProfile } = useAuth();

  // Annonces chargées depuis Strapi v5 (avec bascule vitrine INITIAL_ADS si Strapi est hors ligne)
  const [ads, setAds] = useState([]);
  const [loadingAds, setLoadingAds] = useState(true);
  const [adsError, setAdsError] = useState(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Catégories chargées depuis Strapi v5 (avec fallback icônes/noms si API vide)
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categoriesError, setCategoriesError] = useState(null);

  // Favoris
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('sv_favorites');
    return saved ? JSON.parse(saved) : [];
  });

  // Signalements
  const [reports, setReports] = useState(() => {
    const saved = localStorage.getItem('sv_reports');
    return saved ? JSON.parse(saved) : [];
  });

  // Formules & Boosts
  const [plans, setPlans] = useState(() => {
    const saved = localStorage.getItem('sv_plans');
    return saved ? JSON.parse(saved) : INITIAL_PLANS;
  });

  const [boostPackages, setBoostPackages] = useState(() => {
    const saved = localStorage.getItem('sv_boost_packages');
    return saved ? JSON.parse(saved) : INITIAL_BOOST_PACKAGES;
  });

  const [subscriptionCredits, setSubscriptionCredits] = useState(() => {
    const saved = localStorage.getItem('sv_sub_credits');
    return saved ? JSON.parse(saved) : {};
  });

  // Paiements : vide par défaut (aucune donnée financière inventée)
  const [payments, setPayments] = useState(() => {
    const saved = localStorage.getItem('sv_payments');
    return saved ? JSON.parse(saved) : [];
  });

  const [adminLogs, setAdminLogs] = useState(() => {
    const saved = localStorage.getItem('sv_admin_logs');
    return saved ? JSON.parse(saved) : [];
  });

  const [platformSettings] = useState(() => {
    const saved = localStorage.getItem('sv_platform_settings');
    return saved ? JSON.parse(saved) : {
      cinetpayConfigured: false,
      cinetpayMode: 'sandbox',
      adRevenueFcfa: 0
    };
  });

  // Filtres actifs
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    type: 'all',
    condition: 'all',
    commune: 'all',
    minPrice: '',
    maxPrice: '',
    sortBy: 'recent'
  });

  // Persistance des préférences locales (favoris, plans, etc.)
  useEffect(() => { localStorage.setItem('sv_favorites', JSON.stringify(favorites)); }, [favorites]);
  useEffect(() => { localStorage.setItem('sv_reports', JSON.stringify(reports)); }, [reports]);
  useEffect(() => { localStorage.setItem('sv_plans', JSON.stringify(plans)); }, [plans]);
  useEffect(() => { localStorage.setItem('sv_boost_packages', JSON.stringify(boostPackages)); }, [boostPackages]);
  useEffect(() => { localStorage.setItem('sv_sub_credits', JSON.stringify(subscriptionCredits)); }, [subscriptionCredits]);
  useEffect(() => { localStorage.setItem('sv_payments', JSON.stringify(payments)); }, [payments]);
  useEffect(() => { localStorage.setItem('sv_admin_logs', JSON.stringify(adminLogs)); }, [adminLogs]);

  // Chargement des annonces depuis Strapi v5, avec repli silencieux en mode vitrine (Cloud / hors ligne)
  const loadStrapiData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoadingAds(true);
      setLoadingCategories(true);
    }
    setAdsError(null);
    setCategoriesError(null);

    try {
      const strapiAds = await fetchActiveAds();
      if (strapiAds && strapiAds.length > 0) {
        setAds(strapiAds);
        setIsDemoMode(false);
      } else {
        setAds(INITIAL_ADS);
        setIsDemoMode(false);
      }
    } catch (err) {
      if (!silent) {
        console.info(
          `Mode vitrine activé (Strapi indisponible sur ${STRAPI_API_URL}) :`,
          err.message || 'hors ligne'
        );
      }
      setAds(prev => (prev.length > 0 ? prev : INITIAL_ADS));
      setIsDemoMode(true);
      setAdsError(null);
    } finally {
      if (!silent) setLoadingAds(false);
    }

    try {
      const strapiCats = await fetchCategories();
      if (strapiCats && strapiCats.length > 0) {
        setCategories(strapiCats);
      } else {
        setCategories(FALLBACK_CATEGORIES);
      }
    } catch (err) {
      setCategoriesError(err.message);
      setCategories(FALLBACK_CATEGORIES);
    } finally {
      if (!silent) setLoadingCategories(false);
    }
  }, []);

  useEffect(() => {
    loadStrapiData();
  }, [loadStrapiData]);

  // Synchronisation automatique en temps réel au retour sur l'onglet ou toutes les 30s quand Strapi est connecté
  useEffect(() => {
    let lastSync = Date.now();
    const syncIfOnline = () => {
      if (isDemoMode) return;
      const nowTs = Date.now();
      if (nowTs - lastSync < 10000) return;
      lastSync = nowTs;
      loadStrapiData({ silent: true });
    };

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        syncIfOnline();
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    const interval = setInterval(syncIfOnline, 30000);

    return () => {
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      clearInterval(interval);
    };
  }, [isDemoMode, loadStrapiData]);

  const recordAdminLog = (action, targetType, targetId, oldValues, newValues) => {
    const entry = {
      id: `log-${Date.now()}`,
      actor_id: user?.id || 'system',
      actor_name: user?.full_name || 'Admin',
      action,
      target_type: targetType,
      target_id: targetId,
      old_values: oldValues,
      new_values: newValues,
      created_at: new Date().toISOString()
    };
    setAdminLogs(prev => [entry, ...prev]);
  };

  const updatePlan = (planId, updates) => {
    const oldPlan = plans.find(p => p.id === planId);
    setPlans(prev => prev.map(p => p.id === planId ? { ...p, ...updates, updated_at: new Date().toISOString() } : p));
    recordAdminLog('UPDATE_SUBSCRIPTION_PLAN', 'subscription_plans', planId, oldPlan, updates);
  };

  const updateBoostPackage = (pkgId, updates) => {
    const oldPkg = boostPackages.find(b => b.id === pkgId);
    setBoostPackages(prev => prev.map(b => b.id === pkgId ? { ...b, ...updates, updated_at: new Date().toISOString() } : b));
    recordAdminLog('UPDATE_BOOST_PACKAGE', 'boost_packages', pkgId, oldPkg, updates);
  };

  const getUserRemainingCredits = (userId = user?.id) => {
    if (!userId) return 0;
    const creditObj = subscriptionCredits[userId];
    if (!creditObj) return 0;
    if (new Date(creditObj.expires_at) <= new Date()) return 0;
    return Math.max(0, creditObj.total - creditObj.used);
  };

  // Publication réelle d'une annonce sur Strapi (POST /annonces) avec vérification de quota
  const publishAd = async (adData) => {
    const userPlanId = user?.subscription_plan_id || 'gratuit';
    const isSubExpired = user?.subscription_expires_at && new Date(user.subscription_expires_at) <= new Date();
    const effectivePlanId = isSubExpired ? 'gratuit' : userPlanId;
    const currentPlan = plans.find(p => p.id === effectivePlanId) || plans[0];
    const maxAllowed = currentPlan.active_ads_limit || 3;

    const currentActiveCount = ads.filter(
      a => a.sellerId === user?.id && ['approved', 'pending'].includes(a.status)
    ).length;

    if (user && currentActiveCount >= maxAllowed) {
      throw new Error(
        `Quota atteint : vous avez ${currentActiveCount} annonce(s) active(s) pour une limite de ${maxAllowed} (Formule ${currentPlan.name}). Passez à la formule PLUS ou BUSINESS.`
      );
    }

    const created = await createAd(adData, jwt);
    setAds(prev => [created, ...prev]);
    notifyAdStatusEvent({ ad: created, user, eventType: 'published' }).catch(() => {});
    return created;
  };

  const useBoostCreditOnAd = async (adId, boostPkgId = 'boost_7d') => {
    const remaining = getUserRemainingCredits();
    if (remaining <= 0) {
      throw new Error("Vous n'avez plus de crédits de boost mensuels disponibles.");
    }

    const pkg = boostPackages.find(b => b.id === boostPkgId) || boostPackages[1];
    const expiresAt = new Date(Date.now() + (pkg.duration_hours * 3600000)).toISOString();

    setSubscriptionCredits(prev => {
      const current = prev[user.id];
      return {
        ...prev,
        [user.id]: { ...current, used: current.used + 1 }
      };
    });

    await updateAd(adId, {
      is_boosted: true,
      boost_expires_at: expiresAt,
      boost_source: 'subscription_credit'
    });

    recordAdminLog('BOOST_WITH_CREDIT', 'listings', adId, null, { boostPkgId, expiresAt });
    return { success: true, expiresAt };
  };

  const activatePaidBenefit = async ({ payment_type, plan_id, boost_package_id, listing_id, ad_id }) => {
    const targetAdId = listing_id || ad_id;

    if (payment_type === 'subscription') {
      const plan = plans.find(p => p.id === plan_id);
      const targetRole = plan_id === 'business' ? 'business' : plan_id === 'plus' ? 'premium' : 'member';
      const expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();

      if (updateProfile) {
        await updateProfile({
          role: targetRole,
          subscription_plan_id: plan_id,
          subscription_expires_at: expiresAt
        });
      }

      if (user?.id && plan?.monthly_boost_credits > 0) {
        setSubscriptionCredits(prev => ({
          ...prev,
          [user.id]: {
            total: plan.monthly_boost_credits,
            used: 0,
            expires_at: expiresAt
          }
        }));
      }
      return plan ? `Formule ${plan.name} Seconde Vie` : 'Abonnement Seconde Vie';
    }

    if (payment_type === 'boost' && targetAdId) {
      const pkg = boostPackages.find(b => b.id === boost_package_id) || boostPackages[1];
      const expiresAt = new Date(Date.now() + (pkg.duration_hours * 3600000)).toISOString();

      await updateAd(targetAdId, {
        is_boosted: true,
        boost_expires_at: expiresAt,
        boost_source: 'paid_individual'
      });
      return pkg ? `${pkg.name} Seconde Vie` : 'Boost Visibilité Seconde Vie';
    }

    return 'Service Seconde Vie';
  };

  /**
   * Initialise un paiement réel (Strapi statut 'pending' + Moneroo XOF).
   * N'active JAMAIS l'abonnement ou le boost avant confirmation réelle (`success`).
   */
  const initiatePayment = async ({ payment_type, plan_id, boost_package_id, ad_id, channel }) => {
    let validatedAmount = 0;
    let description = '';

    if (payment_type === 'subscription') {
      const plan = plans.find(p => p.id === plan_id);
      if (!plan || Number(plan.price_fcfa) <= 0) throw new Error('Formule payante invalide.');
      validatedAmount = Number(plan.price_fcfa);
      description = `Formule ${plan.name} Seconde Vie`;
    } else if (payment_type === 'boost') {
      const pkg = boostPackages.find(b => b.id === boost_package_id);
      if (!pkg) throw new Error('Package de boost invalide.');
      validatedAmount = Number(pkg.price_fcfa);
      description = `${pkg.name} — Seconde Vie`;
    } else {
      throw new Error('Type de paiement invalide.');
    }

    const transactionId = `SV-MON-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const fee = Math.round(validatedAmount * 0.015);
    const typeAchatLabel = payment_type === 'subscription' ? `Abonnement ${plan_id}` : `Boost ${boost_package_id}`;

    // 1. Enregistrer d'abord la transaction dans Strapi avec le statut 'pending'
    let strapiDocId = null;
    try {
      const savedInStrapi = await createStrapiPayment(
        {
          reference: transactionId,
          montant: validatedAmount,
          passerelle: 'moneroo',
          statut: 'pending',
          type_achat: typeAchatLabel
        },
        jwt
      );
      strapiDocId = savedInStrapi?.documentId || null;
    } catch (err) {
      console.warn('Enregistrement Strapi POST /paiements (pending) impossible :', err.message);
    }

    const pendingPaymentRecord = {
      id: `pay-${Date.now()}`,
      documentId: strapiDocId,
      transaction_id: transactionId,
      user_id: user?.id || 'guest',
      user_name: user?.full_name || 'Client',
      amount: validatedAmount,
      currency: 'FCFA',
      payment_provider: 'moneroo',
      underlying_psp: `moneroo:${channel || 'WAVE_CI'}`,
      routing_rule: 'moneroo_checkout',
      payment_channel: channel || 'WAVE_CI',
      payment_type,
      plan_id: plan_id || null,
      boost_package_id: boost_package_id || null,
      listing_id: ad_id || null,
      status: 'pending',
      gateway_fee: fee,
      net_amount: validatedAmount - fee,
      created_at: new Date().toISOString(),
      confirmed_at: null
    };

    setPayments(prev => [pendingPaymentRecord, ...prev]);

    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
    const returnUrl = `${origin}/?payment_ref=${encodeURIComponent(transactionId)}`;

    // 2. Appeler l'API Moneroo (/v1/payments/initialize) ou backend sécurisé
    const monerooRes = await initializeMonerooCheckout({
      reference: transactionId,
      amountXof: validatedAmount,
      description,
      customerEmail: user?.email,
      customerName: user?.full_name,
      returnUrl,
      metadata: {
        payment_type,
        plan_id: plan_id || '',
        boost_package_id: boost_package_id || '',
        listing_id: ad_id || '',
        channel: channel || 'WAVE_CI',
        user_id: user?.id ? String(user.id) : 'guest',
        strapi_document_id: strapiDocId || ''
      }
    });

    // Conserver le contexte de paiement en attente pour vérification au retour de Moneroo
    localStorage.setItem(
      'sv_pending_payment',
      JSON.stringify({
        ...pendingPaymentRecord,
        description,
        moneroo_payment_id: monerooRes.moneroo_payment_id
      })
    );

    recordAdminLog('PAYMENT_INITIALIZED', 'payments', transactionId, null, {
      amount: validatedAmount,
      type: payment_type,
      status: 'pending',
      monerooConfigured: monerooRes.configured
    });

    if (monerooRes.checkout_url) {
      return {
        success: true,
        mode: 'redirect',
        checkout_url: monerooRes.checkout_url,
        moneroo_payment_id: monerooRes.moneroo_payment_id,
        transaction_id: transactionId,
        amount: validatedAmount,
        status: 'pending',
        description
      };
    }

    // Si la clé Moneroo n'est pas encore renseignée dans .env : rester en attente réaliste
    return {
      success: true,
      mode: 'awaiting_payment',
      checkout_url: null,
      transaction_id: transactionId,
      amount: validatedAmount,
      status: 'pending',
      channel: channel || 'WAVE_CI',
      description,
      strapiDocId
    };
  };

  /**
   * Vérifie le statut réel du paiement (Moneroo / Strapi) et n'active le service + notifications
   * QUE lorsque le statut est confirmé (`success`).
   */
  const verifyAndFinalizePayment = async ({ reference, monerooPaymentId = null }) => {
    let pendingMeta = null;
    try {
      const raw = localStorage.getItem('sv_pending_payment');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (!reference || parsed.transaction_id === reference) {
          pendingMeta = parsed;
        }
      }
    } catch {}

    const targetRef = reference || pendingMeta?.transaction_id;
    if (!targetRef) {
      return { verified: false, status: 'pending', message: 'Référence de transaction introuvable.' };
    }

    const existingLocal = payments.find(p => p.transaction_id === targetRef) || pendingMeta;
    if (existingLocal?.status === 'confirmed') {
      localStorage.removeItem('sv_pending_payment');
      return { verified: true, status: 'success', alreadyConfirmed: true, transaction_id: targetRef };
    }

    const checkResult = await verifyMonerooTransaction({
      reference: targetRef,
      monerooPaymentId: monerooPaymentId || pendingMeta?.moneroo_payment_id,
      jwt
    });

    if (checkResult.verified && checkResult.status === 'success') {
      const docIdToUpdate = existingLocal?.documentId || checkResult.documentId;
      if (docIdToUpdate && jwt) {
        try {
          await updateStrapiPaymentStatus(docIdToUpdate, 'successful', jwt);
        } catch (err) {
          console.warn('Mise à jour statut paiement Strapi impossible :', err.message);
        }
      }

      const confirmedRecord = {
        ...(existingLocal || { transaction_id: targetRef, amount: 0, payment_type: 'subscription' }),
        status: 'confirmed',
        confirmed_at: new Date().toISOString()
      };

      setPayments(prev =>
        prev.some(p => p.transaction_id === targetRef)
          ? prev.map(p => (p.transaction_id === targetRef ? confirmedRecord : p))
          : [confirmedRecord, ...prev]
      );

      const activatedLabel = await activatePaidBenefit(confirmedRecord);
      const notification = await notifyPaymentConfirmed({
        user,
        payment: confirmedRecord,
        label: activatedLabel
      });

      localStorage.removeItem('sv_pending_payment');
      recordAdminLog('PAYMENT_CONFIRMED', 'payments', targetRef, { status: 'pending' }, { status: 'confirmed' });

      return {
        verified: true,
        status: 'success',
        transaction_id: targetRef,
        label: activatedLabel,
        notification
      };
    }

    if (checkResult.status === 'failed') {
      const docIdToUpdate = existingLocal?.documentId || checkResult.documentId;
      if (docIdToUpdate && jwt) {
        updateStrapiPaymentStatus(docIdToUpdate, 'failed', jwt).catch(() => {});
      }
      setPayments(prev =>
        prev.map(p => (p.transaction_id === targetRef ? { ...p, status: 'failed' } : p))
      );
      localStorage.removeItem('sv_pending_payment');
      return { verified: false, status: 'failed', transaction_id: targetRef };
    }

    return {
      verified: false,
      status: 'pending',
      transaction_id: targetRef,
      message: 'Le paiement est toujours en attente de confirmation par Moneroo / opérateur Mobile Money.'
    };
  };

  const adminRefundPayment = (transactionId, reason = 'Remboursement approuvé') => {
    setPayments(prev => prev.map(p => {
      if (p.transaction_id === transactionId && p.status === 'confirmed') {
        if (p.payment_type === 'boost' && p.listing_id) {
          updateAd(p.listing_id, { is_boosted: false, boost_expires_at: null });
        }
        recordAdminLog('PAYMENT_REFUNDED', 'payments', transactionId, { status: 'confirmed' }, { status: 'refunded', reason });
        return { ...p, status: 'refunded', refund_reason: reason };
      }
      return p;
    }));
  };

  // Mise à jour synchronisée avec Strapi
  const updateAd = async (adId, updates) => {
    setAds(prev => prev.map(ad => ad.id === adId ? { ...ad, ...updates, updatedAt: new Date().toISOString() } : ad));
    try {
      await updateAdStrapi(adId, updates, jwt);
    } catch (err) {
      console.warn('Synchronisation Strapi PUT /annonces échouée :', err.message);
    }
  };

  // Suppression synchronisée avec Strapi
  const deleteAd = async (adId) => {
    setAds(prev => prev.filter(ad => ad.id !== adId));
    try {
      await deleteAdStrapi(adId, jwt);
    } catch (err) {
      console.warn('Synchronisation Strapi DELETE /annonces échouée :', err.message);
    }
  };

  const markAsSold = (adId) => updateAd(adId, { status: 'sold' });
  const markAsGiven = (adId) => updateAd(adId, { status: 'given' });
  const relistAd = (adId) => updateAd(adId, { status: 'approved' });

  const toggleFavorite = (adId) => {
    setFavorites(prev => {
      const exists = prev.includes(adId);
      return exists ? prev.filter(id => id !== adId) : [...prev, adId];
    });
  };

  const incrementViews = (adId) => {
    setAds(prev => prev.map(ad => ad.id === adId ? { ...ad, views: (ad.views || 0) + 1 } : ad));
  };

  const reportAd = (adId, reason, details) => {
    const newReport = {
      id: `rep-${Date.now()}`,
      adId,
      reason,
      details,
      status: 'pending',
      reporterId: user?.id || 'anonyme',
      createdAt: new Date().toISOString()
    };
    setReports(prev => [newReport, ...prev]);
    return true;
  };

  const adminApproveAd = (adId) => {
    const targetAd = ads.find(a => a.id === adId);
    updateAd(adId, { status: 'approved', rejectionReason: null });
    recordAdminLog('APPROVE_LISTING', 'listings', adId, null, { status: 'approved' });
    if (targetAd) {
      notifyAdStatusEvent({ ad: targetAd, user: null, eventType: 'approved' }).catch(() => {});
    }
  };

  const adminRejectAd = (adId, reason = 'Non conforme') => {
    updateAd(adId, { status: 'rejected', rejectionReason: reason });
    recordAdminLog('REJECT_LISTING', 'listings', adId, null, { status: 'rejected', reason });
  };

  const adminResolveReport = (reportId) => {
    setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'resolved' } : r));
    recordAdminLog('RESOLVE_REPORT', 'reports', reportId, null, { status: 'resolved' });
  };

  // Filtrage et tri des annonces normalisées
  const filteredAds = ads.filter(ad => {
    const isOwner = user && ad.sellerId === user.id;
    if (!isAdmin && !isOwner && !['approved', 'sold', 'given'].includes(ad.status)) {
      return false;
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (
        !ad.title?.toLowerCase().includes(q) &&
        !ad.description?.toLowerCase().includes(q) &&
        !ad.commune?.toLowerCase().includes(q) &&
        !ad.quartier?.toLowerCase().includes(q)
      ) return false;
    }

    if (filters.category !== 'all' && ad.category !== filters.category) return false;
    if (filters.type !== 'all' && ad.type !== filters.type) return false;
    if (filters.condition !== 'all' && ad.condition !== filters.condition) return false;
    if (filters.commune !== 'all' && !ad.commune.toLowerCase().includes(filters.commune.toLowerCase())) return false;
    if (filters.minPrice && ad.price < Number(filters.minPrice)) return false;
    if (filters.maxPrice && ad.price > Number(filters.maxPrice)) return false;

    return true;
  }).sort((a, b) => {
    const aBoosted = a.is_boosted && (!a.boost_expires_at || new Date(a.boost_expires_at) > new Date());
    const bBoosted = b.is_boosted && (!b.boost_expires_at || new Date(b.boost_expires_at) > new Date());
    if (aBoosted && !bBoosted) return -1;
    if (!aBoosted && bBoosted) return 1;

    if (filters.sortBy === 'price-asc') return a.price - b.price;
    if (filters.sortBy === 'price-desc') return b.price - a.price;
    if (filters.sortBy === 'popular') return (b.views || 0) - (a.views || 0);
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  // Calcul strict des recettes réelles
  const confirmedPayments = payments.filter(p => p.status === 'confirmed');
  const subscriptionRevenue = confirmedPayments.filter(p => p.payment_type === 'subscription').reduce((acc, p) => acc + Number(p.amount), 0);
  const boostRevenue = confirmedPayments.filter(p => p.payment_type === 'boost').reduce((acc, p) => acc + Number(p.amount), 0);
  const adRevenue = Number(platformSettings.adRevenueFcfa || 0);
  const totalRevenue = subscriptionRevenue + boostRevenue + adRevenue;

  const pendingRevenue = payments.filter(p => p.status === 'pending').reduce((acc, p) => acc + Number(p.amount), 0);
  const failedRevenue = payments.filter(p => p.status === 'failed').reduce((acc, p) => acc + Number(p.amount), 0);
  const totalRefunded = payments.filter(p => p.status === 'refunded').reduce((acc, p) => acc + Number(p.amount), 0);
  const totalFees = confirmedPayments.reduce((acc, p) => acc + (Number(p.gateway_fee) || 0), 0);
  const netRevenue = totalRevenue - totalFees - totalRefunded;

  const now = Date.now();
  const dayRevenue = confirmedPayments.filter(p => new Date(p.created_at).getTime() > now - 86400000).reduce((acc, p) => acc + Number(p.amount), 0);
  const weekRevenue = confirmedPayments.filter(p => new Date(p.created_at).getTime() > now - 7 * 86400000).reduce((acc, p) => acc + Number(p.amount), 0);
  const monthRevenue = confirmedPayments.filter(p => new Date(p.created_at).getTime() > now - 30 * 86400000).reduce((acc, p) => acc + Number(p.amount), 0);

  const stats = {
    totalAds: ads.length,
    approvedAds: ads.filter(a => a.status === 'approved').length,
    pendingAds: ads.filter(a => a.status === 'pending').length,
    soldAds: ads.filter(a => a.status === 'sold').length,
    givenAds: ads.filter(a => a.status === 'given').length,
    boostedAds: ads.filter(a => a.is_boosted).length,
    freeDonations: ads.filter(a => a.type === 'don').length,
    totalReports: reports.filter(r => r.status === 'pending').length,
    totalRevenue,
    subscriptionRevenue,
    boostRevenue,
    adRevenue,
    pendingRevenue,
    failedRevenue,
    totalRefunded,
    totalFees,
    netRevenue,
    dayRevenue,
    weekRevenue,
    monthRevenue
  };

  return (
    <MarketplaceContext.Provider value={{
      ads,
      filteredAds,
      categories,
      loadingAds,
      adsError,
      isDemoMode,
      loadingCategories,
      categoriesError,
      favorites,
      reports,
      filters,
      plans,
      boostPackages,
      payments,
      adminLogs,
      platformSettings,
      stats,
      setFilters,
      publishAd,
      updateAd,
      deleteAd,
      markAsSold,
      markAsGiven,
      relistAd,
      toggleFavorite,
      incrementViews,
      reportAd,
      adminApproveAd,
      adminRejectAd,
      adminResolveReport,
      initiatePayment,
      verifyAndFinalizePayment,
      useBoostCreditOnAd,
      getUserRemainingCredits,
      updatePlan,
      updateBoostPackage,
      adminRefundPayment,
      refreshData: loadStrapiData
    }}>
      {children}
    </MarketplaceContext.Provider>
  );
};

export const useMarketplace = () => useContext(MarketplaceContext);
