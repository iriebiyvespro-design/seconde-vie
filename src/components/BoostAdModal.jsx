import React, { useState } from 'react';
import {
  X,
  Zap,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import PendingPaymentCard from './PendingPaymentCard';
import WaveBadge from './WaveBadge';

export default function BoostAdModal({ ad, onClose, onSuccess }) {
  if (!ad) return null;

  const {
    boostPackages,
    initiatePayment,
    verifyAndFinalizePayment,
    getUserRemainingCredits,
    useBoostCreditOnAd
  } = useMarketplace();
  const remainingCredits = getUserRemainingCredits();

  const [selectedPkg, setSelectedPkg] = useState('boost_7d');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [pendingInfo, setPendingInfo] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState('');
  const [success, setSuccess] = useState(false);

  const packages = boostPackages || [
    { id: 'boost_24h', name: 'Boost 24 heures', duration_hours: 24, price_fcfa: 500, badge: 'Sponsorisé 24h' },
    { id: 'boost_7d', name: 'Boost 7 jours', duration_hours: 168, price_fcfa: 1500, badge: 'Sponsorisé 7j', popular: true },
    { id: 'boost_14d', name: 'Boost 14 jours', duration_hours: 336, price_fcfa: 2500, badge: 'Sponsorisé 14j' }
  ];

  const currentSelectedObj = packages.find(p => p.id === selectedPkg) || packages[1];

  const handleUseCredit = async () => {
    setErrorMsg('');
    try {
      await useBoostCreditOnAd(ad.id, selectedPkg);
      setSuccess(true);
      if (onSuccess) onSuccess();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleConfirmBoost = async () => {
    setErrorMsg('');
    setIsProcessing(true);
    try {
      const res = await initiatePayment({
        payment_type: 'boost',
        boost_package_id: selectedPkg,
        ad_id: ad.id,
        channel: 'WAVE_CI'
      });

      if (res.mode === 'redirect' && res.checkout_url) {
        window.location.href = res.checkout_url;
        return;
      }

      // Afficher la fenêtre en attente tant que Moneroo / le PSP n'a pas confirmé
      setPendingInfo(res);
    } catch (err) {
      setErrorMsg(err.message || "Erreur lors de l'initialisation du paiement.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifyPending = async () => {
    if (!pendingInfo?.transaction_id) return;
    setIsVerifying(true);
    setStatusFeedback('');
    try {
      const check = await verifyAndFinalizePayment({ reference: pendingInfo.transaction_id });
      if (check.verified && check.status === 'success') {
        setPendingInfo(null);
        setSuccess(true);
        if (onSuccess) onSuccess();
      } else if (check.status === 'failed') {
        setStatusFeedback('Paiement échoué ou expiré.');
      } else {
        setStatusFeedback(
          check.message ||
            'Statut toujours en attente (pending) : aucun règlement confirmé reçu pour le moment.'
        );
      }
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full h-full sm:h-auto max-w-lg bg-white rounded-none sm:rounded-3xl shadow-2xl border-0 sm:border border-creme-200 overflow-hidden my-auto sm:max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="p-4 sm:px-6 border-b border-creme-200 bg-gradient-to-r from-warm-600 to-warm-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/20 text-white shadow-xs">
              <Zap className="w-5 h-5 fill-white" />
            </div>
            <div>
              <h3 className="text-base font-black">
                Booster la visibilité de l&apos;annonce
              </h3>
              <p className="text-[11px] text-warm-100">
                Paiement rapide et sécurisé via Wave Côte d&apos;Ivoire (+225)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {success ? (
            <div className="py-6 text-center space-y-3">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h4 className="text-xl font-black text-slate-900">
                Boost Activé avec Succès !
              </h4>
              <p className="text-xs text-slate-600">
                Votre annonce <strong>"{ad.title}"</strong> est désormais affichée en priorité en tête des résultats avec le badge officiel <strong>⭐ Sponsorisé</strong>.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 px-5 py-2.5 bg-eco-700 hover:bg-eco-800 text-white font-black text-xs rounded-xl shadow-md"
              >
                Fermer
              </button>
            </div>
          ) : pendingInfo ? (
            <PendingPaymentCard
              transactionId={pendingInfo.transaction_id}
              amountFcfa={pendingInfo.amount}
              description={pendingInfo.description}
              checkoutUrl={pendingInfo.checkout_url}
              statusFeedback={statusFeedback}
              isVerifying={isVerifying}
              onVerifyStatus={handleVerifyPending}
              onCancel={onClose}
            />
          ) : (
            <>
              {/* Rappel annonce ciblée */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <img
                  src={ad.images?.[0] || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&auto=format&fit=crop&q=80'}
                  alt={ad.title}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&auto=format&fit=crop&q=80';
                  }}
                  className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-slate-900 truncate">{ad.title}</h4>
                  <p className="text-[11px] font-semibold text-eco-800">
                    {ad.type === 'don' ? 'DON GRATUIT' : `${Number(ad.price).toLocaleString('fr-FR')} FCFA`} • {ad.commune}
                  </p>
                </div>
              </div>

              {/* Bloc Crédits d'Abonnement si disponibles */}
              {remainingCredits > 0 && (
                <div className="p-4 rounded-2xl bg-eco-50 border-2 border-eco-500 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-black uppercase bg-eco-700 text-white px-2 py-0.5 rounded">
                      Avantage Abonné
                    </span>
                    <p className="text-xs font-extrabold text-eco-950 mt-1">
                      Vous disposez de {remainingCredits} crédit(s) de boost ce mois-ci
                    </p>
                    <p className="text-[10px] text-eco-700">Non cumulables d'un mois à l'autre</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleUseCredit}
                    className="px-3.5 py-2 bg-eco-700 hover:bg-eco-800 text-white font-black text-xs rounded-xl shadow-sm whitespace-nowrap"
                  >
                    Utiliser 1 crédit
                  </button>
                </div>
              )}

              {/* Choix des 3 Formules de Boost Individuels */}
              <div className="space-y-2.5">
                <label className="block text-xs font-black uppercase text-slate-400">
                  Ou achetez un boost individuel (conservé même après expiration d'abonnement) :
                </label>

                <div className="grid grid-cols-1 gap-2.5">
                  {packages.map(pkg => (
                    <div
                      key={pkg.id}
                      onClick={() => setSelectedPkg(pkg.id)}
                      className={`p-3.5 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition ${
                        selectedPkg === pkg.id
                          ? 'border-warm-500 bg-warm-50/50 ring-2 ring-warm-500/20 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                          selectedPkg === pkg.id ? 'bg-warm-500 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-slate-900">{pkg.name}</span>
                            {pkg.popular && (
                              <span className="text-[9px] font-black uppercase bg-warm-100 text-warm-800 px-1.5 py-0.5 rounded">
                                Recommandé
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            Badge "{pkg.badge || 'Sponsorisé'}" en tête de liste
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-base font-black text-slate-900">
                          {Number(pkg.price_fcfa).toLocaleString('fr-FR')}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 block -mt-1">FCFA</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Moyen de paiement exclusif Wave Côte d'Ivoire */}
              <WaveBadge />

              {/* Bouton de confirmation */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">
                  Total : <strong className="text-slate-900 font-extrabold">{Number(currentSelectedObj.price_fcfa).toLocaleString('fr-FR')} FCFA</strong>
                </span>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleConfirmBoost}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#0ea5e9] to-[#0284c7] hover:from-[#0284c7] hover:to-[#0369a1] text-white font-black text-xs rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Redirection Wave...</span>
                    </>
                  ) : (
                    <span>Payer via Wave ({Number(currentSelectedObj.price_fcfa).toLocaleString('fr-FR')} FCFA) →</span>
                  )}
                </button>
              </div>
            </>
          )}

        </div>

      </div>
    </div>
  );
}
