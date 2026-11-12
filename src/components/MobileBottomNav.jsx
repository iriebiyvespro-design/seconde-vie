import React from 'react';
import { Compass, Gift, PlusCircle, Heart, User, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useMarketplace } from '../context/MarketplaceContext';

export default function MobileBottomNav({
  onNavigateHome,
  onNavigateDonations,
  onOpenPublish,
  onOpenFavorites,
  onOpenProfile,
  onOpenAdmin
}) {
  const { user, isAdmin } = useAuth();
  const { favorites } = useMarketplace();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 w-full max-w-[100vw] z-30 bg-white/95 backdrop-blur-md border-t border-creme-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-safe">
      <div className="grid grid-cols-5 items-center w-full max-w-full h-16 px-0.5">
        
        {/* 1. Explorer */}
        <button
          onClick={onNavigateHome}
          className="min-w-0 w-full flex flex-col items-center justify-center gap-0.5 text-slate-600 active:text-eco-700 py-1 px-0.5"
        >
          <Compass className="w-5 h-5 text-eco-700 flex-shrink-0" />
          <span className="text-[10px] font-bold truncate max-w-full">Explorer</span>
        </button>

        {/* 2. Dons Gratuits */}
        <button
          onClick={onNavigateDonations}
          className="min-w-0 w-full flex flex-col items-center justify-center gap-0.5 text-slate-600 active:text-warm-600 py-1 px-0.5"
        >
          <Gift className="w-5 h-5 text-warm-500 flex-shrink-0" />
          <span className="text-[10px] font-bold truncate max-w-full">Dons</span>
        </button>

        {/* 3. Bouton Central Surélevé : Publier */}
        <div className="min-w-0 w-full flex flex-col items-center justify-center">
          <button
            onClick={onOpenPublish}
            className="-mt-4 w-11 h-11 rounded-2xl bg-gradient-to-br from-warm-500 to-warm-600 text-white shadow-lg flex items-center justify-center active:scale-95 transition border-2 border-white flex-shrink-0"
            aria-label="Déposer une annonce"
          >
            <PlusCircle className="w-6 h-6" />
          </button>
          <span className="text-[10px] font-extrabold text-warm-700 leading-none mt-0.5 truncate max-w-full">
            Publier
          </span>
        </div>

        {/* 4. Favoris */}
        <button
          onClick={onOpenFavorites}
          className="relative min-w-0 w-full flex flex-col items-center justify-center gap-0.5 text-slate-600 active:text-red-500 py-1 px-0.5"
        >
          <div className="relative">
            <Heart className={`w-5 h-5 ${favorites.length > 0 ? 'fill-warm-500 text-warm-500' : 'text-slate-600'}`} />
            {favorites.length > 0 && (
              <span className="absolute -top-1.5 -right-2 w-4 h-4 flex items-center justify-center text-[9px] font-black bg-warm-600 text-white rounded-full">
                {favorites.length}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold truncate max-w-full">Favoris</span>
        </button>

        {/* 5. Compte / Admin */}
        <button
          onClick={() => isAdmin ? onOpenAdmin() : onOpenProfile('my-ads')}
          className="min-w-0 w-full flex flex-col items-center justify-center gap-0.5 text-slate-600 active:text-eco-700 py-1 px-0.5"
        >
          {isAdmin ? (
            <>
              <ShieldCheck className="w-5 h-5 text-warm-600 flex-shrink-0" />
              <span className="text-[10px] font-bold text-warm-700 truncate max-w-full">Admin</span>
            </>
          ) : (
            <>
              <User className="w-5 h-5 text-slate-700 flex-shrink-0" />
              <span className="text-[10px] font-bold truncate max-w-full">
                {user ? user.full_name.split(' ')[0] : 'Compte'}
              </span>
            </>
          )}
        </button>

      </div>
    </nav>
  );
}

