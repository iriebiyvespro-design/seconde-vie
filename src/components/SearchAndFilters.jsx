import React, { useState } from 'react';
import { 
  SlidersHorizontal, 
  ArrowUpDown, 
  RefreshCw 
} from 'lucide-react';
import { CONDITIONS } from '../data/categories';
import { COMMUNES_ABIDJAN } from '../data/communes';
import { useMarketplace } from '../context/MarketplaceContext';

export default function SearchAndFilters({ totalResults }) {
  const { filters, setFilters } = useMarketplace();
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const resetAllFilters = () => {
    setFilters({
      search: '',
      category: 'all',
      type: 'all',
      condition: 'all',
      commune: 'all',
      minPrice: '',
      maxPrice: '',
      sortBy: 'recent'
    });
  };

  const activeFilterCount = [
    filters.type !== 'all',
    filters.commune !== 'all',
    filters.condition !== 'all',
    Boolean(filters.minPrice),
    Boolean(filters.maxPrice),
    filters.category !== 'all',
    Boolean(filters.search)
  ].filter(Boolean).length;

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-creme-200 shadow-sm mb-6 sm:mb-8 space-y-3 sm:space-y-4">
      
      {/* Barre supérieure */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs sm:text-sm font-extrabold text-slate-900">
            {totalResults} {totalResults > 1 ? 'annonces disponibles' : 'annonce disponible'}
          </span>
          {activeFilterCount > 0 && (
            <button
              onClick={resetAllFilters}
              className="text-[11px] font-bold text-warm-600 hover:text-warm-700 flex items-center gap-1 bg-warm-50 px-2 py-1 rounded-lg border border-warm-200 transition"
            >
              <RefreshCw className="w-3 h-3" /> Réinitialiser
            </button>
          )}
        </div>

        {/* Contrôles droite : Tri + Toggle Filtres sur mobile */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="relative flex items-center flex-1 sm:flex-initial">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
              className="w-full sm:w-auto pl-8 pr-6 py-2 bg-creme-50/70 hover:bg-creme-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="recent">Plus récentes</option>
              <option value="price-asc">Prix croissant</option>
              <option value="price-desc">Prix décroissant</option>
              <option value="popular">Les plus vues</option>
            </select>
          </div>

          <button
            onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
            className={`md:hidden flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition ${
              mobileFilterOpen || activeFilterCount > 0
                ? 'border-eco-600 bg-eco-50 text-eco-900'
                : 'border-slate-200 bg-slate-50 text-slate-700'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filtres{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</span>
          </button>
        </div>
      </div>

      {/* Grille de Filtres : 2 colonnes sur mobile, 5 sur desktop */}
      <div className={`grid grid-cols-2 md:grid-cols-5 gap-2.5 sm:gap-3 pt-3 border-t border-creme-100 ${
        mobileFilterOpen ? 'grid' : 'hidden md:grid'
      }`}>
        
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-[10px] sm:text-[11px] font-bold uppercase text-slate-400 mb-1">
            Type d'offre
          </label>
          <select
            value={filters.type}
            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
            className="w-full p-2.5 sm:p-2 bg-creme-50/50 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 outline-none"
          >
            <option value="all">Tout (Ventes & Dons)</option>
            <option value="vente">Ventes uniquement</option>
            <option value="don">Dons gratuits</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] sm:text-[11px] font-bold uppercase text-slate-400 mb-1">
            Commune
          </label>
          <select
            value={filters.commune}
            onChange={(e) => setFilters(prev => ({ ...prev, commune: e.target.value }))}
            className="w-full p-2.5 sm:p-2 bg-creme-50/50 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 outline-none"
          >
            <option value="all">Toutes</option>
            {COMMUNES_ABIDJAN.map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] sm:text-[11px] font-bold uppercase text-slate-400 mb-1">
            État
          </label>
          <select
            value={filters.condition}
            onChange={(e) => setFilters(prev => ({ ...prev, condition: e.target.value }))}
            className="w-full p-2.5 sm:p-2 bg-creme-50/50 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 outline-none"
          >
            <option value="all">Tous</option>
            {CONDITIONS.map(cond => (
              <option key={cond.id} value={cond.id}>{cond.label.split('(')[0]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] sm:text-[11px] font-bold uppercase text-slate-400 mb-1">
            Prix Min (FCFA)
          </label>
          <input
            type="number"
            min="0"
            step="1000"
            value={filters.minPrice}
            onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
            placeholder="0"
            className="w-full p-2.5 sm:p-2 bg-creme-50/50 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 outline-none"
          />
        </div>

        <div>
          <label className="block text-[10px] sm:text-[11px] font-bold uppercase text-slate-400 mb-1">
            Prix Max (FCFA)
          </label>
          <input
            type="number"
            min="0"
            step="1000"
            value={filters.maxPrice}
            onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
            placeholder="100 000"
            className="w-full p-2.5 sm:p-2 bg-creme-50/50 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 outline-none"
          />
        </div>

      </div>

    </div>
  );
}
