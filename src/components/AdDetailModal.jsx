import React, { useState } from 'react';
import { 
  X, 
  Heart, 
  Share2, 
  Flag, 
  MessageCircle, 
  Phone, 
  MapPin, 
  Tag, 
  ShieldAlert, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  Check,
  ShieldCheck
} from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import { useAuth } from '../context/AuthContext';
import { CONDITIONS } from '../data/categories';

export default function AdDetailModal({ ad, onClose, onOpenBoost }) {
  if (!ad) return null;

  const { favorites, categories, toggleFavorite, reportAd, markAsSold, markAsGiven, deleteAd, adminApproveAd, adminRejectAd } = useMarketplace();
  const { user, isAdmin } = useAuth();
  
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Arnaque ou tentative de fraude');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);

  const isFavorite = favorites.includes(ad.id);
  const isOwner = user && ad.sellerId === user.id;
  const categoryObj = categories.find(c => c.id === ad.category);
  const conditionObj = CONDITIONS.find(c => c.id === ad.condition);

  const images = ad.images && ad.images.length > 0 ? ad.images : [
    "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80"
  ];

  const formattedPrice = ad.type === 'don' 
    ? 'Gratuit (Don solidaire)' 
    : `${Number(ad.price).toLocaleString('fr-FR')} FCFA`;

  const handleShare = async () => {
    const shareData = {
      title: `${ad.title} sur Seconde Vie`,
      text: `Regardez cette annonce : ${ad.title} (${formattedPrice}) sur Seconde Vie Côte d'Ivoire.`,
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // Ignorer annulation
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2500);
    }
  };

  const handleSendReport = (e) => {
    e.preventDefault();
    reportAd(ad.id, reportReason, reportDetails);
    setReportSuccess(true);
    setTimeout(() => {
      setReportModalOpen(false);
      setReportSuccess(false);
    }, 2000);
  };

  const cleanPhone = (ad.contactWhatsapp || ad.contactPhone || '').replace(/\D/g, '');
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Bonjour ${ad.contactName || ''}, je vous contacte depuis Seconde Vie concernant votre annonce "${ad.title}" affichée à ${formattedPrice}. Est-elle toujours disponible ?`)}`;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-6 bg-slate-900/70 backdrop-blur-sm overflow-y-auto"
    >
      
      {/* Toast de copie */}
      {copiedToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-xl flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4 text-emerald-400" /> Lien de l'annonce copié !
        </div>
      )}

      <div className="relative w-full h-full sm:h-auto max-w-4xl bg-white rounded-none sm:rounded-3xl shadow-2xl border-0 sm:border border-creme-200 overflow-hidden my-auto sm:max-h-[92vh] flex flex-col">
        
        {/* Header de la modale */}
        <div className="flex items-center justify-between gap-2 p-3 sm:p-4 sm:px-6 border-b border-creme-200 bg-creme-50/50">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-wrap">
            <span className="text-xs font-bold text-eco-800 bg-eco-100/70 px-2.5 py-1 rounded-md truncate max-w-[140px] sm:max-w-none">
              Réf : {ad.id}
            </span>
            {ad.status === 'pending' && (
              <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-md">
                ⏳ En attente de validation modérateur
              </span>
            )}
            {ad.status === 'sold' && (
              <span className="text-xs font-bold text-slate-700 bg-slate-200 px-2.5 py-1 rounded-md">
                ✓ Vendu
              </span>
            )}
            {ad.status === 'given' && (
              <span className="text-xs font-bold text-eco-800 bg-eco-200 px-2.5 py-1 rounded-md">
                ✓ Donné
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleFavorite(ad.id)}
              className="p-2 rounded-xl hover:bg-white text-slate-600 hover:text-red-500 transition"
              title="Ajouter aux favoris"
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
            </button>
            <button
              onClick={handleShare}
              className="p-2 rounded-xl hover:bg-white text-slate-600 hover:text-eco-700 transition"
              title="Partager l'annonce"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setReportModalOpen(true)}
              className="p-2 rounded-xl hover:bg-white text-slate-500 hover:text-amber-600 transition"
              title="Signaler l'annonce"
            >
              <Flag className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corps de la modale */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Colonne Galerie d'images */}
            <div className="md:col-span-7 space-y-3">
              {/* Image principale avec boutons de navigation si multiple */}
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 border border-creme-200">
                <img
                  src={images[activeImageIndex]}
                  alt={ad.title}
                  className="w-full h-full object-cover"
                />

                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs transition"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setActiveImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs transition"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                {/* Badge Don ou Prix sur l'image */}
                <div className="absolute top-3 left-3">
                  <span className={`px-3 py-1.5 rounded-xl font-extrabold text-sm shadow-md ${
                    ad.type === 'don' ? 'bg-warm-500 text-white' : 'bg-slate-900/80 backdrop-blur-md text-white'
                  }`}>
                    {formattedPrice}
                  </span>
                </div>
              </div>

              {/* Miniatures */}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative w-20 h-16 rounded-xl overflow-hidden border-2 flex-shrink-0 transition ${
                        activeImageIndex === idx ? 'border-eco-600 ring-2 ring-eco-500/30' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt={`vue ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Colonne Informations et Contact */}
            <div className="md:col-span-5 flex flex-col justify-between space-y-4">
              
              <div className="space-y-4">
                {/* Catégorie & Localisation */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-bold text-eco-800 bg-eco-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Tag className="w-3 h-3 text-eco-600 flex-shrink-0" />
                    {categoryObj?.name || 'Divers'}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-medium text-slate-700">
                    <MapPin className="w-3.5 h-3.5 text-warm-500 flex-shrink-0" />
                    {ad.commune} ({ad.quartier})
                  </span>
                </div>

                {/* Titre */}
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                  {ad.title}
                </h1>

                {/* Prix grand format */}
                <div className="p-3.5 rounded-2xl bg-creme-50 border border-creme-200">
                  <span className="text-xs uppercase font-bold text-slate-400 block mb-0.5">
                    {ad.type === 'don' ? 'Article Solidaire' : 'Prix demandé'}
                  </span>
                  <span className={`text-2xl sm:text-3xl font-black ${
                    ad.type === 'don' ? 'text-warm-600' : 'text-eco-900'
                  }`}>
                    {formattedPrice}
                  </span>
                </div>

                {/* État de l'objet */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 font-semibold">État :</span>
                  <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                    {conditionObj?.label || 'Bon état'}
                  </span>
                </div>

                {/* Bloc Vendeur & Coordonnées */}
                <div className="p-4 rounded-2xl bg-white border border-creme-200 shadow-xs space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-slate-400 font-medium">Proposé par</p>
                      <p className="text-sm font-extrabold text-slate-900 truncate">{ad.contactName || "Vendeur Seconde Vie"}</p>
                    </div>
                    <span className="text-[11px] font-semibold text-eco-700 bg-eco-50 px-2 py-1 rounded-md border border-eco-200 flex-shrink-0">
                      ✓ Coordonnées vérifiées
                    </span>
                  </div>

                  {/* Boutons de Contact Direct */}
                  <div className="space-y-2 pt-1">
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md hover:shadow-lg transition active:scale-95 text-center"
                    >
                      <MessageCircle className="w-5 h-5 fill-white flex-shrink-0" />
                      <span className="break-words">Discuter sur WhatsApp ({ad.contactWhatsapp || ad.contactPhone})</span>
                    </a>

                    {ad.contactPhone && (
                      <a
                        href={`tel:${ad.contactPhone}`}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm rounded-xl transition"
                      >
                        <Phone className="w-4 h-4 text-slate-600" />
                        Appeler ({ad.contactPhone})
                      </a>
                    )}
                  </div>
                </div>

              </div>

              {/* Rassurance de sécurité en Côte d'Ivoire */}
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-[11px] space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-800">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                  Conseils de sécurité Seconde Vie :
                </div>
                <p>
                  • Privilégiez un rendez-vous dans un lieu public en journée (pharmacie, supermarché, carrefour animé).
                </p>
                <p>
                  • Ne faites aucun paiement d'avance par Wave ou Orange Money avant d'avoir vu et testé l'objet.
                </p>
              </div>

            </div>
          </div>

          {/* Description complète */}
          <div className="pt-4 border-t border-creme-200 space-y-2">
            <h3 className="font-extrabold text-slate-900 text-base">
              Description de l'article
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-creme-50/40 p-4 rounded-2xl border border-creme-200">
              {ad.description}
            </p>
          </div>

          {/* Actions réservées au Propriétaire */}
          {isOwner && (
            <div className="p-4 rounded-2xl bg-eco-50/80 border border-eco-200 space-y-3">
              <h4 className="font-extrabold text-eco-900 text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-eco-600" /> Gestion de votre annonce
              </h4>
              <div className="flex flex-wrap gap-2">
                {onOpenBoost && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenBoost(ad);
                    }}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-warm-500 to-warm-600 hover:from-warm-600 hover:to-warm-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
                  >
                    ⚡ Booster la visibilité (500 FCFA)
                  </button>
                )}
                {ad.status !== 'sold' && (
                  <button
                    onClick={() => {
                      markAsSold(ad.id);
                      onClose();
                    }}
                    className="px-3 py-1.5 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-black transition"
                  >
                    Marquer comme "Vendu"
                  </button>
                )}
                {ad.status !== 'given' && (
                  <button
                    onClick={() => {
                      markAsGiven(ad.id);
                      onClose();
                    }}
                    className="px-3 py-1.5 bg-eco-700 text-white font-bold text-xs rounded-xl hover:bg-eco-800 transition"
                  >
                    Marquer comme "Donné"
                  </button>
                )}
                <button
                  onClick={() => {
                    if (window.confirm("Êtes-vous sûr de vouloir supprimer définitivement cette annonce ?")) {
                      deleteAd(ad.id);
                      onClose();
                    }
                  }}
                  className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 font-bold text-xs rounded-xl transition flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Supprimer l'annonce
                </button>
              </div>
            </div>
          )}

          {/* Actions réservées à l'Administrateur */}
          {isAdmin && (
            <div className="p-4 rounded-2xl bg-warm-50 border border-warm-200 space-y-3">
              <h4 className="font-extrabold text-warm-900 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-warm-600" /> Panneau de Modération Rapide (Admin Seconde Vie)
              </h4>
              <div className="flex flex-wrap gap-2">
                {ad.status !== 'approved' && (
                  <button
                    onClick={() => {
                      adminApproveAd(ad.id);
                      onClose();
                    }}
                    className="px-3 py-1.5 bg-eco-700 hover:bg-eco-800 text-white font-bold text-xs rounded-xl shadow-xs transition"
                  >
                    ✓ Approuver & Publier l'annonce
                  </button>
                )}
                {ad.status !== 'rejected' && (
                  <button
                    onClick={() => {
                      const reason = window.prompt("Motif du rejet :", "Photos floues ou article non conforme");
                      if (reason) {
                        adminRejectAd(ad.id, reason);
                        onClose();
                      }
                    }}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition"
                  >
                    ✕ Refuser l'annonce
                  </button>
                )}
                <button
                  onClick={() => {
                    if (window.confirm("Supprimer immédiatement cette annonce de la base ?")) {
                      deleteAd(ad.id);
                      onClose();
                    }
                  }}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition"
                >
                  Supprimer
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Barre d'action fixe en bas sur mobile pour contacter le vendeur sans scroller */}
        <div className="md:hidden sticky bottom-0 bg-white/95 backdrop-blur-md border-t border-creme-200 p-3 flex items-center gap-2 z-30 pb-safe">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-3 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition active:scale-95"
          >
            <MessageCircle className="w-4 h-4 fill-white" />
            <span>WhatsApp Direct</span>
          </a>
          {ad.contactPhone && (
            <a
              href={`tel:${ad.contactPhone}`}
              className="flex items-center justify-center gap-1.5 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition"
            >
              <Phone className="w-4 h-4 text-slate-600" />
              <span>Appeler</span>
            </a>
          )}
        </div>

      </div>

      {/* Sous-modale de signalement */}
      {reportModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setReportModalOpen(false);
          }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60"
        >
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-creme-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Signaler cette annonce
              </h3>
              <button onClick={() => setReportModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {reportSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 text-center font-bold text-sm">
                ✓ Merci ! Votre signalement a été transmis à l'équipe de modération Seconde Vie.
              </div>
            ) : (
              <form onSubmit={handleSendReport} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Motif du signalement
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm font-medium text-slate-800"
                  >
                    <option value="Arnaque ou tentative de fraude">Arnaque ou tentative de fraude (demande d'argent à l'avance)</option>
                    <option value="Article interdit ou contrefait">Article interdit ou contrefait</option>
                    <option value="Article déjà vendu">Article déjà vendu ou indisponible</option>
                    <option value="Coordonnées incorrectes">Numéro de téléphone / WhatsApp injoignable</option>
                    <option value="Autre motif">Autre problème</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Précisions supplémentaires
                  </label>
                  <textarea
                    rows={3}
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Expliquez brièvement ce qui vous semble suspect..."
                    className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-800"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReportModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-extrabold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-sm"
                  >
                    Envoyer le signalement
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

