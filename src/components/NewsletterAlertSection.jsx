import React, { useState } from 'react';
import { Bell, Mail, MessageCircle, Tag, CheckCircle2, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import { useAuth } from '../context/AuthContext';
import { subscribeNewsletterStrapi } from '../services/strapi';
import { notifyAlertSubscriptionConfirmed } from '../services/notifications';

export default function NewsletterAlertSection() {
  const { categories } = useMarketplace();
  const { jwt, user } = useAuth();

  const [email, setEmail] = useState(user?.email || '');
  const [localWhatsapp, setLocalWhatsapp] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmation, setConfirmation] = useState(null);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedEmail = email.trim();
    const cleanedWaDigits = localWhatsapp.replace(/\D/g, '');
    const formattedWhatsapp = cleanedWaDigits ? `+225${cleanedWaDigits}` : '';

    if (!trimmedEmail && cleanedWaDigits.length < 8) {
      setErrorMsg('Renseignez au moins une adresse e-mail ou un numéro WhatsApp +225.');
      return;
    }

    const selectedCat = categories.find(c => c.id === categoryId);
    const categoryName = categoryId === 'all' ? 'Toutes les catégories' : (selectedCat?.name || categoryId);

    setSubmitting(true);
    try {
      const savedRes = await subscribeNewsletterStrapi(
        {
          email: trimmedEmail,
          whatsapp: formattedWhatsapp,
          categoryId,
          categoryName,
        },
        jwt
      );

      const notifRes = await notifyAlertSubscriptionConfirmed({
        email: trimmedEmail,
        whatsapp: formattedWhatsapp,
        categoryName,
      });

      setConfirmation({
        email: trimmedEmail,
        whatsapp: formattedWhatsapp,
        categoryName,
        syncedWithStrapi: savedRes.syncedWithStrapi,
        notifRes,
      });
    } catch (err) {
      setErrorMsg(err.message || "Impossible d'enregistrer votre alerte pour le moment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="py-8 sm:py-12 bg-gradient-to-br from-eco-900 via-[#0d2e18] to-slate-900 text-white overflow-x-hidden">
      <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 min-w-0">
        <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-2xl space-y-5">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-300 bg-amber-500/15 border border-amber-400/30 px-3 py-1 rounded-full">
                <Bell className="w-3.5 h-3.5 text-amber-300" />
                Alertes Bonnes Affaires &amp; Dons Gratuits
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white leading-snug">
                Ne ratez aucune bonne affaire ni aucun don gratuit à Abidjan !
              </h2>
              <p className="text-xs sm:text-sm text-eco-100/85">
                Recevez instantanément par e-mail ou WhatsApp les nouveaux articles publiés dans votre catégorie favorite.
              </p>
            </div>

            <div className="hidden md:flex w-14 h-14 rounded-2xl bg-warm-500/20 border border-warm-400/30 text-warm-300 items-center justify-center flex-shrink-0">
              <Sparkles className="w-7 h-7" />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/20 border border-red-400/40 text-red-100 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-300 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {confirmation ? (
            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-white space-y-2">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-300 flex-shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs sm:text-sm">
                  <p className="font-extrabold">
                    Alerte activée avec succès pour « {confirmation.categoryName} » !
                  </p>
                  <p className="text-emerald-100/90 text-xs">
                    Vous recevrez les nouveautés sur{' '}
                    {[confirmation.email, confirmation.whatsapp].filter(Boolean).join(' et ')}.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setConfirmation(null);
                  setLocalWhatsapp('');
                }}
                className="text-[11px] font-bold text-emerald-200 hover:text-white underline"
              >
                Ajouter une autre alerte
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 sm:gap-3">
              {/* Email */}
              <div className="lg:col-span-3 relative flex items-center min-w-0">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Votre adresse e-mail"
                  className="w-full pl-9 pr-3 py-3 bg-white rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-warm-400"
                />
              </div>

              {/* WhatsApp +225 */}
              <div className="lg:col-span-3 flex items-stretch bg-white rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-warm-400 min-w-0">
                <span className="inline-flex items-center gap-1 px-2.5 bg-slate-100 border-r border-slate-200 text-xs font-extrabold text-emerald-700 select-none flex-shrink-0">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>+225</span>
                </span>
                <input
                  type="tel"
                  value={localWhatsapp}
                  onChange={(e) => setLocalWhatsapp(e.target.value)}
                  placeholder="07 00 00 00 00"
                  className="w-full px-2.5 py-3 text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none bg-white min-w-0"
                />
              </div>

              {/* Catégorie favorite */}
              <div className="lg:col-span-3 relative flex items-center min-w-0">
                <Tag className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full pl-9 pr-3 py-3 bg-white rounded-xl text-xs sm:text-sm font-bold text-slate-800 outline-none cursor-pointer focus:ring-2 focus:ring-warm-400"
                >
                  <option value="all">Toutes les catégories</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Bouton soumission */}
              <div className="sm:col-span-2 lg:col-span-3 min-w-0">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-full min-h-[44px] px-4 py-3 bg-gradient-to-r from-warm-500 to-warm-600 hover:from-warm-600 hover:to-warm-700 text-white font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-1.5 whitespace-nowrap disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Activation...</span>
                    </>
                  ) : (
                    <span>M'alerter des nouveautés</span>
                  )}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </section>
  );
}
