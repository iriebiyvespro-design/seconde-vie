import React from 'react';
import { Heart, MapPin, Tag, MessageCircle, Sparkles, Zap } from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import { CONDITIONS } from '../data/categories';

export default function AdCard({ ad, onSelectAd }) {
  const { favorites, toggleFavorite, categories } = useMarketplace();
  const isFavorite = favorites.includes(ad.id);

  const categoryObj = categories.find(c => c.id === ad.category);
  const conditionObj = CONDITIONS.find(c => c.id === ad.condition);

  const formattedPrice = ad.type === 'don' 
    ? 'DON GRATUIT' 
    : `${Number(ad.price).toLocaleString('fr-FR')} F`;

  const fullFormattedPrice = ad.type === 'don'
    ? 'Gratuit (Don)'
    : `${Number(ad.price).toLocaleString('fr-FR')} FCFA`;

  const handleQuickWhatsapp = (e) => {
    e.stopPropagation();
    const cleanPhone = (ad.contactWhatsapp || ad.contactPhone || '').replace(/\D/g, '');
    const message = encodeURIComponent(`Bonjour, je vous contacte depuis Seconde Vie concernant votre annonce : "${ad.title}" (${fullFormattedPrice}). Est-elle toujours disponible ?`);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    toggleFavorite(ad.id);
  };

  const isBoosted = ad.is_boosted || (ad.boost_expires_at && new Date(ad.boost_expires_at) > new Date());

  return (
    <div 
      onClick={() => onSelectAd(ad)}
      className={`group bg-white rounded-2xl sm:rounded-3xl overflow-hidden border transition-all duration-300 cursor-pointer flex flex-col justify-between h-full ${
        isBoosted
          ? 'border-warm-500/80 shadow-md hover:shadow-2xl ring-2 ring-warm-400/20'
          : 'border-creme-200/90 hover:border-eco-300 hover:shadow-xl'
      }`}
    >
      <div>
        {/* Image & Badges */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
          <img
            src={ad.images?.[0] || "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80"}
            alt={ad.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            loading="lazy"
          />

          {/* Badge Sponsorisé */}
          {isBoosted && (
            <div className="absolute top-2 left-2 z-10">
              <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-gradient-to-r from-warm-500 to-warm-600 text-white font-black text-[9px] sm:text-[10px] rounded-md sm:rounded-lg shadow-md flex items-center gap-1 uppercase tracking-wider">
                <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-white" /> Sponsorisé
              </span>
            </div>
          )}

          {/* Statuts */}
          {ad.status === 'sold' && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-20">
              <span className="px-3 py-1 bg-white text-slate-900 font-extrabold text-xs sm:text-sm rounded-xl uppercase shadow-lg">
                Vendu
              </span>
            </div>
          )}
          {ad.status === 'given' && (
            <div className="absolute inset-0 bg-eco-900/60 backdrop-blur-xs flex items-center justify-center z-20">
              <span className="px-3 py-1 bg-white text-eco-900 font-extrabold text-xs sm:text-sm rounded-xl uppercase shadow-lg">
                Donné
              </span>
            </div>
          )}
          {ad.status === 'pending' && (
            <div className="absolute top-2 left-2 z-10">
              <span className="px-2 py-0.5 bg-amber-500 text-white font-bold text-[9px] sm:text-[11px] rounded-md shadow-sm">
                ⏳ Modération
              </span>
            </div>
          )}

          {/* Badge Don Gratuit */}
          {ad.type === 'don' && ad.status === 'approved' && !isBoosted && (
            <div className="absolute top-2 left-2 z-10">
              <span className="px-2 py-0.5 sm:px-3 sm:py-1 bg-warm-500 text-white font-extrabold text-[10px] sm:text-xs rounded-lg sm:rounded-xl shadow-md flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Don Gratuit
              </span>
            </div>
          )}

          {/* Favori */}
          <button
            type="button"
            onClick={handleFavoriteClick}
            className="absolute top-2 right-2 z-10 p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-white/90 backdrop-blur-md hover:bg-white text-slate-700 hover:text-red-500 shadow-sm transition active:scale-90"
            aria-label="Ajouter aux favoris"
          >
            <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
          </button>

          {/* État */}
          <div className="absolute bottom-2 left-2 z-10">
            <span className="px-1.5 sm:px-2 py-0.5 bg-black/60 backdrop-blur-md text-white font-medium text-[9px] sm:text-[10px] rounded">
              {conditionObj?.label.split('(')[0] || 'Bon état'}
            </span>
          </div>
        </div>

        {/* Détails */}
        <div className="p-2.5 sm:p-4">
          <div className="flex items-center justify-between text-[10px] sm:text-xs text-slate-500 mb-1">
            <span className="font-semibold text-eco-800 flex items-center gap-1 truncate max-w-[55%]">
              <Tag className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-eco-600 flex-shrink-0" />
              <span className="truncate">{categoryObj?.name || 'Divers'}</span>
            </span>
            <span className="flex items-center gap-0.5 text-slate-500 truncate max-w-[45%]">
              <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-warm-500 flex-shrink-0" />
              <span className="truncate">{ad.commune}</span>
            </span>
          </div>

          <h3 className="font-bold text-slate-900 text-xs sm:text-base line-clamp-2 min-h-[32px] sm:min-h-[44px] group-hover:text-eco-800 transition-colors leading-snug mb-1 sm:mb-2">
            {ad.title}
          </h3>

          <p className="text-[10px] sm:text-xs text-slate-400 line-clamp-1">
            {ad.quartier || 'Abidjan'}
          </p>
        </div>
      </div>

      {/* Footer carte : Prix + WhatsApp adapté aux 2 colonnes mobiles */}
      <div className="px-2.5 pb-2.5 pt-2 sm:px-4 sm:pb-4 border-t border-creme-100 flex items-center justify-between gap-1.5">
        <div className="flex flex-col min-w-0">
          <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400">
            {ad.type === 'don' ? 'Offert' : 'Prix'}
          </span>
          <span className={`text-xs sm:text-base lg:text-lg font-extrabold leading-none truncate ${
            ad.type === 'don' ? 'text-warm-600' : 'text-eco-900'
          }`}>
            <span className="sm:hidden">{formattedPrice}</span>
            <span className="hidden sm:inline">{fullFormattedPrice}</span>
          </span>
        </div>

        <button
          type="button"
          onClick={handleQuickWhatsapp}
          className="flex items-center justify-center gap-1 px-2 py-1.5 sm:px-3 sm:py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[10px] sm:text-xs rounded-lg sm:rounded-xl border border-emerald-200 transition active:scale-95 flex-shrink-0"
          title="Contacter sur WhatsApp"
        >
          <MessageCircle className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
          <span className="hidden sm:inline">WhatsApp</span>
        </button>
      </div>
    </div>
  );
}
