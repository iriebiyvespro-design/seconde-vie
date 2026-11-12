import React from 'react';

export default function Logo({ size = "default", light = false, showTagline = false, useOfficialAsset = false }) {
  const isSmall = size === "small";
  const isLarge = size === "large";

  if (useOfficialAsset) {
    return (
      <div className="flex items-center gap-3 select-none">
        <img
          src="/logo-seconde-vie.jpg"
          alt="Seconde Vie"
          className={`object-contain rounded-xl shadow-xs ${
            isSmall ? 'h-9' : isLarge ? 'h-16' : 'h-12'
          }`}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 sm:gap-2.5 group cursor-pointer select-none min-w-0">
      {/* Emblème Vectoriel SVG : Sac shopping + Recyclage + Flèche Verte */}
      <div className={`relative flex items-center justify-center rounded-xl sm:rounded-2xl transition-transform duration-300 group-hover:scale-105 ${
        isSmall ? 'w-8 h-8 sm:w-9 sm:h-9' : isLarge ? 'w-14 h-14 sm:w-16 sm:h-16' : 'w-9 h-9 sm:w-12 sm:h-12'
      } bg-white shadow-sm border border-creme-200 p-1 flex-shrink-0`}>
        <svg viewBox="0 0 120 120" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Toit de maison orange au-dessus */}
          <path d="M48 24 L75 9 L102 24" stroke="#F97316" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M90 17 V9 H97 V21" fill="#F97316" />
          {/* Fenêtre 4 carreaux */}
          <rect x="70" y="16" width="4" height="4" fill="#F97316" />
          <rect x="76" y="16" width="4" height="4" fill="#F97316" />
          <rect x="70" y="22" width="4" height="4" fill="#F97316" />
          <rect x="76" y="22" width="4" height="4" fill="#F97316" />

          {/* Flèche circulaire verte éco */}
          <path
            d="M30 45 C15 65 20 95 48 105 C75 115 105 100 110 75"
            stroke="#166534"
            strokeWidth="9"
            strokeLinecap="round"
          />
          <polygon points="102,68 116,72 110,85" fill="#166534" />
          <polygon points="28,40 18,52 35,50" fill="#166534" />

          {/* Feuilles vertes écologiques */}
          <path d="M35 98 C25 110 40 115 48 106 C48 98 42 92 35 98 Z" fill="#22C55E" />

          {/* Sac Shopping Orange */}
          <path
            d="M40 50 L45 92 C45 95 48 98 52 98 L88 98 C92 98 95 95 95 92 L100 50 Z"
            fill="url(#bagGradient)"
          />
          {/* Poignées */}
          <path d="M55 50 C55 35 65 35 65 50" stroke="#1F2937" strokeWidth="4" strokeLinecap="round" />
          <path d="M75 50 C75 35 85 35 85 50" stroke="#1F2937" strokeWidth="4" strokeLinecap="round" />

          {/* Symbole Recyclage blanc */}
          <g transform="translate(60, 62) scale(0.42)">
            <path d="M25 5 L35 22 L28 22 C28 32 35 38 42 40 L38 46 C28 44 20 35 20 22 L13 22 Z" fill="#FFFFFF" />
            <path d="M45 45 L50 25 L44 28 C38 20 28 16 20 18 L18 11 C28 9 42 13 49 23 L55 20 Z" fill="#FFFFFF" />
            <path d="M5 40 L22 35 L19 41 C28 46 38 43 43 36 L49 40 C42 50 28 54 16 47 L13 53 Z" fill="#FFFFFF" />
          </g>

          <defs>
            <linearGradient id="bagGradient" x1="40" y1="50" x2="100" y2="98" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FB923C" />
              <stop offset="1" stopColor="#EA580C" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Typographie Seconde Vie uniquement */}
      <div className="flex flex-col justify-center min-w-0">
        <div className="flex items-center gap-1 leading-none">
          <span className={`font-black tracking-tight ${
            isSmall ? 'text-base sm:text-lg' : isLarge ? 'text-2xl sm:text-3xl' : 'text-[17px] sm:text-xl'
          } ${light ? 'text-emerald-400' : 'text-[#0e4e29]'}`}>
            Seconde
          </span>

          <span className={`font-bold font-['Caveat'] text-[#ea580c] relative -ml-0.5 ${
            isSmall ? 'text-xl sm:text-2xl' : isLarge ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'
          }`} style={{ transform: 'rotate(-4deg)' }}>
            Vie
          </span>
        </div>

        {showTagline && (
          <div className="hidden sm:flex lg:hidden xl:flex items-center gap-1 mt-0.5">
            <span className={`text-[10px] sm:text-[11px] font-extrabold tracking-tight whitespace-nowrap ${
              light ? 'text-creme-200' : 'text-[#0f5132]'
            }`}>
              Achetez • Vendez • Donnez
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
