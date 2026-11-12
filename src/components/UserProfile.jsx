import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Package,
  Heart,
  MapPin,
  Phone,
  Mail,
  Trash2,
  CheckCircle,
  BadgeCheck,
  Eye,
  X,
  PlusCircle,
  Save,
  Clock,
  Crown,
  Zap,
  ShieldCheck,
  Camera,
  Loader2,
  LogOut,
  ArrowRight,
  MessageCircle,
  Settings,
  BarChart3,
  Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useMarketplace } from '../context/MarketplaceContext';
import { COMMUNES_ABIDJAN } from '../data/communes';
import AdCard from './AdCard';

// Extraire la partie locale d'un numéro ivoirien (sans le préfixe +225)
function stripIvorianPrefix(rawPhone = '') {
  const trimmed = String(rawPhone || '').trim();
  if (!trimmed) return '';
  return trimmed.replace(/^\+?225\s*/, '').trim();
}

export default function UserProfile({
  initialTab = 'my-ads',
  onClose,
  onOpenPublish,
  onSelectAd,
  onOpenPricing,
  onOpenBoost,
  onOpenAdmin
}) {
  const { user, isAdmin, isSuperAdmin, updateProfile, logout } = useAuth();
  const {
    ads,
    favorites,
    plans,
    stats,
    getUserRemainingCredits,
    markAsSold,
    markAsGiven,
    relistAd,
    deleteAd
  } = useMarketplace();

  const currentPlanId = user?.subscription_plan_id || 'gratuit';
  const currentPlan = plans.find(p => p.id === currentPlanId) || plans[0];
  const remainingCredits = getUserRemainingCredits();

  // Annonces et statistiques rapides du membre
  const myAds = ads.filter(
    ad => ad.sellerId === user?.id || (user?.email && user?.full_name && ad.contactName === user.full_name)
  );
  const activeCount = myAds.filter(a => ['approved', 'pending'].includes(a.status)).length;
  const givenDonationsCount = myAds.filter(a => a.status === 'given').length;
  const favoriteAds = ads.filter(ad => favorites.includes(ad.id));

  const [activeTab, setActiveTab] = useState(initialTab); // 'my-ads', 'favorites', 'profile', 'super-admin'
  const avatarInputRef = useRef(null);

  // États du formulaire Paramètres du profil
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(
    user?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
  );
  const [localPhone, setLocalPhone] = useState(stripIvorianPrefix(user?.phone));
  const [localWhatsapp, setLocalWhatsapp] = useState(stripIvorianPrefix(user?.whatsapp || user?.phone));
  const [sameAsPhone, setSameAsPhone] = useState(() => {
    const p = stripIvorianPrefix(user?.phone);
    const w = stripIvorianPrefix(user?.whatsapp);
    return !w || p === w;
  });
  const [commune, setCommune] = useState(user?.commune || 'Cocody');
  const [quartier, setQuartier] = useState(user?.quartier || '');

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Synchroniser le numéro WhatsApp si l'option "Identique au numéro de téléphone" est activée
  useEffect(() => {
    if (sameAsPhone) {
      setLocalWhatsapp(localPhone);
    }
  }, [sameAsPhone, localPhone]);

  const selectedCommuneObj = COMMUNES_ABIDJAN.find(c => c.name === commune);
  const suggestedQuartiers = selectedCommuneObj?.quartiers || [];

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const nextAvatar = reader.result;
      setAvatarUrl(nextAvatar);
      await updateProfile({ avatar_url: nextAvatar });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    };
    reader.readAsDataURL(file);
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    const formattedPhone = localPhone ? `+225 ${localPhone}` : '';
    const formattedWhatsapp = sameAsPhone
      ? formattedPhone
      : localWhatsapp
        ? `+225 ${localWhatsapp}`
        : formattedPhone;

    try {
      await new Promise(resolve => setTimeout(resolve, 350));
      await updateProfile({
        full_name: fullName.trim() || user?.username || 'Membre Seconde Vie',
        phone: formattedPhone,
        whatsapp: formattedWhatsapp,
        commune,
        quartier: quartier.trim(),
        avatar_url: avatarUrl
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } finally {
      setIsSaving(false);
    }
  };

  const displayLocation = `${quartier ? `${quartier}, ` : ''}${commune || 'Cocody'}, Abidjan`;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-0 sm:p-4 md:p-6 bg-slate-900/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full h-full sm:h-auto max-w-5xl bg-gray-50 rounded-none sm:rounded-3xl shadow-2xl border-0 sm:border border-gray-200 overflow-hidden my-auto sm:max-h-[92vh] flex flex-col">
        
        {/* Toast de confirmation verte lors de la sauvegarde */}
        {saveSuccess && (
          <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-xl border border-emerald-500 flex items-center gap-2.5 text-xs sm:text-sm font-bold animate-fade-in">
            <CheckCircle className="w-4 h-4 text-white flex-shrink-0" />
            <span>Profil mis à jour avec succès !</span>
          </div>
        )}

        {/* 1. En-tête Premium du Profil */}
        <div className="p-4 sm:px-8 sm:py-6 border-b border-gray-200 bg-white">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            
            {/* Identité & Avatar */}
            <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 min-w-0">
              <div className="relative flex-shrink-0">
                <img
                  src={avatarUrl}
                  alt={fullName || user?.full_name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-2 ring-eco-600/20 shadow-sm bg-gray-100"
                />
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  title="Changer la photo de profil"
                  aria-label="Changer la photo de profil"
                  className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-xl bg-white hover:bg-eco-50 text-slate-700 hover:text-eco-700 border border-gray-200 shadow-sm flex items-center justify-center transition"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-2xl font-black text-slate-900 leading-tight truncate max-w-full">
                    {fullName || user?.full_name || 'Membre Seconde Vie'}
                  </h2>

                  {isSuperAdmin ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-gradient-to-r from-amber-50 to-warm-50 text-amber-800 border border-amber-300 shadow-2xs">
                      <Crown className="w-3.5 h-3.5 text-amber-600" />
                      Super Admin
                    </span>
                  ) : isAdmin ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                      Administrateur
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Membre vérifié
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                    <MapPin className="w-3.5 h-3.5 text-warm-500 flex-shrink-0" />
                    {displayLocation}
                  </span>
                  {user?.email && (
                    <span className="inline-flex items-center gap-1 truncate max-w-full">
                      <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Bouton fermer sur mobile tout en haut à droite */}
              <button
                type="button"
                onClick={onClose}
                className="lg:hidden p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-slate-700 transition flex-shrink-0"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Carte de Statistiques Rapides + Actions à droite */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-shrink-0">
              <div className="grid grid-cols-3 sm:flex sm:items-stretch divide-x divide-gray-200 bg-gray-50/80 border border-gray-200 rounded-xl shadow-2xs overflow-hidden">
                <div className="px-2.5 py-2 sm:px-3.5 text-center flex flex-col justify-center">
                  <p className="text-base sm:text-lg font-black text-slate-900 leading-none">{activeCount}</p>
                  <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500 mt-1 leading-tight sm:whitespace-nowrap">
                    Annonces actives
                  </p>
                </div>
                <div className="px-2.5 py-2 sm:px-3.5 text-center flex flex-col justify-center">
                  <p className="text-base sm:text-lg font-black text-eco-700 leading-none">{givenDonationsCount}</p>
                  <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500 mt-1 leading-tight sm:whitespace-nowrap">
                    Dons effectués
                  </p>
                </div>
                <div className="px-2.5 py-2 sm:px-3.5 text-center flex flex-col justify-center">
                  <p className="text-base sm:text-lg font-black text-warm-600 leading-none">{favoriteAds.length}</p>
                  <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500 mt-1 leading-tight sm:whitespace-nowrap">
                    Favoris
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onOpenPublish}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-warm-500 to-warm-600 hover:from-warm-600 hover:to-warm-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition whitespace-nowrap"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Publier</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    onClose();
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 rounded-xl transition whitespace-nowrap"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Déconnexion</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="hidden lg:flex p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-slate-700 transition"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* 2. Barre d'Onglets Moderne (défilement horizontal fluide sur mobile) */}
        <div className="flex items-center gap-1 sm:gap-2 border-b border-gray-200 px-3 sm:px-8 bg-white overflow-x-auto no-scrollbar flex-shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('my-ads')}
            className={`py-3.5 px-3.5 sm:px-4 text-xs sm:text-sm font-extrabold border-b-2 flex items-center gap-2 transition whitespace-nowrap flex-shrink-0 ${
              activeTab === 'my-ads'
                ? 'border-eco-700 text-eco-900 bg-eco-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-gray-50'
            }`}
          >
            <Package className="w-4 h-4 flex-shrink-0" />
            <span>Mes Annonces ({myAds.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('favorites')}
            className={`py-3.5 px-3.5 sm:px-4 text-xs sm:text-sm font-extrabold border-b-2 flex items-center gap-2 transition whitespace-nowrap flex-shrink-0 ${
              activeTab === 'favorites'
                ? 'border-eco-700 text-eco-900 bg-eco-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-gray-50'
            }`}
          >
            <Heart className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span>Mes Favoris ({favoriteAds.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`py-3.5 px-3.5 sm:px-4 text-xs sm:text-sm font-extrabold border-b-2 flex items-center gap-2 transition whitespace-nowrap flex-shrink-0 ${
              activeTab === 'profile'
                ? 'border-eco-700 text-eco-900 bg-eco-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-gray-50'
            }`}
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            <span>Paramètres du profil</span>
          </button>

          {(isSuperAdmin || isAdmin) && (
            <button
              type="button"
              onClick={() => setActiveTab('super-admin')}
              className={`py-3.5 px-3.5 sm:px-4 text-xs sm:text-sm font-extrabold border-b-2 flex items-center gap-2 transition whitespace-nowrap flex-shrink-0 ${
                activeTab === 'super-admin'
                  ? 'border-amber-600 text-amber-900 bg-amber-50/60'
                  : 'border-transparent text-amber-700 hover:text-amber-900 hover:bg-amber-50/40'
              }`}
            >
              <Crown className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>Espace Super Admin</span>
            </button>
          )}
        </div>

        {/* 3. Contenu de l'onglet actif */}
        <div className="p-4 sm:p-6 md:p-8 overflow-y-auto flex-1 bg-gray-50/80">
          
          {/* ONGLET 1 : MES ANNONCES */}
          {activeTab === 'my-ads' && (
            <div className="space-y-4">
              {/* Bannière Formule & Quotas d'utilisation */}
              <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black uppercase bg-eco-50 text-eco-900 px-2.5 py-1 rounded-lg border border-eco-200 flex items-center gap-1.5">
                      <Crown className="w-3.5 h-3.5 text-warm-600" />
                      Formule {currentPlan.name}
                    </span>
                    {remainingCredits > 0 && (
                      <span className="text-xs font-bold bg-warm-50 text-warm-800 px-2.5 py-1 rounded-lg border border-warm-200">
                        ⚡ {remainingCredits} crédit(s) boost restant(s)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 pt-0.5">
                    Annonces actives utilisées : <strong>{activeCount} / {currentPlan.active_ads_limit}</strong> (les articles vendus ou donnés libèrent votre quota)
                  </p>
                </div>

                {onOpenPricing && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenPricing();
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 bg-warm-600 hover:bg-warm-700 text-white font-bold text-xs rounded-xl shadow-xs transition whitespace-nowrap"
                  >
                    {currentPlanId === 'business' ? 'Gérer mon abonnement' : 'Augmenter mon quota →'}
                  </button>
                )}
              </div>

              {myAds.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center border border-gray-200 shadow-sm space-y-3">
                  <div className="w-14 h-14 bg-eco-50 text-eco-700 rounded-2xl flex items-center justify-center mx-auto border border-eco-100">
                    <Package className="w-7 h-7" />
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-lg">
                    Vous n'avez pas encore publié d'annonce
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                    Vendez vos objets inutilisés en FCFA ou donnez-les gratuitement pour aider un voisin à Abidjan.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenPublish();
                    }}
                    className="mt-2 px-5 py-2.5 bg-warm-600 hover:bg-warm-700 text-white font-extrabold text-xs rounded-xl shadow-md transition"
                  >
                    + Publier ma première annonce
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3.5">
                  {myAds.map((ad) => (
                    <div
                      key={ad.id}
                      className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3.5 flex-1 min-w-0">
                        <img
                          src={ad.images?.[0]}
                          alt={ad.title}
                          className="w-16 h-16 rounded-xl object-cover border border-gray-200 flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            {ad.status === 'pending' && (
                              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <Clock className="w-3 h-3" /> En attente de validation
                              </span>
                            )}
                            {ad.status === 'approved' && (
                              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                                ✓ En ligne
                              </span>
                            )}
                            {ad.status === 'sold' && (
                              <span className="text-[10px] font-bold bg-slate-200 text-slate-800 px-2 py-0.5 rounded-md">
                                ✓ Vendu
                              </span>
                            )}
                            {ad.status === 'given' && (
                              <span className="text-[10px] font-bold bg-eco-200 text-eco-900 px-2 py-0.5 rounded-md">
                                ✓ Donné
                              </span>
                            )}
                            <span className="text-xs text-slate-400">• {ad.commune}</span>
                          </div>

                          <h4 className="font-extrabold text-slate-900 text-sm truncate">
                            {ad.title}
                          </h4>

                          <p className="text-xs font-bold text-eco-900 mt-1">
                            {ad.type === 'don' ? 'Don Gratuit (0 FCFA)' : `${Number(ad.price).toLocaleString('fr-FR')} FCFA`}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2.5 sm:pt-0 border-gray-100">
                        {onOpenBoost && ad.status === 'approved' && !ad.is_boosted && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onOpenBoost(ad);
                            }}
                            className="px-2.5 py-1.5 bg-warm-500 hover:bg-warm-600 text-white font-bold text-xs rounded-xl transition flex items-center gap-1"
                          >
                            <Zap className="w-3.5 h-3.5" /> Booster
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onSelectAd(ad)}
                          className="p-2 text-slate-600 hover:text-eco-800 hover:bg-gray-100 rounded-xl transition"
                          title="Voir l'annonce"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {ad.status !== 'sold' && ad.type === 'vente' && (
                          <button
                            type="button"
                            onClick={() => markAsSold(ad.id)}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl transition"
                          >
                            Marquer "Vendu"
                          </button>
                        )}

                        {ad.status !== 'given' && (
                          <button
                            type="button"
                            onClick={() => markAsGiven(ad.id)}
                            className="px-3 py-1.5 bg-eco-700 hover:bg-eco-800 text-white font-bold text-xs rounded-xl transition"
                          >
                            Marquer "Donné"
                          </button>
                        )}

                        {(ad.status === 'sold' || ad.status === 'given') && (
                          <button
                            type="button"
                            onClick={() => relistAd(ad.id)}
                            className="px-3 py-1.5 bg-warm-600 hover:bg-warm-700 text-white font-bold text-xs rounded-xl transition"
                          >
                            Remettre en ligne
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Supprimer cette annonce ?')) {
                              deleteAd(ad.id);
                            }
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ONGLET 2 : MES FAVORIS */}
          {activeTab === 'favorites' && (
            <div>
              {favoriteAds.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center border border-gray-200 shadow-sm space-y-2">
                  <Heart className="w-12 h-12 text-slate-300 mx-auto" />
                  <p className="font-extrabold text-slate-900">Aucun favori pour le moment.</p>
                  <p className="text-xs text-slate-500">
                    Cliquez sur le cœur d'une annonce pour la sauvegarder ici.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {favoriteAds.map(ad => (
                    <AdCard key={ad.id} ad={ad} onSelectAd={onSelectAd} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ONGLET 3 : PARAMÈTRES DU PROFIL (Grille 2 colonnes structurée) */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSave} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
                
                {/* COLONNE GAUCHE : Informations personnelles + Localisation par défaut */}
                <div className="space-y-5">
                  
                  {/* Section 1 : Informations personnelles */}
                  <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 sm:p-6 space-y-4">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
                      <div className="w-8 h-8 rounded-lg bg-eco-50 text-eco-700 flex items-center justify-center">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                          Informations personnelles
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Identité affichée aux autres membres sur vos annonces.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Nom complet ou Pseudo
                        </label>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required
                          placeholder="ex: Kouassi Jean-Marc"
                          className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-gray-200 text-sm font-semibold text-slate-900 outline-none focus:border-eco-600 focus:ring-2 focus:ring-eco-500/15 transition"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-bold text-slate-700">
                            Adresse e-mail
                          </label>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <BadgeCheck className="w-3 h-3 text-emerald-600" />
                            Vérifié
                          </span>
                        </div>
                        <div className="relative flex items-center">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                          <input
                            type="email"
                            value={user?.email || ''}
                            readOnly
                            disabled
                            className="w-full pl-10 pr-3.5 py-2.5 bg-gray-100 rounded-xl border border-gray-200 text-sm font-medium text-slate-500 cursor-not-allowed"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 3 : Localisation par défaut */}
                  <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 sm:p-6 space-y-4">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
                      <div className="w-8 h-8 rounded-lg bg-warm-50 text-warm-600 flex items-center justify-center">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                          Localisation par défaut
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Zone utilisée automatiquement lors du dépôt de vos annonces à Abidjan.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Commune d'Abidjan
                        </label>
                        <select
                          value={commune}
                          onChange={(e) => setCommune(e.target.value)}
                          className="w-full px-3 py-2.5 bg-white rounded-xl border border-gray-200 text-sm font-semibold text-slate-800 outline-none focus:border-eco-600 focus:ring-2 focus:ring-eco-500/15 transition"
                        >
                          {COMMUNES_ABIDJAN.map(c => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Quartier
                        </label>
                        <input
                          type="text"
                          list="quartiers-suggestions"
                          value={quartier}
                          onChange={(e) => setQuartier(e.target.value)}
                          placeholder="ex: Angré, Riviera, Zone 4..."
                          className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-gray-200 text-sm font-semibold text-slate-900 outline-none focus:border-eco-600 focus:ring-2 focus:ring-eco-500/15 transition"
                        />
                        <datalist id="quartiers-suggestions">
                          {suggestedQuartiers.map(q => (
                            <option key={q} value={q} />
                          ))}
                        </datalist>
                      </div>
                    </div>
                  </div>

                </div>

                {/* COLONNE DROITE : Coordonnées de contact + Abonnement / Enregistrement */}
                <div className="space-y-5">
                  
                  {/* Section 2 : Coordonnées de contact */}
                  <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 sm:p-6 space-y-4">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                          Coordonnées de contact
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Numéros ivoiriens utilisés par les acheteurs et bénéficiaires de dons.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Numéro de téléphone (Côte d'Ivoire)
                        </label>
                        <div className="flex items-stretch rounded-xl border border-gray-200 overflow-hidden focus-within:border-eco-600 focus-within:ring-2 focus-within:ring-eco-500/15 transition bg-white">
                          <span className="inline-flex items-center gap-1.5 px-3 bg-gray-50 border-r border-gray-200 text-xs sm:text-sm font-extrabold text-slate-700 select-none flex-shrink-0">
                            <Phone className="w-3.5 h-3.5 text-eco-700" />
                            <span>+225</span>
                          </span>
                          <input
                            type="tel"
                            value={localPhone}
                            onChange={(e) => setLocalPhone(e.target.value)}
                            placeholder="07 00 00 00 00"
                            className="w-full px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                          <label className="block text-xs font-bold text-slate-700">
                            Numéro WhatsApp
                          </label>
                          <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-eco-800 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={sameAsPhone}
                              onChange={(e) => setSameAsPhone(e.target.checked)}
                              className="w-3.5 h-3.5 rounded accent-eco-700"
                            />
                            <span>Identique au numéro de téléphone</span>
                          </label>
                        </div>

                        <div className={`flex items-stretch rounded-xl border border-gray-200 overflow-hidden transition ${
                          sameAsPhone ? 'bg-gray-100' : 'bg-white focus-within:border-eco-600 focus-within:ring-2 focus-within:ring-eco-500/15'
                        }`}>
                          <span className="inline-flex items-center gap-1.5 px-3 bg-gray-50 border-r border-gray-200 text-xs sm:text-sm font-extrabold text-emerald-700 select-none flex-shrink-0">
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>+225</span>
                          </span>
                          <input
                            type="tel"
                            value={localWhatsapp}
                            onChange={(e) => setLocalWhatsapp(e.target.value)}
                            disabled={sameAsPhone}
                            placeholder="07 00 00 00 00"
                            className={`w-full px-3.5 py-2.5 text-sm font-semibold outline-none ${
                              sameAsPhone ? 'bg-gray-100 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-900'
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Encart Statut Formule & Validation */}
                  <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 sm:p-6 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Formule active
                        </p>
                        <p className="text-sm font-black text-slate-900 flex items-center gap-1.5 mt-0.5">
                          <Crown className="w-4 h-4 text-warm-500" />
                          Plan {currentPlan.name} ({currentPlan.price_fcfa.toLocaleString('fr-FR')} FCFA)
                        </p>
                      </div>
                      {onOpenPricing && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenPricing();
                          }}
                          className="text-xs font-extrabold text-warm-700 hover:text-warm-800 bg-warm-50 hover:bg-warm-100 px-3 py-1.5 rounded-lg border border-warm-200 transition"
                        >
                          Changer →
                        </button>
                      )}
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <span className="text-[11px] text-slate-500">
                        Les changements prennent effet immédiatement sur votre compte.
                      </span>

                      <button
                        type="submit"
                        disabled={isSaving}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-eco-700 hover:bg-eco-800 disabled:opacity-70 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition whitespace-nowrap"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Enregistrement...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            <span>Enregistrer les modifications</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            </form>
          )}

          {/* ONGLET 4 : ESPACE SUPER ADMIN (Strictement réservé à l'administrateur connecté) */}
          {activeTab === 'super-admin' && (isSuperAdmin || isAdmin) && (
            <div className="max-w-3xl mx-auto space-y-5">
              <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-eco-950 text-white rounded-2xl p-6 sm:p-8 shadow-lg border border-amber-500/30 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center flex-shrink-0">
                      <Crown className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 bg-amber-500/15 px-2.5 py-0.5 rounded-md border border-amber-400/30">
                        {isSuperAdmin ? 'Privilèges Super Admin Actifs' : 'Accès Administration'}
                      </span>
                      <h3 className="text-lg sm:text-xl font-black text-white mt-1">
                        Console d'Administration — Seconde Vie
                      </h3>
                      <p className="text-xs text-slate-300">
                        Compte authentifié : <strong>{user?.email}</strong>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Aperçu des KPIs de modération */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                    <p className="text-[11px] text-slate-300 font-semibold">Total annonces</p>
                    <p className="text-xl font-black text-white mt-0.5">{ads.length}</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                    <p className="text-[11px] text-amber-300 font-semibold">En attente</p>
                    <p className="text-xl font-black text-amber-300 mt-0.5">{stats.pendingAds}</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                    <p className="text-[11px] text-emerald-300 font-semibold">En ligne</p>
                    <p className="text-xl font-black text-emerald-300 mt-0.5">{stats.approvedAds}</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                    <p className="text-[11px] text-slate-300 font-semibold">Signalements</p>
                    <p className="text-xl font-black text-white mt-0.5">{stats.totalReports}</p>
                  </div>
                </div>

                {/* Boutons d'accès direct au tableau de bord complet */}
                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onOpenAdmin && onOpenAdmin()}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-500 to-warm-600 hover:from-amber-600 hover:to-warm-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg transition"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Ouvrir le Tableau de Bord Super Admin Complet</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => onOpenAdmin && onOpenAdmin()}
                  className="bg-white hover:border-eco-400 border border-gray-200 rounded-xl p-4 text-left shadow-sm transition group"
                >
                  <Package className="w-5 h-5 text-eco-700 mb-2" />
                  <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-eco-800">
                    Modération & Annonces
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Approuver, refuser ou supprimer les annonces de la communauté.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenAdmin && onOpenAdmin()}
                  className="bg-white hover:border-eco-400 border border-gray-200 rounded-xl p-4 text-left shadow-sm transition group"
                >
                  <Users className="w-5 h-5 text-warm-600 mb-2" />
                  <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-eco-800">
                    Utilisateurs & Rôles
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Gérer les comptes Strapi, privilèges et abonnements actifs.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenAdmin && onOpenAdmin()}
                  className="bg-white hover:border-eco-400 border border-gray-200 rounded-xl p-4 text-left shadow-sm transition group"
                >
                  <BarChart3 className="w-5 h-5 text-amber-600 mb-2" />
                  <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-eco-800">
                    Statistiques & Finances
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Suivre les revenus réels, boosts actifs et tarifs FCFA.
                  </p>
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
