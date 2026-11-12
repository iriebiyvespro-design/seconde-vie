import React, { useState } from 'react';
import { 
  PlusCircle, 
  Heart, 
  User, 
  ShieldCheck, 
  LogOut, 
  Gift, 
  Compass, 
  HelpCircle, 
  Menu, 
  X,
  MapPin,
  ChevronDown,
  Crown
} from 'lucide-react';
import Logo from './Logo';
import { useAuth } from '../context/AuthContext';
import { useMarketplace } from '../context/MarketplaceContext';

export default function Header({ 
  onOpenPublish, 
  onOpenAuth, 
  onOpenAdmin, 
  onOpenProfile,
  onNavigateHome,
  onNavigateDonations,
  onNavigateHowItWorks,
  onOpenFavorites,
  onOpenPricing
}) {
  const { user, isAdmin, isSuperAdmin, logout } = useAuth();
  const { favorites, stats } = useMarketplace();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const displayRoleLabel = isSuperAdmin
    ? 'Super Admin'
    : isAdmin
      ? 'Administrateur'
      : 'Membre vérifié';

  return (
    <header className="sticky top-0 z-30 w-full max-w-full bg-white/95 backdrop-blur-md border-b border-creme-200/80 shadow-xs transition-all">
      {/* Barre d'information épurée et sans débordement sur mobile */}
      <div className="w-full bg-gradient-to-r from-eco-800 via-eco-700 to-eco-900 text-creme-100 text-[11px] sm:text-xs py-1.5 px-3 sm:px-8">
        <div className="w-full max-w-7xl mx-auto flex justify-between items-center gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center gap-1 font-semibold text-white min-w-0 truncate">
              <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-warm-400 flex-shrink-0" />
              <span className="truncate">Abidjan, Côte d'Ivoire</span>
            </span>
            <span className="hidden md:inline text-eco-300 flex-shrink-0">•</span>
            <span className="hidden md:inline text-eco-100 truncate">Marketplace solidaire & écologique</span>
          </div>

          <div className="text-[11px] font-medium text-eco-100 flex-shrink-0 whitespace-nowrap">
            <span className="sm:hidden font-semibold">FCFA • Dons &amp; Occasions</span>
            <span className="hidden sm:inline">Achetez • Vendez • Donnez en FCFA</span>
          </div>
        </div>
      </div>

      {/* Navigation Principale */}
      <div className="w-full max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-20 gap-1.5 sm:gap-3 min-w-0">
          
          {/* Logo officiel Seconde Vie */}
          <div onClick={onNavigateHome} className="min-w-0 flex-shrink sm:flex-shrink-0">
            <Logo showTagline={true} />
          </div>

          {/* Liens de navigation Desktop (adaptés lg et xl pour éviter tout débordement) */}
          <nav className="hidden lg:flex items-center gap-0.5 xl:gap-2 flex-shrink-0">
            <button
              onClick={onNavigateHome}
              className="flex items-center gap-1.5 px-2.5 xl:px-3 py-2 text-xs xl:text-sm font-semibold text-slate-700 hover:text-eco-700 hover:bg-eco-50/60 rounded-xl transition whitespace-nowrap"
            >
              <Compass className="w-4 h-4 text-eco-600 flex-shrink-0" />
              <span>Explorer</span>
            </button>

            <button
              onClick={onNavigateDonations}
              className="flex items-center gap-1.5 px-2.5 xl:px-3 py-2 text-xs xl:text-sm font-semibold text-slate-700 hover:text-warm-700 hover:bg-warm-50/80 rounded-xl transition whitespace-nowrap"
            >
              <Gift className="w-4 h-4 text-warm-500 flex-shrink-0" />
              <span>
                Dons <span className="hidden xl:inline">gratuits</span>
              </span>
              {stats.freeDonations > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] font-bold bg-warm-100 text-warm-700 rounded-full border border-warm-200">
                  {stats.freeDonations}
                </span>
              )}
            </button>

            <button
              onClick={onNavigateHowItWorks}
              className="flex items-center gap-1.5 px-2.5 xl:px-3 py-2 text-xs xl:text-sm font-semibold text-slate-700 hover:text-eco-700 hover:bg-eco-50/60 rounded-xl transition whitespace-nowrap"
            >
              <HelpCircle className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <span>Fonctionnement</span>
            </button>

            <button
              onClick={onOpenPricing}
              className="flex items-center gap-1.5 px-2.5 xl:px-3 py-2 text-xs xl:text-sm font-bold text-warm-700 hover:text-warm-800 hover:bg-warm-50 rounded-xl transition whitespace-nowrap"
            >
              <Crown className="w-4 h-4 text-warm-500 flex-shrink-0" />
              <span>
                Formules <span className="hidden xl:inline">&amp; Boosts</span>
              </span>
            </button>

            {/* Accès strictement réservé à l'administrateur / Super Admin authentifié */}
            {isAdmin && (
              <button
                onClick={onOpenAdmin}
                className="flex items-center gap-1.5 px-2.5 xl:px-3 py-2 text-xs xl:text-sm font-bold text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-xl transition whitespace-nowrap"
              >
                <ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Administration</span>
                {stats.pendingAds > 0 && (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                )}
              </button>
            )}
          </nav>

          {/* Actions & Profil Utilisateur */}
          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
            
            {/* Bouton Favoris (Desktop/Tablette, sur mobile il est dans le bottom nav) */}
            <button
              onClick={onOpenFavorites}
              className="hidden sm:flex relative p-2.5 text-slate-600 hover:text-eco-700 hover:bg-eco-50 rounded-xl transition"
              title="Mes favoris"
            >
              <Heart className={`w-5 h-5 ${favorites.length > 0 ? 'fill-warm-500 text-warm-500' : ''}`} />
              {favorites.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 flex items-center justify-center text-[10px] font-bold bg-warm-500 text-white rounded-full">
                  {favorites.length}
                </span>
              )}
            </button>

            {/* Utilisateur connecté ou bouton unifié "Connexion" */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 sm:pr-2.5 rounded-xl border border-creme-300 hover:border-eco-300 hover:bg-creme-50 transition"
                >
                  <img
                    src={user.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"}
                    alt={user.full_name}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover ring-2 ring-eco-600/20"
                  />
                  <div className="hidden xl:flex flex-col text-left leading-none">
                    <span className="text-xs font-bold text-slate-900 truncate max-w-[100px]">
                      {user.full_name}
                    </span>
                    <span className={`text-[10px] font-bold ${isSuperAdmin ? 'text-amber-700' : 'text-eco-700'}`}>
                      {displayRoleLabel}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                </button>

                {userDropdownOpen && (
                  <div 
                    className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-creme-200 py-2 z-50"
                    onMouseLeave={() => setUserDropdownOpen(false)}
                  >
                    <div className="px-4 py-2 border-b border-creme-200">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md mb-1 ${
                        isSuperAdmin
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-eco-50 text-eco-800 border border-eco-200'
                      }`}>
                        {displayRoleLabel}
                      </span>
                      <p className="text-sm font-bold text-slate-900 truncate">{user.full_name}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>

                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onOpenProfile('profile');
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-eco-50 flex items-center gap-2.5 transition"
                    >
                      <User className="w-4 h-4 text-eco-600" />
                      Mon Profil
                    </button>

                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onOpenProfile('my-ads');
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-eco-50 flex items-center gap-2.5 transition"
                    >
                      <PlusCircle className="w-4 h-4 text-eco-600" />
                      Mes Annonces
                    </button>

                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onOpenPricing();
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-warm-700 font-semibold hover:bg-warm-50 flex items-center gap-2.5 transition"
                    >
                      <Crown className="w-4 h-4 text-warm-500" />
                      Formules & Boosts
                    </button>

                    {isAdmin && (
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onOpenAdmin();
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-amber-800 font-bold hover:bg-amber-50 flex items-center gap-2.5 transition"
                      >
                        <ShieldCheck className="w-4 h-4 text-amber-600" />
                        Administration
                      </button>
                    )}

                    <div className="border-t border-creme-200 my-1"></div>

                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition"
                    >
                      <LogOut className="w-4 h-4 text-red-500" />
                      Se déconnecter
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-bold text-slate-700 hover:text-eco-800 bg-slate-100/80 sm:bg-transparent hover:bg-eco-50/80 rounded-xl transition flex-shrink-0"
              >
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600" />
                <span>Connexion</span>
              </button>
            )}

            {/* Bouton Primaire CRO : Visible sur sm+ (sur mobile, le bouton central + Publier est toujours accessible dans la barre du bas et dans le menu) */}
            <button
              onClick={onOpenPublish}
              className="hidden sm:flex items-center gap-1.5 px-3 xl:px-4 py-2 sm:py-2.5 text-xs xl:text-sm font-bold text-white bg-gradient-to-r from-warm-500 to-warm-600 hover:from-warm-600 hover:to-warm-700 rounded-xl shadow-md transition active:scale-95 whitespace-nowrap flex-shrink-0"
            >
              <PlusCircle className="w-4 h-4 text-white flex-shrink-0" />
              <span>Déposer une annonce</span>
            </button>

            {/* Bouton Hamburger Mobile/Tablette */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-700 hover:bg-creme-100 rounded-xl flex-shrink-0"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Menu Déroulant Mobile/Tablette */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-creme-200 px-4 pt-3 pb-6 space-y-2 shadow-lg max-h-[80vh] overflow-y-auto">
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenPublish();
            }}
            className="sm:hidden w-full flex items-center justify-center gap-2 py-3 px-4 font-extrabold text-sm text-white bg-gradient-to-r from-warm-500 to-warm-600 rounded-xl shadow-md mb-1"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Déposer une annonce</span>
          </button>

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onNavigateHome();
            }}
            className="w-full text-left flex items-center gap-3 py-3 px-3 text-slate-800 font-semibold rounded-xl hover:bg-eco-50"
          >
            <Compass className="w-5 h-5 text-eco-600" />
            Explorer les annonces
          </button>

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onNavigateDonations();
            }}
            className="w-full text-left flex items-center gap-3 py-3 px-3 text-warm-700 font-semibold rounded-xl hover:bg-warm-50"
          >
            <Gift className="w-5 h-5 text-warm-500" />
            Objets gratuits (Dons)
          </button>

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenPricing();
            }}
            className="w-full text-left flex items-center gap-3 py-3 px-3 text-warm-800 font-bold rounded-xl bg-warm-50/60"
          >
            <Crown className="w-5 h-5 text-warm-500" />
            Formules & Boosts (PLUS / BUSINESS)
          </button>

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onNavigateHowItWorks();
            }}
            className="w-full text-left flex items-center gap-3 py-3 px-3 text-slate-800 font-semibold rounded-xl hover:bg-eco-50"
          >
            <HelpCircle className="w-5 h-5 text-slate-500" />
            Comment ça marche
          </button>

          {/* Uniquement visible si l'utilisateur connecté est Administrateur */}
          {isAdmin && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAdmin();
              }}
              className="w-full text-left flex items-center gap-3 py-3 px-3 text-amber-800 font-bold rounded-xl bg-amber-50 border border-amber-200"
            >
              <ShieldCheck className="w-5 h-5 text-amber-600" />
              Administration
            </button>
          )}

          {!user && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAuth();
              }}
              className="w-full text-center py-3 px-4 font-bold text-eco-800 border-2 border-eco-600 rounded-xl hover:bg-eco-50 mt-2"
            >
              Connexion / Créer un compte
            </button>
          )}
        </div>
      )}
    </header>
  );
}
