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
  Layers,
  ArrowRight
} from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import AdCard from './AdCard';

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

export default function CategoryGrid({ onSelectCategory, onSelectAd }) {
  const { filters, setFilters, ads, categories, loadingAds } = useMarketplace();

  const getCategoryAds = (cat) => {
    const catSlug = normalizeSlug(cat.id || cat.name);
    return ads
      .filter((a) => {
        if (a.status !== 'approved') return false;
        const adCatSlug = normalizeSlug(a.category);
        return (
          a.category === cat.id ||
          (cat.numericId && String(a.category) === String(cat.numericId)) ||
          adCatSlug === catSlug
        );
      })
      .sort((a, b) => {
        const aBoosted = a.is_boosted && (!a.boost_expires_at || new Date(a.boost_expires_at) > new Date());
        const bBoosted = b.is_boosted && (!b.boost_expires_at || new Date(b.boost_expires_at) > new Date());
        if (aBoosted && !bBoosted) return -1;
        if (!aBoosted && bBoosted) return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
  };

  const handleCategoryClick = (categoryId) => {
    const nextCategory = filters.category === categoryId ? 'all' : categoryId;
    setFilters(prev => ({ ...prev, category: nextCategory }));
    if (onSelectCategory) onSelectCategory(nextCategory);
  };

  const handleViewAllCategory = (categoryId) => {
    setFilters(prev => ({ ...prev, category: categoryId }));
    if (onSelectCategory) onSelectCategory(categoryId);
  };

  // Catégories actives contenant au moins 1 annonce approuvée
  const activeCategorySections = categories
    .map((cat) => ({
      category: cat,
      items: getCategoryAds(cat),
    }))
    .filter((entry) => entry.items.length > 0);

  return (
    <section className="py-8 sm:py-12 bg-white border-b border-creme-200 overflow-x-hidden">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 min-w-0 space-y-8 sm:space-y-10">
        
        {/* En-tête + Accès rapide par univers */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-4 sm:mb-6">
            <div>
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-eco-700 bg-eco-50 px-2.5 py-1 rounded-md">
                Navigation par univers
              </span>
              <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900 mt-2">
                Explorez par catégorie
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Parcourez directement les articles disponibles dans chaque catégorie ou filtrez en un clic.
              </p>
            </div>

            {filters.category !== 'all' && (
              <button
                type="button"
                onClick={() => handleCategoryClick('all')}
                className="mt-2 sm:mt-0 text-xs font-bold text-warm-600 hover:text-warm-700 underline text-left"
              >
                Réinitialiser ({categories.find(c => c.id === filters.category)?.name})
              </button>
            )}
          </div>

          {/* Barre compacte de raccourcis catégories */}
          <div className="flex overflow-x-auto gap-2.5 pb-2 snap-x no-scrollbar">
            {categories.map((cat) => {
              const IconComponent = ICON_MAP[cat.icon] || Layers;
              const count = getCategoryAds(cat).length;
              const isSelected = filters.category === cat.id;

              return (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat.id)}
                  className={`snap-start inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition whitespace-nowrap flex-shrink-0 ${
                    isSelected
                      ? 'bg-eco-700 text-white border-eco-700 shadow-sm'
                      : 'bg-creme-50/70 hover:bg-eco-50 text-slate-800 border-creme-200 hover:border-eco-300'
                  }`}
                >
                  <IconComponent className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-white' : 'text-eco-700'}`} />
                  <span>{cat.name}</span>
                  <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-white text-slate-500 border border-creme-200'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Rangées Vitrine par Catégorie (3 produits sur mobile, 6 produits sur ordinateur lg+) */}
        {loadingAds ? (
          <div className="space-y-8">
            {Array.from({ length: 2 }).map((_, rowIdx) => (
              <div key={rowIdx} className="space-y-4">
                <div className="h-7 w-56 bg-slate-200 rounded-lg animate-pulse" />
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
                  {Array.from({ length: 3 }).map((__, colIdx) => (
                    <div key={colIdx} className="bg-creme-50/50 rounded-2xl p-3 border border-creme-200 animate-pulse space-y-3">
                      <div className="aspect-[4/3] bg-slate-200 rounded-xl" />
                      <div className="h-3 bg-slate-200 rounded w-1/2" />
                      <div className="h-4 bg-slate-200 rounded w-4/5" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-8 sm:space-y-12">
            {activeCategorySections.map(({ category: cat, items }) => {
              const IconComponent = ICON_MAP[cat.icon] || Layers;
              const displayedAds = items.slice(0, 6);

              return (
                <div
                  key={cat.id}
                  data-category-row={cat.id}
                  className="pt-6 border-t border-creme-200/80 first:pt-0 first:border-t-0 space-y-4"
                >
                  {/* En-tête de rangée catégorie */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-eco-50 text-eco-800 border border-eco-200/80 flex items-center justify-center flex-shrink-0 shadow-2xs">
                        <IconComponent className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <h3 className="text-base sm:text-xl font-black text-slate-900 truncate">
                          {cat.name}
                        </h3>
                        <span className="inline-flex items-center text-[11px] font-bold bg-creme-100 text-slate-700 px-2.5 py-0.5 rounded-full border border-creme-300/70 whitespace-nowrap">
                          {items.length} {items.length > 1 ? 'articles' : 'article'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleViewAllCategory(cat.id)}
                      className="inline-flex items-center gap-1 text-xs sm:text-sm font-extrabold text-eco-700 hover:text-eco-800 bg-eco-50 hover:bg-eco-100 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl border border-eco-200 transition whitespace-nowrap flex-shrink-0"
                    >
                      <span>Voir tout</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Grille / Carrousel produits : 3 visibles sur mobile (< lg), 6 visibles sur ordinateur (lg+ en 3 colonnes sur 2 rangées) */}
                  <div className="flex overflow-x-auto gap-3 pb-2 snap-x no-scrollbar lg:grid lg:grid-cols-3 lg:gap-5 lg:overflow-visible">
                    {displayedAds.map((ad, idx) => (
                      <div
                        key={ad.id}
                        className={`min-w-[215px] w-[66%] sm:w-[44%] md:w-[32%] snap-start flex-shrink-0 lg:w-auto lg:min-w-0 ${
                          idx >= 3 ? 'hidden lg:block' : ''
                        }`}
                      >
                        <AdCard ad={ad} onSelectAd={onSelectAd} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </section>
  );
}
