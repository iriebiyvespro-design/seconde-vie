import React, { useState } from 'react';
import { 
  MapPin, 
  Mail, 
  ShieldCheck, 
  Sparkles, 
  MessageCircle
} from 'lucide-react';
import Logo from './Logo';
import LegalModal from './LegalModal';
import { useMarketplace } from '../context/MarketplaceContext';

export default function Footer({ onSelectCategory, onOpenPublish, onNavigateDonations }) {
  const { categories } = useMarketplace();
  const [legalModal, setLegalModal] = useState(null); // 'cgu', 'privacy', 'rules'

  return (
    <footer className="bg-slate-950 text-creme-100 border-t border-slate-800 overflow-x-hidden w-full">
      
      {/* Haut de Footer : Bannière de Communauté */}
      <div className="border-b border-slate-800/80 bg-eco-950/40 py-8 px-3 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 text-center md:text-left min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-warm-500/20 text-warm-400 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h4 className="text-base font-extrabold text-white">
                Rejoignez le mouvement anti-gaspillage en Côte d'Ivoire
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Chaque objet vendu ou donné permet de préserver l'environnement et le budget des familles.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-3 w-full md:w-auto flex-shrink-0">
            <button
              onClick={onOpenPublish}
              className="w-full sm:w-auto px-5 py-2.5 bg-warm-600 hover:bg-warm-500 text-white font-extrabold text-xs rounded-xl shadow-md transition text-center"
            >
              Déposer une annonce gratuite
            </button>
            <button
              onClick={onNavigateDonations}
              className="w-full sm:w-auto px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-extrabold text-xs rounded-xl transition text-center"
            >
              Découvrir les dons solidaires
            </button>
          </div>
        </div>
      </div>

      {/* Contenu Principal du Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-24 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
          
          {/* Colonne 1 & 2 : Présentation de marque */}
          <div className="sm:col-span-2 space-y-4">
            <Logo light={true} showTagline={true} size="large" />
            
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              <strong>SECONDE VIE</strong> est la plateforme de référence pour l'achat, la vente et le don d'objets d'occasion à Abidjan et partout en Côte d'Ivoire. Luttons ensemble contre la vie chère et le gaspillage.
            </p>

            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-warm-400" />
                <span>Abidjan (Cocody, Yopougon, Marcory, Plateau...), Côte d'Ivoire</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span>Support WhatsApp : +225 07 00 00 00 00</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-eco-400" />
                <span>contact@secondevie.ci</span>
              </div>
            </div>
          </div>

          {/* Colonne 3 : Catégories populaires */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-warm-400">
              Catégories en vedette
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              {categories.slice(0, 6).map((cat) => (
                <li key={cat.id}>
                  <button
                    onClick={() => onSelectCategory(cat.id)}
                    className="hover:text-white transition text-left"
                  >
                    {cat.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Colonne 4 : Navigation & Solidarité */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-warm-400">
              Plateforme & Solidarité
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <button onClick={onNavigateDonations} className="hover:text-white transition text-left">
                  🎁 Objets Gratuits (Dons 0 FCFA)
                </button>
              </li>
              <li>
                <a href="#comment-ca-marche" className="hover:text-white transition">
                  Comment ça marche
                </a>
              </li>
              <li>
                <button onClick={onOpenPublish} className="hover:text-white transition text-left">
                  Publier une annonce
                </button>
              </li>
              <li>
                <button onClick={() => setLegalModal('rules')} className="hover:text-white transition text-left">
                  Conseils de sécurité & Remise
                </button>
              </li>
              <li>
                <span className="text-eco-400 font-bold">Devise officielle : Franc CFA (FCFA)</span>
              </li>
            </ul>
          </div>

          {/* Colonne 5 : Confiance & Légal */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-warm-400">
              Confiance & Légal
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <button onClick={() => setLegalModal('cgu')} className="hover:text-white transition text-left">
                  Conditions d'utilisation (CGU)
                </button>
              </li>
              <li>
                <button onClick={() => setLegalModal('privacy')} className="hover:text-white transition text-left">
                  Politique de confidentialité
                </button>
              </li>
              <li>
                <button onClick={() => setLegalModal('rules')} className="hover:text-white transition text-left">
                  Charte de modération Seconde Vie
                </button>
              </li>
              <li>
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-800/60 px-2 py-1 rounded-md mt-2">
                  <ShieldCheck className="w-3.5 h-3.5" /> Modération Humaine 100%
                </span>
              </li>
            </ul>
          </div>

        </div>

        {/* Ligne de copyright */}
        <div className="mt-12 pt-8 border-t border-slate-800 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <p>
            © {new Date().getFullYear()} <strong>SECONDE VIE</strong>. Tous droits réservés. Abidjan, Côte d'Ivoire.
          </p>
          <p className="flex items-center gap-1 text-slate-400">
            Fait avec passion pour l'économie circulaire & solidaire
          </p>
        </div>
      </div>

      {/* Modale d'informations légales & charte communautaire */}
      {legalModal && (
        <LegalModal
          initialDoc={legalModal}
          onClose={() => setLegalModal(null)}
        />
      )}

    </footer>
  );
}

