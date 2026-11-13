import React from 'react';
import { 
  MapPin, 
  Mail, 
  ShieldCheck, 
  Sparkles, 
  PlusCircle, 
  Heart, 
  User 
} from 'lucide-react';
import Logo from './Logo';
import { useMarketplace } from '../context/MarketplaceContext';
import { useAuth } from '../context/AuthContext';

export default function Footer({ 
  onSelectCategory, 
  onOpenPublish, 
  onNavigateDonations,
  onOpenProfile,
  onOpenFavorites,
  onOpenLegal,
  onOpenAdmin,
  onNavigateHome
}) {
  const { categories } = useMarketplace();
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const hasAdminAccess = Boolean(user && (isAdmin || isSuperAdmin));

  return (
    <footer className="bg-slate-950 text-slate-300 border-t border-slate-800 overflow-x-hidden w-full">
      
      {/* Haut de Footer : Bannière sobre et discrète */}
      <div className="border-b border-slate-800/80 bg-slate-900/60 py-6 px-3 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 text-center md:text-left min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/10 text-slate-300 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-slate-300" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm sm:text-base font-extrabold text-white">
                Rejoignez le mouvement anti-gaspillage en Côte d'Ivoire
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Chaque objet vendu ou donné permet de préserver l'environnement et le budget des familles.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-3 w-full md:w-auto flex-shrink-0">
            <button
              type="button"
              onClick={onOpenPublish}
              className="w-full sm:w-auto px-4 py-2 bg-white text-slate-900 hover:bg-slate-100 font-extrabold text-xs rounded-xl shadow-xs transition text-center flex items-center justify-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Déposer une annonce gratuite</span>
            </button>
            <button
              type="button"
              onClick={onNavigateDonations}
              className="w-full sm:w-auto px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-extrabold text-xs rounded-xl transition text-center flex items-center justify-center gap-1.5"
            >
              <span>Découvrir les dons solidaires (0 FCFA)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Contenu Principal Sobre & Monochrome */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20 md:py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
          
          {/* Colonne 1 & 2 : Présentation de marque & Contact */}
          <div className="sm:col-span-2 space-y-4">
            <div 
              onClick={onNavigateHome} 
              className="cursor-pointer inline-block"
              title="Retour à l'accueil Seconde Vie"
            >
              <Logo light={true} showTagline={true} size="large" />
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              <strong>SECONDE VIE</strong> est la plateforme de référence pour l'achat, la vente et le don d'objets d'occasion à Abidjan et partout en Côte d'Ivoire. Luttons ensemble contre la vie chère et le gaspillage.
            </p>

            <div className="space-y-2 text-xs text-slate-400 pt-1">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span>Abidjan (Cocody, Yopougon, Marcory, Plateau, etc.), Côte d'Ivoire</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <a
                  href="mailto:contact@secondevie.ci?subject=Demande%20d'information%20Seconde%20Vie"
                  className="hover:text-white transition font-medium underline underline-offset-2"
                >
                  contact@secondevie.ci
                </a>
              </div>
            </div>
          </div>

          {/* Colonne 3 : Catégories populaires */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
              Catégories en vedette
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              {categories.slice(0, 7).map((cat) => (
                <li key={cat.id}>
                  <button
                    type="button"
                    onClick={() => onSelectCategory(cat.id)}
                    className="hover:text-white transition text-left flex items-center gap-1.5"
                  >
                    <span className="text-slate-600">•</span>
                    <span>{cat.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Colonne 4 : Compartiments du site */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
              Compartiments du site
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <button
                  type="button"
                  onClick={onNavigateHome}
                  className="hover:text-white transition text-left flex items-center gap-1.5"
                >
                  <span>Explorer les annonces d'occasion</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenPublish}
                  className="hover:text-white transition text-left flex items-center gap-1.5"
                >
                  <span>Vendre ou donner un article</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Colonne 5 : Espace Membre & Mentions Légales */}
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-200 mb-2">
                Espace Membre
              </h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>
                  <button
                    type="button"
                    onClick={() => onOpenProfile('profile')}
                    className="hover:text-white transition text-left flex items-center gap-1.5"
                  >
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Mon Compte &amp; Paramètres</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onOpenProfile('my-ads')}
                    className="hover:text-white transition text-left flex items-center gap-1.5"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-slate-400" />
                    <span>Mes Annonces en ligne</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={onOpenFavorites}
                    className="hover:text-white transition text-left flex items-center gap-1.5"
                  >
                    <Heart className="w-3.5 h-3.5 text-slate-400" />
                    <span>Mes Favoris sauvegardés</span>
                  </button>
                </li>
              </ul>
            </div>

            <div className="pt-3 border-t border-slate-800">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-200 mb-2">
                Mentions Légales
              </h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>
                  <button
                    type="button"
                    onClick={() => onOpenLegal('mentions')}
                    className="hover:text-white transition text-left"
                  >
                    Mentions légales
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onOpenLegal('cgu')}
                    className="hover:text-white transition text-left"
                  >
                    Conditions Générales (CGU)
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onOpenLegal('privacy')}
                    className="hover:text-white transition text-left"
                  >
                    Politique de confidentialité
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onOpenLegal('rules')}
                    className="hover:text-white transition text-left"
                  >
                    Charte de modération &amp; Sécurité
                  </button>
                </li>
                {hasAdminAccess && (
                  <li className="pt-1">
                    <button
                      type="button"
                      onClick={onOpenAdmin}
                      className="hover:text-slate-200 text-slate-400 font-bold transition text-left flex items-center gap-1.5"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                      <span>Espace Super Admin</span>
                    </button>
                  </li>
                )}
              </ul>
            </div>
          </div>

        </div>

        {/* Ligne de copyright sobre sans doublons */}
        <div className="mt-10 pt-6 border-t border-slate-800 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <p>
            © {new Date().getFullYear()} <strong>SECONDE VIE</strong>. Tous droits réservés. Abidjan, Côte d'Ivoire.
          </p>
          <p className="text-[11px] text-slate-500">
            Plateforme d'achat, vente d'occasion et don solidaire
          </p>
        </div>
      </div>

    </footer>
  );
}
