import React, { useState } from 'react';
import { 
  Search, 
  MapPin, 
  Tag, 
  Gift, 
  Sparkles, 
  Shirt, 
  Smartphone, 
  Armchair, 
  Footprints
} from 'lucide-react';
import { COMMUNES_ABIDJAN } from '../data/communes';
import { useMarketplace } from '../context/MarketplaceContext';

export default function HeroBanner({ onFilterApply }) {
  const { filters, setFilters, categories } = useMarketplace();
  const [localSearch, setLocalSearch] = useState(filters.search || '');
  const [localCategory, setLocalCategory] = useState(filters.category || 'all');
  const [localCommune, setLocalCommune] = useState(filters.commune || 'all');
  const [localType, setLocalType] = useState(filters.type || 'all');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setFilters(prev => ({
      ...prev,
      search: localSearch,
      category: localCategory,
      commune: localCommune,
      type: localType
    }));
    if (onFilterApply) onFilterApply();
  };

  const handleQuickCategory = (catId) => {
    setFilters(prev => ({ ...prev, category: catId }));
    if (onFilterApply) onFilterApply();
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#0a2312] via-[#0d2e18] to-slate-900 text-white pt-6 pb-10 sm:pt-12 sm:pb-16 lg:pb-20">
      {/* Motifs de fond subtils */}
      <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fefce8_1px,transparent_1px)] [background-size:28px_28px] pointer-events-none"></div>
      <div className="absolute top-1/3 -right-20 w-72 sm:w-96 h-72 sm:h-96 bg-warm-500/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-10 -left-20 w-72 sm:w-96 h-72 sm:h-96 bg-eco-500/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 relative z-10 min-w-0">
        
        {/* Pilier officiel : "Consommez malin, vivez durable !" */}
        <div className="flex justify-center mb-4 sm:mb-6">
          <div className="inline-flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-1.5 sm:py-2 rounded-full bg-[#072410]/90 backdrop-blur-md border border-emerald-500/30 text-creme-100 text-[11px] sm:text-sm font-bold shadow-lg max-w-full text-center">
            <span>🤝</span>
            <span className="text-emerald-400 font-extrabold">|</span>
            <span className="tracking-wide">Consommez malin, vivez durable !</span>
            <span>🍃</span>
          </div>
        </div>

        {/* Titre Seconde Vie Uniquement */}
        <div className="text-center max-w-4xl mx-auto mb-6 sm:mb-8">
          <div className="inline-block relative mb-2">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white flex items-center justify-center flex-wrap gap-2">
              <span className="text-emerald-400 drop-shadow-sm">Seconde</span>
              <span className="font-['Caveat'] text-warm-500 text-5xl sm:text-7xl lg:text-8xl drop-shadow-md -rotate-3 inline-block">
                Vie
              </span>
            </h1>
            <div className="w-24 sm:w-36 h-1 sm:h-1.5 bg-gradient-to-r from-warm-400 to-warm-500 rounded-full mx-auto -mt-1"></div>
          </div>

          <div className="space-y-1 mt-3 sm:mt-4">
            <p className="text-base sm:text-2xl font-black text-white tracking-wide uppercase">
              <span className="text-emerald-300">Achetez</span> • <span className="text-warm-400">Vendez</span> • <span className="text-emerald-300">Donnez</span>
            </p>
            <p className="text-sm sm:text-xl font-medium text-creme-200/90 italic font-serif">
              « Donnez une deuxième vie à vos objets ! »
            </p>
          </div>

          <p className="text-xs sm:text-sm text-eco-100/80 max-w-2xl mx-auto mt-2.5 sm:mt-3 font-normal px-2">
            La marketplace ivoirienne pour acheter à petit prix en FCFA ou donner gratuitement à Abidjan et partout en Côte d'Ivoire.
          </p>
        </div>

        {/* Barre de Recherche Principale Mobile-First */}
        <div className="w-full max-w-4xl mx-auto bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-5 shadow-2xl border border-creme-200/60 text-slate-900 mb-6 sm:mb-8 min-w-0">
          
          {/* Onglets rapides adaptés mobile & desktop */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-3 pb-3 border-b border-slate-100">
            <button
              type="button"
              onClick={() => setLocalType('all')}
              className={`px-2.5 sm:px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs font-black transition whitespace-nowrap flex-shrink-0 ${
                localType === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span className="sm:hidden">Toutes</span>
              <span className="hidden sm:inline">Toutes les annonces</span>
            </button>
            <button
              type="button"
              onClick={() => setLocalType('vente')}
              className={`px-2.5 sm:px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs font-black transition whitespace-nowrap flex-shrink-0 ${
                localType === 'vente'
                  ? 'bg-[#15803d] text-white shadow-xs'
                  : 'bg-eco-50 text-eco-900 hover:bg-eco-100'
              }`}
            >
              <span className="sm:hidden">Achats (FCFA)</span>
              <span className="hidden sm:inline">À acheter (FCFA)</span>
            </button>
            <button
              type="button"
              onClick={() => setLocalType('don')}
              className={`px-2.5 sm:px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs font-black transition whitespace-nowrap flex-shrink-0 flex items-center gap-1.5 ${
                localType === 'don'
                  ? 'bg-[#ea580c] text-white shadow-xs'
                  : 'bg-warm-50 text-warm-800 hover:bg-warm-100'
              }`}
            >
              <Gift className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="sm:hidden">Dons gratuits</span>
              <span className="hidden sm:inline">Dons gratuits (0 FCFA)</span>
            </button>
          </div>

          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 sm:gap-3">
            
            {/* Champ de recherche */}
            <div className="sm:col-span-2 lg:col-span-4 relative flex items-center min-w-0">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Que cherchez-vous ? (iPhone, salon...)"
                className="w-full pl-11 pr-3 py-3 bg-creme-50/60 hover:bg-creme-50 focus:bg-white rounded-xl sm:rounded-2xl border border-slate-200 focus:border-eco-600 focus:ring-2 focus:ring-eco-500/20 text-sm font-semibold text-slate-900 transition outline-none"
              />
            </div>

            {/* Catégories */}
            <div className="lg:col-span-3 relative flex items-center min-w-0">
              <Tag className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <select
                value={localCategory}
                onChange={(e) => setLocalCategory(e.target.value)}
                className="w-full pl-9 pr-3 py-3 bg-creme-50/60 hover:bg-creme-50 focus:bg-white rounded-xl sm:rounded-2xl border border-slate-200 focus:border-eco-600 focus:ring-2 focus:ring-eco-500/20 text-xs sm:text-sm font-bold text-slate-800 transition outline-none cursor-pointer"
              >
                <option value="all">Toutes catégories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Communes */}
            <div className="lg:col-span-3 relative flex items-center min-w-0">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <select
                value={localCommune}
                onChange={(e) => setLocalCommune(e.target.value)}
                className="w-full pl-9 pr-3 py-3 bg-creme-50/60 hover:bg-creme-50 focus:bg-white rounded-xl sm:rounded-2xl border border-slate-200 focus:border-eco-600 focus:ring-2 focus:ring-eco-500/20 text-xs sm:text-sm font-bold text-slate-800 transition outline-none cursor-pointer"
              >
                <option value="all">Toute ville</option>
                {COMMUNES_ABIDJAN.map(com => (
                  <option key={com.id} value={com.name}>{com.name}</option>
                ))}
              </select>
            </div>

            {/* Bouton Recherche */}
            <div className="sm:col-span-2 lg:col-span-2 min-w-0">
              <button
                type="submit"
                className="w-full h-full min-h-[46px] py-3 px-4 bg-gradient-to-r from-eco-700 to-eco-800 hover:from-eco-800 hover:to-eco-900 text-white font-black rounded-xl sm:rounded-2xl text-sm shadow-md transition flex items-center justify-center gap-2 active:scale-95"
              >
                <Search className="w-4 h-4" />
                <span>Trouver</span>
              </button>
            </div>
          </form>
        </div>

        {/* 5 Univers Phares : Carrousel horizontal fluide sur mobile, grille 5 colonnes sur tablette/desktop */}
        <div className="w-full max-w-4xl mx-auto pt-1 min-w-0">
          <p className="text-center text-[11px] sm:text-xs font-bold uppercase tracking-wider text-creme-200/70 mb-3">
            Accès direct aux univers phares
          </p>
          <div className="flex overflow-x-auto gap-3 pb-2 snap-x no-scrollbar sm:grid sm:grid-cols-5 sm:overflow-visible text-center">
            
            <button
              onClick={() => handleQuickCategory('vetements-mode')}
              className="min-w-[115px] sm:min-w-0 snap-start p-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-2xl border border-white/10 transition group flex flex-col items-center flex-shrink-0"
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white text-slate-900 flex items-center justify-center mb-2 shadow-sm group-hover:scale-110 transition">
                <Shirt className="w-5 h-5 sm:w-6 sm:h-6 text-eco-800" />
              </div>
              <span className="text-[11px] sm:text-xs font-bold text-white leading-tight">Vêtements & Mode</span>
            </button>

            <button
              onClick={() => handleQuickCategory('telephones-electronique')}
              className="min-w-[115px] sm:min-w-0 snap-start p-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-2xl border border-white/10 transition group flex flex-col items-center flex-shrink-0"
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white text-slate-900 flex items-center justify-center mb-2 shadow-sm group-hover:scale-110 transition">
                <Smartphone className="w-5 h-5 sm:w-6 sm:h-6 text-eco-800" />
              </div>
              <span className="text-[11px] sm:text-xs font-bold text-white leading-tight">Téléphones & Tech</span>
            </button>

            <button
              onClick={() => handleQuickCategory('maison-decoration')}
              className="min-w-[115px] sm:min-w-0 snap-start p-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-2xl border border-white/10 transition group flex flex-col items-center flex-shrink-0"
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white text-slate-900 flex items-center justify-center mb-2 shadow-sm group-hover:scale-110 transition">
                <Armchair className="w-5 h-5 sm:w-6 sm:h-6 text-eco-800" />
              </div>
              <span className="text-[11px] sm:text-xs font-bold text-white leading-tight">Maison & Déco</span>
            </button>

            <button
              onClick={() => handleQuickCategory('chaussures')}
              className="min-w-[115px] sm:min-w-0 snap-start p-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-2xl border border-white/10 transition group flex flex-col items-center flex-shrink-0"
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white text-slate-900 flex items-center justify-center mb-2 shadow-sm group-hover:scale-110 transition">
                <Footprints className="w-5 h-5 sm:w-6 sm:h-6 text-eco-800" />
              </div>
              <span className="text-[11px] sm:text-xs font-bold text-white leading-tight">Chaussures & Sacs</span>
            </button>

            <button
              onClick={() => handleQuickCategory('divers')}
              className="min-w-[115px] sm:min-w-0 snap-start p-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-2xl border border-white/10 transition group flex flex-col items-center flex-shrink-0"
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white text-slate-900 flex items-center justify-center mb-2 shadow-sm group-hover:scale-110 transition">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-warm-600" />
              </div>
              <span className="text-[11px] sm:text-xs font-bold text-white leading-tight">Et bien plus...</span>
            </button>

          </div>
        </div>

      </div>
    </section>
  );
}
