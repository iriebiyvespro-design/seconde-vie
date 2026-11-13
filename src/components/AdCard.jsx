import React from 'react';
import { Heart, MapPin, MessageCircle, Sparkles, Zap } from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import { CONDITIONS } from '../data/categories';
import { isAdBoostActive } from '../utils/adHelpers';

export default function AdCard({ ad, onSelectAd }) {
  const { favorites, toggleFavorite, categories } = useMarketplace();
  const isFavorite = favorites.includes(ad.id);

  const categoryObj = categories.find(c => c.id === ad.category);
  const conditionObj = CONDITIONS.find(c => c.id === ad.condition);

  const compactPrice = ad.type === 'don'
    ? 'Gratuit'
    : `${Number(ad.price).toLocaleString('fr-FR')} F`;

  const desktopPrice = ad.type === 'don'
    ? 'Don Gratuit'
    : `${Number(ad.price).toLocaleString('fr-FR')} F`;

  const fullFormattedPrice = ad.type === 'don'
    ? 'Gratuit (Don)'
    : `${Number(ad.price).toLocaleString('fr-FR')} FCFA`;

  const handleQuickWhatsapp = (e) => {
    e.stopPropagation();
    const cleanPhone = (ad.contactWhatsapp || ad.contactPhone || '').replace(/\D/g, '');
    const message = encodeURIComponent(
      `Bonjour, je vous contacte depuis Seconde Vie concernant votre annonce : "${ad.title}" (${fullFormattedPrice}). Est-elle toujours disponible ?`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    toggleFavorite(ad.id);
  };

  const isBoosted = isAdBoostActive(ad);

  return (
    <div
      onClick={() => onSelectAd(ad)}
      className={`group bg-white rounded-xl sm:rounded-2xl overflow-hidden border transition-all duration-200 cursor-pointer flex flex-col justify-between h-full min-w-0 ${
        isBoosted
          ? 'border-amber-400/90 shadow-sm hover:shadow-lg ring-1 ring-amber-400/30'
          : 'border-creme-200/90 hover:border-eco-300 hover:shadow-md'
      }`}
    >
      <div className="min-w-0">
        {/* Image fixe & compacte (style Jumia / Vinted) */}
        <div className="relative h-24 sm:h-28 lg:h-28 w-full overflow-hidden bg-slate-100">
          <img
            src={
              ad.images?.[0] ||
              'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80'
            }
            alt={ad.title}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src =
                'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80';
            }}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
            loading="lazy"
          />

          {/* Badges compacts en haut à gauche */}
          {isBoosted && (
            <div className="absolute top-1.5 left-1.5 z-10">
              <span className="px-1.5 py-0.5 bg-gradient-to-r from-amber-500 to-warm-600 text-white font-black text-[9px] sm:text-[10px] rounded shadow-xs inline-flex items-center gap-0.5 uppercase tracking-wide leading-none">
                <Zap className="w-2.5 h-2.5 fill-white" />
                <span className="hidden sm:inline">Sponsorisé</span>
                <span className="sm:hidden">Boost</span>
              </span>
            </div>
          )}

          {ad.type === 'don' && ad.status === 'approved' && !isBoosted && (
            <div className="absolute top-1.5 left-1.5 z-10">
              <span className="px-1.5 py-0.5 bg-warm-500 text-white font-extrabold text-[9px] sm:text-[10px] rounded shadow-xs inline-flex items-center gap-0.5 leading-none">
                <Sparkles className="w-2.5 h-2.5" />
                <span className="hidden sm:inline">Don Gratuit</span>
                <span className="sm:hidden">Don</span>
              </span>
            </div>
          )}

          {/* Statuts */}
          {ad.status === 'sold' && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-20">
              <span className="px-2 py-0.5 bg-white text-slate-900 font-extrabold text-[10px] sm:text-xs rounded-lg uppercase shadow-sm">
                Vendu
              </span>
            </div>
          )}
          {ad.status === 'given' && (
            <div className="absolute inset-0 bg-eco-900/60 backdrop-blur-xs flex items-center justify-center z-20">
              <span className="px-2 py-0.5 bg-white text-eco-900 font-extrabold text-[10px] sm:text-xs rounded-lg uppercase shadow-sm">
                Donné
              </span>
            </div>
          )}
          {ad.status === 'pending' && (
            <div className="absolute top-1.5 left-1.5 z-10">
              <span className="px-1.5 py-0.5 bg-amber-500 text-white font-bold text-[9px] rounded shadow-xs leading-none">
                ⏳ Modération
              </span>
            </div>
          )}

          {/* Bouton Favori */}
          <button
            type="button"
            onClick={handleFavoriteClick}
            className="absolute top-1.5 right-1.5 z-10 p-1 sm:p-1.5 rounded-lg bg-white/90 backdrop-blur-sm hover:bg-white text-slate-700 hover:text-red-500 shadow-xs transition active:scale-90"
            aria-label="Ajouter aux favoris"
          >
            <Heart className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
          </button>

          {/* État compact visible dès sm: */}
          <div className="hidden sm:block absolute bottom-1.5 left-1.5 z-10">
            <span className="px-1.5 py-0.5 bg-black/60 backdrop-blur-sm text-white font-medium text-[9px] rounded leading-none">
              {conditionObj?.label.split('(')[0].trim() || 'Bon état'}
            </span>
          </div>
        </div>

        {/* Corps condensé */}
        <div className="p-1.5 sm:p-2.5 space-y-0.5 sm:space-y-1 min-w-0">
          {/* Titre sur 1 seule ligne */}
          <h3 className="truncate text-xs sm:text-[13px] lg:text-sm font-semibold text-slate-900 group-hover:text-eco-800 transition-colors leading-snug">
            {ad.title}
          </h3>

          {/* Localisation compacte + badge catégorie discret sur sm+ */}
          <div className="flex items-center justify-between gap-1 text-[10px] sm:text-[11px] text-slate-500 min-w-0">
            <span className="inline-flex items-center gap-0.5 truncate min-w-0">
              <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-warm-500 flex-shrink-0" />
              <span className="truncate">{ad.commune}</span>
            </span>

            {categoryObj?.name && (
              <span className="hidden sm:inline-block text-[10px] font-semibold text-eco-700 bg-eco-50 px-1.5 py-0.2 rounded truncate max-w-[55%]">
                {categoryObj.name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer carte : Prix bien visible + bouton WhatsApp compact */}
      <div className="px-1.5 pb-1.5 pt-1 sm:px-2.5 sm:pb-2.5 border-t border-creme-100 flex items-center justify-between gap-1 min-w-0">
        <span
          className={`text-xs sm:text-sm lg:text-[15px] font-extrabold leading-none truncate ${
            ad.type === 'don' ? 'text-warm-600' : 'text-eco-900'
          }`}
        >
          <span className="sm:hidden">{compactPrice}</span>
          <span className="hidden sm:inline">{desktopPrice}</span>
        </span>

        <button
          type="button"
          onClick={handleQuickWhatsapp}
          className="flex items-center justify-center p-1 sm:px-2 sm:py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[10px] rounded-md sm:rounded-lg border border-emerald-200 transition active:scale-95 flex-shrink-0"
          title={`Contacter sur WhatsApp (${fullFormattedPrice})`}
          aria-label="Contacter sur WhatsApp"
        >
          <MessageCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 fill-emerald-600" />
        </button>
      </div>
    </div>
  );
}
