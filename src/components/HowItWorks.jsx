import React from 'react';
import { Camera, ShieldCheck, MessageCircle, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function HowItWorks({ onOpenPublish }) {
  const steps = [
    {
      num: "01",
      icon: Camera,
      title: "Je photographie & je publie",
      desc: "Prenez 2 ou 3 photos nettes, fixez un prix en FCFA ou choisissez le Don Gratuit (0 FCFA). Précisez votre commune et votre quartier à Abidjan."
    },
    {
      num: "02",
      icon: ShieldCheck,
      title: "Validation de sécurité Seconde Vie",
      desc: "Notre équipe de modérateurs vérifie chaque annonce avant sa mise en ligne pour éliminer les arnaques et protéger notre communauté."
    },
    {
      num: "03",
      icon: MessageCircle,
      title: "Contact WhatsApp direct",
      desc: "L'acheteur ou le bénéficiaire du don vous contacte directement sur WhatsApp en un clic pour convenir des modalités sans intermédiaire."
    },
    {
      num: "04",
      icon: RefreshCw,
      title: "Deuxième vie & Zéro déchet",
      desc: "Rendez-vous dans un lieu public en toute sécurité. Vous gagnez de l'argent ou faites une bonne action tout en sauvant la planète !"
    }
  ];

  return (
    <section id="comment-ca-marche" className="py-12 sm:py-16 bg-gradient-to-b from-white to-creme-100/60 border-b border-creme-200 overflow-x-hidden">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 min-w-0">
        
        {/* En-tête */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-eco-700 bg-eco-50 px-3 py-1 rounded-full border border-eco-200">
            Simplicité & Confiance
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 mt-3">
            Comment fonctionne Seconde Vie ?
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mt-2">
            Une marketplace transparente, rapide et sans commission cachée, pensée pour le quotidien ivoirien.
          </p>
        </div>

        {/* 4 Étapes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((st, i) => {
            const Icon = st.icon;
            return (
              <div 
                key={i}
                className="relative bg-white rounded-3xl p-6 border border-creme-200 shadow-sm hover:shadow-xl hover:border-eco-300 transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  {/* Numéro & Icône */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl font-black text-creme-400 group-hover:text-eco-600 transition-colors">
                      {st.num}
                    </span>
                    <div className="w-12 h-12 rounded-2xl bg-eco-50 text-eco-700 group-hover:bg-eco-700 group-hover:text-white flex items-center justify-center transition-all duration-300 shadow-xs">
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>

                  <h3 className="font-extrabold text-base text-slate-900 mb-2">
                    {st.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {st.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-creme-100 flex items-center gap-1.5 text-[11px] font-bold text-eco-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-eco-600" />
                  <span>100% gratuit</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bannière Call To Action */}
        <div className="mt-12 bg-gradient-to-r from-eco-800 to-slate-900 rounded-3xl p-6 sm:p-10 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-xl sm:text-2xl font-black">
              Vous avez des objets qui dorment chez vous ?
            </h3>
            <p className="text-xs sm:text-sm text-creme-100/80">
              Ne les jetez plus. Faites de la place et donnez le sourire à quelqu'un dès aujourd'hui.
            </p>
          </div>
          <button
            onClick={onOpenPublish}
            className="w-full sm:w-auto px-5 sm:px-6 py-3.5 bg-gradient-to-r from-warm-500 to-warm-600 hover:from-warm-600 hover:to-warm-700 text-white font-extrabold text-sm rounded-2xl shadow-lg transition transform hover:-translate-y-0.5 active:translate-y-0 text-center whitespace-normal sm:whitespace-nowrap"
          >
            Déposer une annonce maintenant →
          </button>
        </div>

      </div>
    </section>
  );
}

