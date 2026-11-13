import React, { useState, useEffect, useRef } from 'react';
import { X, FileText, Lock, ShieldCheck, CheckCircle2, Info } from 'lucide-react';
import { LEGAL_DOCUMENTS, LEGAL_TABS } from '../data/legalContent';

const ICON_MAP = {
  mentions: FileText,
  cgu: FileText,
  privacy: Lock,
  rules: ShieldCheck,
};

export default function LegalModal({ initialDoc = 'cgu', onClose }) {
  const [activeDocId, setActiveDocId] = useState(LEGAL_DOCUMENTS[initialDoc] ? initialDoc : 'cgu');
  const scrollBodyRef = useRef(null);

  useEffect(() => {
    if (LEGAL_DOCUMENTS[initialDoc]) {
      setActiveDocId(initialDoc);
    }
  }, [initialDoc]);

  useEffect(() => {
    if (scrollBodyRef.current) {
      scrollBodyRef.current.scrollTop = 0;
    }
  }, [activeDocId]);

  const doc = LEGAL_DOCUMENTS[activeDocId] || LEGAL_DOCUMENTS.cgu;
  const HeaderIcon = ICON_MAP[doc.id] || ShieldCheck;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-0 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
    >
      <div className="relative w-full h-full sm:h-auto sm:max-h-[90vh] max-w-3xl bg-white text-slate-900 rounded-none sm:rounded-3xl shadow-2xl border-0 sm:border border-creme-200 flex flex-col overflow-hidden">
        
        {/* En-tête fixe */}
        <div className="p-4 sm:px-6 sm:pt-5 sm:pb-4 border-b border-creme-200 bg-creme-50/70 flex-shrink-0 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-eco-100 text-eco-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                <HeaderIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="inline-block text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-eco-800 bg-eco-100/80 px-2.5 py-0.5 rounded-md">
                  {doc.badge}
                </span>
                <h2 id="legal-modal-title" className="text-base sm:text-xl font-black text-slate-900 mt-1 leading-snug">
                  {doc.title}
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                  {doc.subtitle}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-creme-200 text-slate-600 transition flex-shrink-0"
              aria-label="Fermer la fenêtre légale"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Onglets de navigation rapide entre les 3 documents */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-1">
            {LEGAL_TABS.map((tab) => {
              const isActive = tab.id === activeDocId;
              const TabIcon = ICON_MAP[tab.id] || FileText;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveDocId(tab.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-extrabold transition whitespace-nowrap flex-shrink-0 border ${
                    isActive
                      ? 'bg-eco-700 text-white border-eco-700 shadow-xs'
                      : 'bg-white text-slate-600 border-creme-200 hover:bg-eco-50 hover:text-eco-800'
                  }`}
                >
                  <TabIcon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Corps défilant lisible & structuré */}
        <div
          ref={scrollBodyRef}
          className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 text-slate-700"
        >
          {/* Encart synthétique d'information */}
          {doc.highlight && (
            <div className="p-4 rounded-2xl bg-eco-50/80 border border-eco-200 flex items-start gap-3">
              <Info className="w-5 h-5 text-eco-700 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-extrabold text-eco-900">
                  {doc.highlight.title}
                </p>
                <p className="text-xs sm:text-sm text-eco-900/90 leading-relaxed">
                  {doc.highlight.text}
                </p>
              </div>
            </div>
          )}

          {/* Articles & sections détaillés */}
          <div className="space-y-6">
            {doc.sections.map((section, idx) => (
              <section key={idx} className="space-y-2.5 pb-5 border-b border-creme-100 last:border-b-0 last:pb-0">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug">
                  {section.heading}
                </h3>

                {section.paragraphs?.map((paragraph, pIdx) => (
                  <p key={pIdx} className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {paragraph}
                  </p>
                ))}

                {section.bullets && section.bullets.length > 0 && (
                  <ul className="space-y-2 pt-1 pl-1">
                    {section.bullets.map((item, bIdx) => (
                      <li key={bIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
                        <CheckCircle2 className="w-4 h-4 text-eco-600 flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </div>

        {/* Pied de modale fixe */}
        <div className="p-3.5 sm:px-6 sm:py-4 border-t border-creme-200 bg-creme-50/60 flex flex-wrap items-center justify-between gap-3 flex-shrink-0 pb-safe">
          <span className="text-[11px] font-semibold text-slate-500">
            {doc.updatedAt}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 bg-eco-700 hover:bg-eco-800 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-sm transition text-center"
          >
            J'ai compris et je ferme
          </button>
        </div>

      </div>
    </div>
  );
}
