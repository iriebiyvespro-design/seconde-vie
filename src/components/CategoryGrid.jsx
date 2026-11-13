import React from 'react';
import {
  Shirt,
  Footprints,
  Briefcase,
  Smartphone,
  Laptop,
  Home,
  Armchair,
  Tv,
  BookOpen,
  Baby,
  Trophy,
  Layers
} from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';

const ICON_MAP = {
  Shirt,
  Footprints,
  Briefcase,
  Smartphone,
  Laptop,
  Home,
  Armchair,
  Tv,
  BookOpen,
  Baby,
  Trophy,
  Layers
};

function normalizeSlug(str = '') {
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function CategoryGrid({ onSelectCategory }) {
  const { filters, setFilters, ads, categories } = useMarketplace();

  // Compter les annonces actives approuvées par catégorie
  const countByCategory = (cat) => {
    const catSlug = normalizeSlug(cat.id || cat.name);
    return ads.filter((a) => {
      if (a.status !== 'approved') return false;
      const adCatSlug = normalizeSlug(a.category);
      return (
        a.category === cat.id ||
        (cat.numericId && String(a.category) === String(cat.numericId)) ||
        adCatSlug === catSlug
      );
    }).length;
  };

  const handleCategoryClick = (categoryId) => {
    const nextCategory = filters.category === categoryId ? 'all' : categoryId;
    setFilters((prev) => ({ ...prev, category: nextCategory }));
    if (onSelectCategory) onSelectCategory(nextCategory);
  };

  return (
    <section id="categories" className="py-8 sm:py-12 bg-white border-b border-creme-200 overflow-x-hidden">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 min-w-0">
        
        {/* En-tête : Badge + Titre + Sous-titre */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-5 sm:mb-8">
          <div>
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-eco-700 bg-eco-50 px-2.5 py-1 rounded-md">
              NAVIGATION PAR UNIVERS
            </span>
            <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900 mt-2">
              Explorez par catégorie
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Faites glisser ou sélectionnez une catégorie d&apos;articles.
            </p>
          </div>

          {filters.category !== 'all' && (
            <button
              type="button"
              onClick={() => handleCategoryClick('all')}
              className="mt-2 sm:mt-0 text-xs font-bold text-warm-600 hover:text-warm-700 underline text-left"
            >
              Réinitialiser ({categories.find((c) => c.id === filters.category)?.name})
            </button>
          )}
        </div>

        {/* Grille des 12 univers : 6 colonnes sur ordinateur (2 rangées), scroll fluide sur mobile */}
        <div className="flex overflow-x-auto gap-3 pb-2 snap-x snap-mandatory no-scrollbar sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 sm:gap-4 sm:overflow-visible">
          {categories.map((cat) => {
            const IconComponent = ICON_MAP[cat.icon] || Layers;
            const count = countByCategory(cat);
            const isSelected = filters.category === cat.id;

            return (
              <div
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                className={`min-w-[128px] sm:min-w-0 snap-start group cursor-pointer p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 flex flex-col items-center text-center select-none flex-shrink-0 ${
                  isSelected
                    ? 'bg-eco-50 border-eco-600 ring-2 ring-eco-600/30 shadow-md sm:-translate-y-1'
                    : 'bg-creme-50/50 hover:bg-white border-creme-200 hover:border-eco-300 hover:shadow-md sm:hover:-translate-y-1'
                }`}
              >
                <div
                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-2.5 sm:mb-3 transition-colors duration-200 ${
                    isSelected
                      ? 'bg-eco-700 text-white'
                      : 'bg-white text-eco-800 shadow-xs group-hover:bg-eco-700 group-hover:text-white'
                  }`}
                >
                  <IconComponent className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>

                <h3 className="text-xs font-bold text-slate-800 group-hover:text-eco-900 line-clamp-2 sm:line-clamp-1 leading-tight">
                  {cat.name}
                </h3>

                <span className="text-[10px] sm:text-[11px] text-slate-400 mt-1 font-medium">
                  {count} {count > 1 ? 'articles' : 'article'}
                </span>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
