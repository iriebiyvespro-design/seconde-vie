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
    <section className="relative overflow-hidden bg-gradient-to-b from-[#0a2312] via-[#0d2e18] to-slate-900 text-white py-2.5 sm:py-3.5">
      {/* Motifs de fond subtils */}
      <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fefce8_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none"></div>
      <div className="absolute -right-20 top-0 w-64 h-64 bg-warm-500/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-10 -left-20 w-64 h-64 bg-eco-500/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 relative z-10 min-w-0 space-y-2 sm:space-y-2.5">
        
        {/* En-tête compact marque + slogan (permet de voir les premières rangées de produits sans scroller) */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-center md:text-left">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-center md:justify-start gap-1 sm:gap-3">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white inline-flex items-center justify-center gap-1.5">
              <span className="text-emerald-400">Seconde</span>
              <span className="font-['Caveat'] text-warm-500 text-3xl sm:text-4xl lg:text-5xl -rotate-2 inline-block leading-none">
                Vie
              </span>
            </h1>
            <p className="text-xs sm:text-sm font-bold text-creme-100">
              <span className="text-emerald-300">Achetez</span> •{' '}
              <span className="text-warm-400">Vendez</span> •{' '}
              <span className="text-emerald-300">Donnez</span>
              <span className="hidden sm:inline text-creme-200/80 font-normal">
                {' '}— Donnez une deuxième vie à vos objets à Abidjan !
              </span>
            </p>
          </div>

          <div className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#072410]/90 border border-emerald-500/30 text-creme-100 text-xs font-bold flex-shrink-0">
            <span>🤝</span>
            <span className="text-emerald-400">|</span>
            <span>Consommez malin, vivez durable !</span>
            <span>🍃</span>
          </div>
        </div>

        {/* Barre de Recherche Compacte Mobile-First */}
        <div className="w-full bg-white rounded-2xl p-2 sm:p-2.5 shadow-xl border border-creme-200/60 text-slate-900 min-w-0">
          
          {/* Onglets rapides + Raccourcis Univers sur la même ligne sur desktop */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-100">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setLocalType('all')}
                className={`px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-black transition whitespace-nowrap flex-shrink-0 ${
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
                className={`px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-black transition whitespace-nowrap flex-shrink-0 ${
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
                className={`px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-black transition whitespace-nowrap flex-shrink-0 flex items-center gap-1 ${
                  localType === 'don'
                    ? 'bg-[#ea580c] text-white shadow-xs'
                    : 'bg-warm-50 text-warm-800 hover:bg-warm-100'
                }`}
              >
                <Gift className="w-3 h-3 flex-shrink-0" />
                <span className="sm:hidden">Dons gratuits</span>
                <span className="hidden sm:inline">Dons gratuits (0 FCFA)</span>
              </button>
            </div>

            {/* Raccourcis rapides discrets (Desktop) */}
            <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
              <button
                type="button"
                onClick={() => handleQuickCategory('vetements-mode')}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-eco-50 hover:text-eco-800 transition"
              >
                <Shirt className="w-3 h-3 text-eco-700" /> Mode
              </button>
              <button
                type="button"
                onClick={() => handleQuickCategory('telephones-electronique')}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-eco-50 hover:text-eco-800 transition"
              >
                <Smartphone className="w-3 h-3 text-eco-700" /> Tech
              </button>
              <button
                type="button"
                onClick={() => handleQuickCategory('meubles')}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-eco-50 hover:text-eco-800 transition"
              >
                <Armchair className="w-3 h-3 text-eco-700" /> Meubles
              </button>
              <button
                type="button"
                onClick={() => handleQuickCategory('chaussures')}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-eco-50 hover:text-eco-800 transition"
              >
                <Footprints className="w-3 h-3 text-eco-700" /> Chaussures
              </button>
              <button
                type="button"
                onClick={() => handleQuickCategory('divers')}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-warm-50 hover:text-warm-700 transition"
              >
                <Sparkles className="w-3 h-3 text-warm-500" /> Divers
              </button>
            </div>
          </div>

          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2">
            {/* Champ de recherche */}
            <div className="sm:col-span-2 lg:col-span-5 relative flex items-center min-w-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Que cherchez-vous ? (iPhone, salon, chaussures...)"
                className="w-full pl-9 pr-3 py-2.5 bg-creme-50/60 hover:bg-creme-50 focus:bg-white rounded-xl border border-slate-200 focus:border-eco-600 focus:ring-2 focus:ring-eco-500/20 text-xs sm:text-sm font-semibold text-slate-900 transition outline-none"
              />
            </div>

            {/* Catégories */}
            <div className="lg:col-span-3 relative flex items-center min-w-0">
              <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
              <select
                value={localCategory}
                onChange={(e) => setLocalCategory(e.target.value)}
                className="w-full pl-8 pr-2 py-2.5 bg-creme-50/60 hover:bg-creme-50 focus:bg-white rounded-xl border border-slate-200 focus:border-eco-600 text-xs sm:text-sm font-bold text-slate-800 transition outline-none cursor-pointer"
              >
                <option value="all">Toutes catégories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Communes */}
            <div className="lg:col-span-2 relative flex items-center min-w-0">
              <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
              <select
                value={localCommune}
                onChange={(e) => setLocalCommune(e.target.value)}
                className="w-full pl-8 pr-2 py-2.5 bg-creme-50/60 hover:bg-creme-50 focus:bg-white rounded-xl border border-slate-200 focus:border-eco-600 text-xs sm:text-sm font-bold text-slate-800 transition outline-none cursor-pointer"
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
                className="w-full h-full min-h-[40px] py-2 px-4 bg-gradient-to-r from-eco-700 to-eco-800 hover:from-eco-800 hover:to-eco-900 text-white font-black rounded-xl text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Search className="w-4 h-4" />
                <span>Trouver</span>
              </button>
            </div>
          </form>
        </div>

      </div>
    </section>
  );
}
