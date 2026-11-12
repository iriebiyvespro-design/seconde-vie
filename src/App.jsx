import React, { useState, useRef, useEffect } from 'react';
import Header from './components/Header';
import HeroBanner from './components/HeroBanner';
import CategoryGrid from './components/CategoryGrid';
import AdCard from './components/AdCard';
import AdDetailModal from './components/AdDetailModal';
import PublishModal from './components/PublishModal';
import AuthModal from './components/AuthModal';
import AdminDashboard from './components/AdminDashboard';
import UserProfile from './components/UserProfile';
import HowItWorks from './components/HowItWorks';
import SearchAndFilters from './components/SearchAndFilters';
import Footer from './components/Footer';
import PricingPlansModal from './components/PricingPlansModal';
import BoostAdModal from './components/BoostAdModal';
import MobileBottomNav from './components/MobileBottomNav';
import { useMarketplace } from './context/MarketplaceContext';
import { useAuth, checkIsAdminUser } from './context/AuthContext';
import { Sparkles, Gift, ArrowRight, AlertTriangle, RefreshCw, CheckCircle2, X } from 'lucide-react';

export default function App() {
  const {
    filteredAds,
    ads,
    categories,
    loadingAds,
    isDemoMode,
    setFilters,
    filters,
    verifyAndFinalizePayment
  } = useMarketplace();
  const { user, isAdmin } = useAuth();

  // États des modales
  const [selectedAd, setSelectedAd] = useState(null);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState('login');
  const [authNotice, setAuthNotice] = useState(null);
  const [resetCodeParam, setResetCodeParam] = useState('');
  const [pendingPublishAfterAuth, setPendingPublishAfterAuth] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileInitialTab, setProfileInitialTab] = useState('my-ads');
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const [boostAdTarget, setBoostAdTarget] = useState(null);
  const [paymentToast, setPaymentToast] = useState(null);

  const listingsRef = useRef(null);
  const donationsRef = useRef(null);

  // Fermer immédiatement l'espace admin lors de la déconnexion ou si l'utilisateur n'est pas administrateur
  useEffect(() => {
    if (!isAdmin) {
      setAdminModalOpen(false);
    }
  }, [isAdmin]);

  // Gérer les paramètres d'URL (?code=... Strapi reset password & ?payment_ref=... retour Moneroo)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      setResetCodeParam(code);
      setAuthDefaultTab('reset');
      setAuthNotice(null);
      setAuthModalOpen(true);
    }

    const paymentRef = params.get('payment_ref');
    const monerooPaymentId = params.get('paymentId');
    if (paymentRef) {
      verifyAndFinalizePayment({ reference: paymentRef, monerooPaymentId }).then((res) => {
        if (res.verified && res.status === 'success') {
          setPaymentToast({
            type: 'success',
            message: `Paiement confirmé (${res.transaction_id}) : ${res.label || 'votre service'} est activé !`
          });
        } else if (res.status === 'failed') {
          setPaymentToast({
            type: 'error',
            message: `Le paiement (${paymentRef}) a échoué ou été annulé. Aucun service n'a été activé.`
          });
        } else {
          setPaymentToast({
            type: 'pending',
            message: `Paiement (${paymentRef}) en attente de confirmation par Moneroo.`
          });
        }
        params.delete('payment_ref');
        params.delete('paymentId');
        params.delete('paymentStatus');
        const nextQuery = params.toString();
        const cleanUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}`;
        window.history.replaceState({}, '', cleanUrl);
      });
    }
  }, []);

  const scrollToListings = () => {
    if (listingsRef.current) {
      listingsRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToDonations = () => {
    // Activer le filtre don
    setFilters(prev => ({ ...prev, type: 'don' }));
    if (listingsRef.current) {
      listingsRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const openAuthModal = ({ tab = 'login', notice = null, pendingPublish = false } = {}) => {
    setAuthDefaultTab(tab);
    setAuthNotice(notice);
    setPendingPublishAfterAuth(pendingPublish);
    setAuthModalOpen(true);
  };

  const handleOpenPublish = () => {
    if (!user) {
      openAuthModal({
        tab: 'signup',
        notice: 'Vous devez créer un compte gratuit pour publier une annonce sur Seconde Vie.',
        pendingPublish: true,
      });
      return;
    }
    setPublishModalOpen(true);
  };

  const handleOpenProfile = (tab = 'my-ads') => {
    if (!user) {
      openAuthModal({ tab: 'login', notice: null, pendingPublish: false });
    } else {
      setProfileInitialTab(tab);
      setProfileModalOpen(true);
    }
  };

  // Annonces de dons gratuits pour la section dédiée
  const freeDonationsList = ads.filter(a => a.type === 'don' && a.status === 'approved');

  // Annonces en vedette
  const featuredAdsList = ads.filter(a => a.isFeatured && a.status === 'approved');

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip flex flex-col bg-creme-50/40 text-slate-900 font-sans selection:bg-eco-200">
      
      {paymentToast && (
        <div
          className={`fixed bottom-20 md:bottom-6 right-4 left-4 sm:left-auto sm:max-w-md z-50 p-3.5 rounded-2xl shadow-xl border flex items-center justify-between gap-3 text-xs font-bold ${
            paymentToast.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : paymentToast.type === 'error'
                ? 'bg-red-600 text-white border-red-500'
                : 'bg-amber-50 text-amber-900 border-amber-300'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {paymentToast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{paymentToast.message}</span>
          </div>
          <button type="button" onClick={() => setPaymentToast(null)} className="p-1 rounded-lg hover:bg-black/10 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Header Officiel */}
      <Header
        onOpenPublish={handleOpenPublish}
        onOpenAuth={() => openAuthModal({ tab: 'login', notice: null, pendingPublish: false })}
        onOpenAdmin={() => { if (isAdmin) setAdminModalOpen(true); }}
        onOpenProfile={handleOpenProfile}
        onNavigateHome={() => {
          setFilters({
            search: '',
            category: 'all',
            type: 'all',
            condition: 'all',
            commune: 'all',
            minPrice: '',
            maxPrice: '',
            sortBy: 'recent'
          });
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onNavigateDonations={scrollToDonations}
        onNavigateHowItWorks={() => {
          const el = document.getElementById('comment-ca-marche');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
        onOpenFavorites={() => handleOpenProfile('favorites')}
        onOpenPricing={() => setPricingModalOpen(true)}
      />

      {/* Bandeau discret lorsque Strapi local n'est pas joignable (Mode vitrine / Cloud) */}
      {isDemoMode && (
        <div className="w-full bg-creme-100/90 border-b border-creme-300/70 py-1.5 px-3 text-center text-[11px] font-medium text-slate-600">
          Mode aperçu en ligne — Les annonces affichées sont des exemples de démonstration
        </div>
      )}

      {/* 2. Hero Banner avec Slogan & Recherche Principale */}
      <HeroBanner
        onOpenPublish={handleOpenPublish}
        onFilterApply={scrollToListings}
      />

      {/* 3. Grille des 12 Catégories Officielles */}
      <CategoryGrid onSelectCategory={scrollToListings} />

      {/* 4. Section spéciale « Les Objets Gratuits (Dons solidaires) » */}
      {freeDonationsList.length > 0 && filters.type !== 'vente' && (
        <section ref={donationsRef} className="py-8 sm:py-12 bg-gradient-to-r from-warm-50 via-creme-50 to-eco-50/50 border-b border-creme-200 overflow-x-hidden">
          <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 min-w-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-5 sm:mb-8 gap-3">
              <div>
                <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-black uppercase tracking-wider text-warm-700 bg-warm-100/80 px-3 py-1 rounded-full border border-warm-200">
                  <Gift className="w-3.5 h-3.5 text-warm-600" />
                  Espace Solidaire • 100% Gratuit
                </span>
                <h2 className="text-xl sm:text-3xl font-black text-slate-900 mt-2">
                  Les Objets Gratuits du moment
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  Des membres généreux à Abidjan offrent ces articles sans contrepartie financière.
                </p>
              </div>

              <button
                onClick={() => {
                  setFilters(prev => ({ ...prev, type: 'don' }));
                  scrollToListings();
                }}
                className="text-xs font-bold text-warm-700 hover:text-warm-800 flex items-center gap-1 bg-white px-3.5 py-2 rounded-xl border border-warm-200 shadow-xs hover:shadow-sm transition"
              >
                <span>Voir tous les dons ({freeDonationsList.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Carrousel horizontal fluide sur mobile, grille 2/3/4 colonnes sur tablette & desktop */}
            <div className="flex overflow-x-auto gap-3 pb-2 snap-x no-scrollbar sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:gap-5 sm:overflow-visible">
              {freeDonationsList.slice(0, 4).map((ad) => (
                <div key={ad.id} className="min-w-[200px] w-[58%] sm:w-auto sm:min-w-0 snap-start flex-shrink-0">
                  <AdCard ad={ad} onSelectAd={setSelectedAd} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 5. Flux Principal des Annonces avec Barre de Recherche & Filtres Multicritères */}
      <section ref={listingsRef} className="py-8 sm:py-12 flex-1 overflow-x-hidden">
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 min-w-0">
          
          <div className="mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900">
              {filters.type === 'don' 
                ? "Tous les dons d'objets gratuits" 
                : filters.category !== 'all' 
                  ? `Annonces : ${categories.find(c => c.id === filters.category)?.name || filters.category}` 
                  : "Toutes les annonces récentes à Abidjan"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {isDemoMode
                ? "Explorez une sélection d'annonces d'occasion et de dons solidaires à Abidjan."
                : "Trouvez ce dont vous avez besoin parmi les annonces disponibles à Abidjan et en Côte d'Ivoire."}
            </p>
          </div>

          {/* Composant de Filtres & Tri */}
          <SearchAndFilters totalResults={filteredAds.length} />

          {/* Statuts : Chargement / Vide / Grille */}
          {loadingAds ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-5">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div key={idx} className="bg-white rounded-2xl sm:rounded-3xl p-3 border border-creme-200 animate-pulse space-y-3">
                  <div className="aspect-[4/3] w-full bg-slate-200 rounded-xl" />
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                  <div className="h-4 bg-slate-200 rounded w-5/6" />
                  <div className="h-5 bg-slate-200 rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : filteredAds.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-creme-200 shadow-sm max-w-lg mx-auto space-y-4">
              <div className="w-16 h-16 bg-creme-100 text-warm-600 rounded-2xl flex items-center justify-center mx-auto">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">
                Aucune annonce publiée pour le moment
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Aucune annonce ne correspond à vos critères de recherche actuels. Réinitialisez vos filtres ou publiez la première annonce !
              </p>
              <div className="pt-2 flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => setFilters({
                    search: '',
                    category: 'all',
                    type: 'all',
                    condition: 'all',
                    commune: 'all',
                    minPrice: '',
                    maxPrice: '',
                    sortBy: 'recent'
                  })}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition"
                >
                  Réinitialiser les filtres
                </button>
                <button
                  onClick={handleOpenPublish}
                  className="px-5 py-2.5 bg-warm-600 hover:bg-warm-700 text-white font-bold text-xs rounded-xl shadow-md transition"
                >
                  + Déposer une annonce
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-5">
              {filteredAds.map((ad) => (
                <AdCard key={ad.id} ad={ad} onSelectAd={setSelectedAd} />
              ))}
            </div>
          )}

        </div>
      </section>

      {/* 6. Section « Comment ça marche » */}
      <HowItWorks onOpenPublish={handleOpenPublish} />

      {/* 7. Footer Complet */}
      <Footer
        onSelectCategory={(catId) => {
          setFilters(prev => ({ ...prev, category: catId }));
          scrollToListings();
        }}
        onOpenPublish={handleOpenPublish}
        onNavigateDonations={scrollToDonations}
      />

      {/* Barre de navigation mobile fixe façon application native */}
      <MobileBottomNav
        onNavigateHome={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        onNavigateDonations={scrollToDonations}
        onOpenPublish={handleOpenPublish}
        onOpenFavorites={() => handleOpenProfile('favorites')}
        onOpenProfile={handleOpenProfile}
        onOpenAdmin={() => { if (isAdmin) setAdminModalOpen(true); }}
      />

      {/* Modales Principales (z-40) */}
      {publishModalOpen && (
        <PublishModal
          onClose={() => setPublishModalOpen(false)}
          onOpenPricing={() => setPricingModalOpen(true)}
          onSuccess={() => {}}
        />
      )}

      {pricingModalOpen && (
        <PricingPlansModal
          onClose={() => setPricingModalOpen(false)}
          onOpenAuth={() => openAuthModal({ tab: 'login', notice: null, pendingPublish: false })}
        />
      )}

      {authModalOpen && (
        <AuthModal
          defaultTab={authDefaultTab}
          notice={authNotice}
          initialResetCode={resetCodeParam}
          onResetComplete={() => {
            const params = new URLSearchParams(window.location.search);
            if (params.has('code')) {
              params.delete('code');
              const q = params.toString();
              window.history.replaceState({}, '', `${window.location.pathname}${q ? `?${q}` : ''}`);
            }
            setResetCodeParam('');
          }}
          onClose={() => {
            setAuthModalOpen(false);
            setAuthNotice(null);
            setPendingPublishAfterAuth(false);
          }}
          onSuccess={(loggedUser) => {
            if (pendingPublishAfterAuth) {
              setPendingPublishAfterAuth(false);
              setAuthNotice(null);
              setPublishModalOpen(true);
            } else if (checkIsAdminUser(loggedUser)) {
              setAdminModalOpen(true);
            }
          }}
        />
      )}

      {adminModalOpen && isAdmin && (
        <AdminDashboard
          onClose={() => setAdminModalOpen(false)}
          onSelectAd={(ad) => {
            setSelectedAd(ad);
          }}
        />
      )}

      {profileModalOpen && (
        <UserProfile
          initialTab={profileInitialTab}
          onClose={() => setProfileModalOpen(false)}
          onOpenPublish={() => {
            setProfileModalOpen(false);
            setPublishModalOpen(true);
          }}
          onOpenPricing={() => setPricingModalOpen(true)}
          onOpenBoost={(adToBoost) => setBoostAdTarget(adToBoost)}
          onOpenAdmin={() => {
            setProfileModalOpen(false);
            if (isAdmin) setAdminModalOpen(true);
          }}
          onSelectAd={(ad) => {
            setSelectedAd(ad);
          }}
        />
      )}

      {/* Modales Secondaires / Aperçu au premier plan (z-50) */}
      {boostAdTarget && (
        <BoostAdModal
          ad={boostAdTarget}
          onClose={() => setBoostAdTarget(null)}
        />
      )}

      {selectedAd && (
        <AdDetailModal
          ad={selectedAd}
          onClose={() => setSelectedAd(null)}
          onOpenBoost={(adToBoost) => setBoostAdTarget(adToBoost)}
        />
      )}

    </div>
  );
}

