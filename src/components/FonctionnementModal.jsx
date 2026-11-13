import React, { useState } from 'react';
import {
  X,
  Compass,
  Gift,
  PlusCircle,
  Crown,
  Zap,
  ShieldCheck,
  MessageCircle,
  ArrowRight,
  CheckCircle2,
  Phone,
  Mail,
  Sparkles,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Layers,
  Lock,
  FileText
} from 'lucide-react';
import { getSupportWhatsAppConfig } from '../utils/adHelpers';

export default function FonctionnementModal({
  isOpen = true,
  onClose,
  onNavigateExplore,
  onNavigateDonations,
  onOpenPublish,
  onOpenPricing,
  onOpenBoost,
  onOpenLegal,
  onOpenProfile
}) {
  const [selectedSection, setSelectedSection] = useState('all');
  const whatsappConfig = getSupportWhatsAppConfig();

  if (!isOpen) return null;

  const compartments = [
    {
      id: 'explore',
      badge: 'Acheter malin',
      badgeColor: 'bg-eco-50 text-eco-800 border-eco-200',
      icon: Compass,
      iconColor: 'bg-eco-100 text-eco-700',
      title: '1. Explorer les 12 catégories & annonces à Abidjan',
      subtitle: 'Trouvez rapidement des articles vérifiés à petit prix en FCFA près de chez vous.',
      description:
        'Parcourez les annonces classées par univers (Téléphones, Mode, Meubles, Électroménager, Véhicules, etc.) avec filtres par commune d’Abidjan (Cocody, Yopougon, Marcory, Plateau, etc.).',
      steps: [
        {
          num: 'Étape 1',
          title: 'Sélectionnez votre univers ou commune',
          desc: 'Utilisez la barre de recherche ou cliquez sur une catégorie pour affiner les offres selon vos besoins et votre budget.'
        },
        {
          num: 'Étape 2',
          title: 'Vérifiez les photos et l’état',
          desc: 'Consultez les photos réelles prises par le vendeur, l’état vérifié (Neuf, Très bon état, Bon état) et la localisation exacte à Abidjan.'
        },
        {
          num: 'Étape 3',
          title: 'Contact direct WhatsApp sans commission',
          desc: 'Discutez en direct avec le vendeur en 1 clic pour convenir du rendez-vous. Seconde Vie ne prend 0 FCFA de commission sur vos achats.'
        }
      ],
      actionLabel: 'Explorer la vitrine par catégorie',
      actionHandler: () => {
        onClose();
        if (onNavigateExplore) onNavigateExplore();
      }
    },
    {
      id: 'dons',
      badge: '100% Solidaire',
      badgeColor: 'bg-warm-100 text-warm-800 border-warm-200',
      icon: Gift,
      iconColor: 'bg-warm-100 text-warm-700',
      title: '2. Espace Dons Gratuits (0 FCFA)',
      subtitle: 'Donnez une seconde vie à vos objets inutilisés sans aucune contrepartie financière.',
      description:
        'Un compartiment entièrement dédié à la solidarité ivoirienne. Des membres offrent gratuitement des meubles, vêtements, fournitures scolaires, livres et petit électroménager.',
      steps: [
        {
          num: 'Étape 1',
          title: 'Repérez le badge « Don gratuit (0 FCFA) »',
          desc: 'Tous les dons sont clairement identifiés avec un prix strictement forcé à 0 FCFA pour garantir une transparence totale.'
        },
        {
          num: 'Étape 2',
          title: 'Contactez le donateur avec respect',
          desc: 'Échangez poliment sur WhatsApp pour convenir d’un lieu et d’une heure de remise en main propre.'
        },
        {
          num: 'Étape 3',
          title: 'Récupérez sans frais et libérez le quota',
          desc: 'La remise est 100% gratuite. Une fois l’article donné, le donateur marque l’annonce comme « Donné » pour libérer son quota.'
        }
      ],
      actionLabel: 'Voir tous les dons gratuits disponibles (0 FCFA)',
      actionHandler: () => {
        onClose();
        if (onNavigateDonations) onNavigateDonations();
      }
    },
    {
      id: 'publish',
      badge: 'Vendre ou Donner',
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      icon: PlusCircle,
      iconColor: 'bg-emerald-100 text-emerald-700',
      title: '3. Déposer une annonce en moins de 2 minutes',
      subtitle: 'Vendez vos affaires inutilisées ou donnez-les pour aider un voisin à Abidjan.',
      description:
        'Une interface simple et rapide accessible sur smartphone et ordinateur. Déposez votre annonce gratuitement avec photos et numéro WhatsApp.',
      steps: [
        {
          num: 'Étape 1',
          title: 'Prenez 2 à 3 photos nettes',
          desc: 'Photographiez votre objet sous une bonne lumière et décrivez fidèlement son état réel et ses dimensions.'
        },
        {
          num: 'Étape 2',
          title: 'Fixez votre prix ou cochez « Don gratuit »',
          desc: 'Définissez votre prix en Francs CFA (FCFA) ou offrez-le gratuitement. Indiquez votre commune et quartier de remise.'
        },
        {
          num: 'Étape 3',
          title: 'Modération & Mise en ligne rapide',
          desc: 'Notre équipe vérifie la conformité de l’annonce. Dès validation, les acheteurs peuvent vous contacter directement.'
        }
      ],
      actionLabel: 'Déposer une annonce maintenant',
      actionHandler: () => {
        onClose();
        if (onOpenPublish) onOpenPublish();
      }
    },
    {
      id: 'pricing',
      badge: 'Formules Vendeurs',
      badgeColor: 'bg-amber-50 text-amber-900 border-amber-300',
      icon: Crown,
      iconColor: 'bg-amber-100 text-amber-700',
      title: '4. Formules d’abonnement & Quotas d’annonces',
      subtitle: 'Des formules adaptées aux particuliers et aux vendeurs professionnels.',
      description:
        'Chaque membre bénéficie d’un quota d’annonces actives. Les articles vendus ou donnés libèrent immédiatement votre quota pour en publier de nouveaux.',
      steps: [
        {
          num: 'GRATUIT',
          title: '0 FCFA / mois — Idéal pour débuter',
          desc: 'Jusqu’à 3 annonces actives en simultané. Parfait pour désencombrer sa maison occasionnellement.'
        },
        {
          num: 'PLUS',
          title: '3 000 FCFA / mois — Pour vendeurs réguliers',
          desc: 'Jusqu’à 20 annonces actives + 2 crédits de boost mensuels offerts pour maximiser vos contacts.'
        },
        {
          num: 'BUSINESS',
          title: '10 000 FCFA / mois — Pour commerçants & boutiques',
          desc: 'Jusqu’à 100 annonces actives, 5 crédits de boost mensuels, statistiques avancées et badge Pro.'
        }
      ],
      actionLabel: 'Consulter les formules & abonnements',
      actionHandler: () => {
        onClose();
        if (onOpenPricing) onOpenPricing();
      }
    },
    {
      id: 'boost',
      badge: 'Vente 5x plus rapide',
      badgeColor: 'bg-warm-100 text-warm-900 border-warm-300',
      icon: Zap,
      iconColor: 'bg-warm-100 text-warm-700',
      title: '5. Booster une annonce (Mise en avant ⚡)',
      subtitle: 'Placez votre annonce en tête d’accueil et en tête de sa catégorie.',
      description:
        'Le boost propulse votre annonce dans le bandeau « Sélection Sponsorisée » visible par tous les visiteurs dès leur arrivée sur le site.',
      steps: [
        {
          num: 'Étape 1',
          title: 'Sélectionnez votre annonce à propulser',
          desc: 'Depuis votre espace « Mes annonces », cliquez sur le bouton « Booster » sur l’article de votre choix.'
        },
        {
          num: 'Étape 2',
          title: 'Choisissez la formule de boost',
          desc: 'Boost 7 jours (500 FCFA) ou Boost 14 jours (900 FCFA). Les crédits mensuels de formule PLUS/BUSINESS sont utilisables ici.'
        },
        {
          num: 'Étape 3',
          title: 'Paiement sécurisé via Wave Côte d’Ivoire (+225)',
          desc: 'Validation rapide et activation immédiate du badge « SPONSORISÉ » sur l’annonce jusqu’à la date d’expiration.'
        }
      ],
      actionLabel: 'Booster une annonce (Mes Annonces)',
      actionHandler: () => {
        onClose();
        if (onOpenBoost) {
          onOpenBoost();
        } else if (onOpenProfile) {
          onOpenProfile('my-ads');
        }
      }
    },
    {
      id: 'security',
      badge: 'Confiance & Modération',
      badgeColor: 'bg-emerald-50 text-emerald-900 border-emerald-300',
      icon: ShieldCheck,
      iconColor: 'bg-emerald-100 text-emerald-700',
      title: '6. Sécurité, Charte de modération & Signalement',
      subtitle: 'Des règles strictes pour acheter, vendre et donner en toute confiance à Abidjan.',
      description:
        'Chaque publication est soumise à une modération humaine pour filtrer les arnaques, les contrefaçons et les abus.',
      steps: [
        {
          num: 'Règle 1',
          title: 'Rencontre physique en lieu public de jour',
          desc: 'Donnez rendez-vous dans un espace passant et sécurisé (centre commercial, supermarché, pharmacie, station-service).'
        },
        {
          num: 'Règle 2',
          title: 'Vérifiez et testez avant de payer',
          desc: 'Inspectez l’objet sous tous les angles et testez son bon fonctionnement avant de remettre les espèces ou de valider le transfert Wave.'
        },
        {
          num: 'Règle 3',
          title: 'Zéro avance d’argent à distance',
          desc: 'N’envoyez JAMAIS d’argent à l’avance pour « réserver » un article ou payer des « frais de transport ».'
        }
      ],
      isLegalSection: true
    }
  ];

  const displayedCompartments =
    selectedSection === 'all'
      ? compartments
      : compartments.filter((c) => c.id === selectedSection);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-0 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="how-it-works-modal-title"
    >
      <div className="relative w-full h-full sm:h-auto max-w-4xl bg-white rounded-none sm:rounded-3xl shadow-2xl border-0 sm:border border-creme-300 overflow-hidden my-auto sm:max-h-[92vh] flex flex-col">
        {/* Header de la Modale */}
        <div className="bg-gradient-to-r from-[#0a2312] via-[#0d2e18] to-slate-950 text-white px-4 py-4 sm:px-8 sm:py-5 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 sm:gap-3.5 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-warm-500 text-white flex items-center justify-center flex-shrink-0 shadow-md">
                <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 bg-amber-400/20 px-2.5 py-0.5 rounded-full border border-amber-400/30">
                    Guide Officiel • Seconde Vie
                  </span>
                  <span className="text-[10px] text-emerald-300 font-semibold">
                    Abidjan &amp; Côte d'Ivoire
                  </span>
                </div>
                <h2
                  id="how-it-works-modal-title"
                  className="text-base sm:text-2xl font-black text-white mt-1 leading-snug"
                >
                  Comment ça marche &amp; Compartiments du site
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                  Tout comprendre pour acheter, vendre, donner et booster vos articles en toute sérénité.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition flex-shrink-0"
              aria-label="Fermer le guide"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Filtres rapides par compartiment */}
          <div className="flex items-center gap-1.5 sm:gap-2 pt-3 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedSection('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex-shrink-0 border ${
                selectedSection === 'all'
                  ? 'bg-warm-500 text-white border-warm-400 shadow-sm'
                  : 'bg-white/10 text-slate-200 border-white/15 hover:bg-white/20'
              }`}
            >
              Tous les compartiments ({compartments.length})
            </button>
            {compartments.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedSection(c.id)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap flex-shrink-0 border ${
                  selectedSection === c.id
                    ? 'bg-warm-500 text-white border-warm-400 shadow-sm'
                    : 'bg-white/10 text-slate-200 border-white/15 hover:bg-white/20'
                }`}
              >
                {c.badge}
              </button>
            ))}
          </div>
        </div>

        {/* Corps défilant avec les compartiments */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 bg-slate-50/60">
          {displayedCompartments.map((comp) => {
            const CompIcon = comp.icon;
            return (
              <div
                key={comp.id}
                id={`compartiment-${comp.id}`}
                className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-creme-200 shadow-sm hover:shadow-md transition space-y-4"
              >
                {/* En-tête du compartiment */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-creme-100">
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${comp.iconColor} shadow-2xs`}
                    >
                      <CompIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${comp.badgeColor}`}
                        >
                          {comp.badge}
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                        {comp.title}
                      </h3>
                      <p className="text-xs text-slate-500">{comp.subtitle}</p>
                    </div>
                  </div>

                  {/* Bouton d'action direct si applicable */}
                  {comp.actionLabel && (
                    <button
                      type="button"
                      onClick={comp.actionHandler}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-warm-500 to-warm-600 hover:from-warm-600 hover:to-warm-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex-shrink-0"
                    >
                      <span>{comp.actionLabel}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Description générale */}
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {comp.description}
                </p>

                {/* Étapes clés */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  {comp.steps.map((st, sIdx) => (
                    <div
                      key={sIdx}
                      className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-100 flex flex-col justify-between"
                    >
                      <div>
                        <span className="text-[10px] font-black uppercase text-eco-800 bg-eco-50 px-2 py-0.5 rounded">
                          {st.num}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 mt-2 mb-1">
                          {st.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          {st.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Si c'est la section sécurité : boutons directs vers CGU, Confidentialité et Charte */}
                {comp.isLegalSection && (
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-600 mr-1">
                      Consulter les documents officiels :
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        if (onOpenLegal) onOpenLegal('rules');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold transition"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Charte de modération</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        if (onOpenLegal) onOpenLegal('cgu');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 text-xs font-bold transition"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Conditions Générales (CGU)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        if (onOpenLegal) onOpenLegal('privacy');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 text-xs font-bold transition"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Confidentialité</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Compartiment 7 : Support d'assistance direct */}
          <div className="bg-gradient-to-r from-eco-900 to-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-white border border-eco-700/50 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-400/30">
                    Assistance 7j/7
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-white mt-1">
                    7. Une question ? Besoin d'aide pour publier ou acheter ?
                  </h3>
                  <p className="text-xs text-slate-300">
                    Notre équipe locale à Abidjan est à votre écoute via WhatsApp ou par e-mail.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-shrink-0">
                <a
                  href={whatsappConfig.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-xs transition"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Support WhatsApp ({whatsappConfig.display})</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href="mailto:contact@secondevie.ci?subject=Demande%20d'assistance%20Seconde%20Vie"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-extrabold text-xs rounded-xl border border-white/20 transition"
                >
                  <Mail className="w-4 h-4" />
                  <span>contact@secondevie.ci</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Pied de Modale */}
        <div className="p-3 sm:px-8 sm:py-3.5 bg-white border-t border-creme-200 flex items-center justify-between gap-3 text-xs text-slate-500 flex-shrink-0">
          <span>Seconde Vie — Marketplace communautaire &amp; solidaire en Côte d'Ivoire</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition"
          >
            Fermer le guide
          </button>
        </div>
      </div>
    </div>
  );
}

