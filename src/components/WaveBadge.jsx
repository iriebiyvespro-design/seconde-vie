import React from 'react';
import { ShieldCheck } from 'lucide-react';

/**
 * Logo SVG bleu officiel Wave Côte d'Ivoire
 */
export function WaveLogo({ className = 'w-9 h-9' }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={className}
      role="img"
      aria-label="Logo Wave Côte d'Ivoire"
    >
      <defs>
        <linearGradient id="waveBlueGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1DC3FF" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="10" fill="url(#waveBlueGrad)" />
      {/* Vagues fluides stylisées Wave */}
      <path
        d="M7.5 18.5c2.6-3.2 5.4-3.2 8 0 2.6 3.2 5.4 3.2 8 0 2.6-3.2 5.4-3.2 9 0"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M7.5 25.5c2.6-3.2 5.4-3.2 8 0 2.6 3.2 5.4 3.2 8 0 2.6-3.2 5.4-3.2 9 0"
        fill="none"
        stroke="#E0F2FE"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Bloc d'affichage unique Wave Côte d'Ivoire (+225)
 * @param {{ variant?: 'card' | 'inline' }} props
 */
export default function WaveBadge({ variant = 'card' }) {
  if (variant === 'inline') {
    return (
      <div className="inline-flex items-center gap-2 min-w-0">
        <WaveLogo className="w-6 h-6 flex-shrink-0 shadow-xs rounded-md" />
        <span className="font-bold text-slate-900 text-xs truncate">
          Paiement rapide et sécurisé via Wave Côte d&apos;Ivoire (+225)
        </span>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-[#f0f9ff] via-white to-[#e0f2fe]/60 border border-[#7dd3fc] flex items-center justify-between gap-3 shadow-2xs">
      <div className="flex items-center gap-3 min-w-0">
        <WaveLogo className="w-10 h-10 flex-shrink-0 shadow-xs rounded-xl" />
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-black text-slate-900 leading-snug">
            Paiement rapide et sécurisé via Wave Côte d&apos;Ivoire (+225)
          </p>
          <p className="text-[11px] font-semibold text-[#0369a1] mt-0.5">
            Devise officielle : Franc CFA (XOF) • Validation instantanée
          </p>
        </div>
      </div>

      <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-800 text-[11px] font-extrabold whitespace-nowrap flex-shrink-0">
        <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
        Wave XOF
      </span>
    </div>
  );
}

