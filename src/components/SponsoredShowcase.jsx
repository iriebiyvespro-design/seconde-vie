import React from 'react';
import { Zap, Sparkles, ArrowRight } from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import AdCard from './AdCard';

export default function SponsoredShowcase({ onSelectAd, onOpenPublish }) {
  const { sponsoredAds, loadingAds } = useMarketplace();

  if (loadingAds || !sponsoredAds || sponsoredAds.length === 0) {
    return null;
  }

  const displayedSponsored = sponsoredAds.slice(0, 6);

  return (
    <section className="py-2.5 sm:py-3.5 bg-gradient-to-r from-amber-50/90 via-warm-50/75 to-creme-50 border-b border-amber-200/80 overflow-x-hidden">
      <div className="w-full max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 min-w-0 space-y-2">
        
        {/* En-tête Bandeau Sponsorisé */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-gradient-to-r from-amber-500 to-warm-600 text-white text-[10px] sm:text-xs font-black shadow-2xs flex-shrink-0">
              <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-white" />
              Sélection Sponsorisée ⚡
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-amber-900/80">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Annonces mises en avant à la une
            </span>
          </div>

          {onOpenPublish && (
            <button
              type="button"
              onClick={onOpenPublish}
              className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-extrabold text-amber-900 hover:text-warm-700 bg-white/90 hover:bg-white px-2 py-1 sm:px-3 sm:py-1 rounded-lg border border-amber-300/80 shadow-2xs transition whitespace-nowrap flex-shrink-0"
            >
              <span className="sm:hidden">Booster</span>
              <span className="hidden sm:inline">Mettre mon annonce ici</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Grille dense : 3 produits sur une ligne sur mobile, 6 sur une ligne sur ordinateur (lg:grid-cols-6) */}
        <div className="grid grid-cols-3 gap-2 lg:grid-cols-6 lg:gap-3">
          {displayedSponsored.map((ad, idx) => (
            <div key={ad.id} className={idx >= 3 ? 'hidden lg:block min-w-0' : 'min-w-0'}>
              <AdCard ad={ad} onSelectAd={onSelectAd} />
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

