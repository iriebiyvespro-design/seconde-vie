import React, { useState } from 'react';
import {
  X,
  Check,
  Crown,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useMarketplace } from '../context/MarketplaceContext';
import PendingPaymentCard from './PendingPaymentCard';
import WaveBadge from './WaveBadge';

export default function PricingPlansModal({ onClose, onOpenAuth }) {
  const { user } = useAuth();
  const { initiatePayment, verifyAndFinalizePayment } = useMarketplace();

  const [selectedPlan, setSelectedPlan] = useState('plus');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [pendingInfo, setPendingInfo] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [currentTransactionId, setCurrentTransactionId] = useState('');

  const currentPlanId = user?.subscription_plan_id || 'gratuit';

  const handleSubscribe = async (planId) => {
    setErrorMsg('');

    if (!user) {
      onClose();
      if (onOpenAuth) onOpenAuth();
      return;
    }

    if (planId === 'gratuit') {
      setErrorMsg('Vous êtes déjà sur la formule Gratuite standard.');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await initiatePayment({
        payment_type: 'subscription',
        plan_id: planId,
        channel: 'WAVE_CI'
      });

      setCurrentTransactionId(res.transaction_id);

      // Si Moneroo retourne une URL de paiement sécurisée : rediriger immédiatement
      if (res.mode === 'redirect' && res.checkout_url) {
        window.location.href = res.checkout_url;
        return;
      }

      // Sinon : afficher l'écran réaliste "En attente (pending)" — AUCUNE activation gratuite
      setPendingInfo(res);
    } catch (err) {
      setErrorMsg(err.message || "Erreur lors de l'initialisation du paiement Moneroo.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifyPending = async () => {
    if (!currentTransactionId) return;
    setIsVerifying(true);
    setStatusFeedback('');
    try {
      const check = await verifyAndFinalizePayment({ reference: currentTransactionId });
      if (check.verified && check.status === 'success') {
        setPendingInfo(null);
        setPaymentSuccess(true);
      } else if (check.status === 'failed') {
        setStatusFeedback('Paiement refusé ou expiré. Veuillez réessayer.');
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

  const selectedPrice = selectedPlan === 'business' ? 5000 : 2000;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-0 sm:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full h-full sm:h-auto max-w-4xl bg-white rounded-none sm:rounded-3xl shadow-2xl border-0 sm:border border-creme-200 overflow-hidden my-auto sm:max-h-[94vh] flex flex-col">
        
        {/* Header */}
        <div className="p-4 sm:px-8 border-b border-creme-200 bg-gradient-to-r from-eco-900 via-slate-900 to-eco-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-warm-500/20 text-warm-400 flex items-center justify-center">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white">
                Formules d&apos;Abonnement SECONDE VIE
              </h2>
              <p className="text-xs text-slate-300">
                Paiement rapide et sécurisé via Wave Côte d&apos;Ivoire (+225) — XOF
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps */}
        <div className="p-4 sm:p-8 overflow-y-auto space-y-6">
          
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {paymentSuccess ? (
            <div className="py-8 text-center max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <Check className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-slate-900">
                Paiement Confirmé !
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Votre abonnement a été vérifié et activé avec succès. Référence de transaction : <br />
                <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                  {currentTransactionId}
                </span>
              </p>
              <div className="p-4 rounded-2xl bg-eco-50 border border-eco-200 text-eco-900 text-xs font-semibold">
                ✓ Vos nouveaux quotas, vos crédits de boost et la confirmation (E-mail / WhatsApp) ont été déclenchés.
              </div>
              <button
                type="button"
                onClick={onClose}
                className="mt-4 px-6 py-2.5 bg-eco-700 hover:bg-eco-800 text-white font-extrabold text-xs rounded-xl shadow-md transition"
              >
                Accéder à mon espace membre
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
              {/* Grille des 3 Formules Officielles */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* 1. GRATUIT */}
                <div className={`p-5 rounded-3xl border-2 flex flex-col justify-between transition ${
                  currentPlanId === 'gratuit'
                    ? 'border-slate-400 bg-slate-50/50'
                    : 'border-creme-200 bg-white hover:border-slate-300'
                }`}>
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                      Particulier
                    </span>
                    <h3 className="text-xl font-black text-slate-900 mt-3">GRATUIT</h3>
                    <div className="mt-2 mb-4">
                      <span className="text-3xl font-black text-slate-900">0</span>
                      <span className="text-xs font-bold text-slate-500 ml-1">FCFA / mois</span>
                    </div>
                    <ul className="space-y-2 text-xs text-slate-600 mb-6">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span className="font-bold">3 annonces actives</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>Fonctionnalités de base</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>Contact direct WhatsApp</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    disabled={currentPlanId === 'gratuit'}
                    className="w-full py-2.5 rounded-xl text-xs font-extrabold border border-slate-300 text-slate-700 disabled:opacity-50"
                  >
                    {currentPlanId === 'gratuit' ? 'Formule Actuelle' : 'Gratuit'}
                  </button>
                </div>

                {/* 2. PLUS */}
                <div className={`p-5 rounded-3xl border-2 relative flex flex-col justify-between transition shadow-lg ${
                  selectedPlan === 'plus'
                    ? 'border-eco-600 bg-eco-50/30 ring-2 ring-eco-500/20'
                    : 'border-creme-200 bg-white'
                }`}>
                  <div className="absolute -top-3 right-5">
                    <span className="bg-warm-500 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs">
                      Le plus populaire
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-eco-700 bg-eco-100 px-2.5 py-1 rounded-md">
                      Vendeur Actif
                    </span>
                    <h3 className="text-xl font-black text-slate-900 mt-3">PLUS</h3>
                    <div className="mt-2 mb-4">
                      <span className="text-3xl font-black text-eco-900">2 000</span>
                      <span className="text-xs font-bold text-slate-500 ml-1">FCFA / mois</span>
                    </div>
                    <ul className="space-y-2 text-xs text-slate-700 mb-6">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-eco-600 flex-shrink-0" />
                        <span className="font-bold text-slate-900">20 annonces actives simultanées</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-eco-600 flex-shrink-0" />
                        <span className="font-bold text-warm-700">2 boosts mensuels inclus</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-eco-600 flex-shrink-0" />
                        <span>Statistiques des vues & favoris</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-eco-600 flex-shrink-0" />
                        <span>Support modération prioritaire</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    disabled={currentPlanId === 'plus' || isProcessing}
                    onClick={() => {
                      setSelectedPlan('plus');
                      handleSubscribe('plus');
                    }}
                    className={`w-full py-3 rounded-xl text-xs font-black transition ${
                      selectedPlan === 'plus'
                        ? 'bg-eco-700 hover:bg-eco-800 text-white shadow-md'
                        : 'bg-eco-50 hover:bg-eco-100 text-eco-800'
                    }`}
                  >
                    {isProcessing && selectedPlan === 'plus' ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Redirection Wave...</span>
                      </span>
                    ) : currentPlanId === 'plus' ? (
                      'Votre Formule Actuelle'
                    ) : (
                      'Choisir PLUS (2 000 FCFA)'
                    )}
                  </button>
                </div>

                {/* 3. BUSINESS */}
                <div className={`p-5 rounded-3xl border-2 flex flex-col justify-between transition ${
                  selectedPlan === 'business'
                    ? 'border-warm-600 bg-warm-50/30 ring-2 ring-warm-500/20 shadow-lg'
                    : 'border-creme-200 bg-white hover:border-warm-300'
                }`}>
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-warm-700 bg-warm-100 px-2.5 py-1 rounded-md">
                      Professionnel & Boutique
                    </span>
                    <h3 className="text-xl font-black text-slate-900 mt-3">BUSINESS</h3>
                    <div className="mt-2 mb-4">
                      <span className="text-3xl font-black text-slate-900">5 000</span>
                      <span className="text-xs font-bold text-slate-500 ml-1">FCFA / mois</span>
                    </div>
                    <ul className="space-y-2 text-xs text-slate-700 mb-6">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-warm-600 flex-shrink-0" />
                        <span className="font-bold text-slate-900">100 annonces actives simultanées</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-warm-600 flex-shrink-0" />
                        <span className="font-bold text-warm-700">5 boosts mensuels inclus</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-warm-600 flex-shrink-0" />
                        <span>Statistiques de ventes avancées</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-warm-600 flex-shrink-0" />
                        <span className="font-bold text-eco-800">Badge "Vendeur Professionnel" vérifié</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    disabled={currentPlanId === 'business' || isProcessing}
                    onClick={() => {
                      setSelectedPlan('business');
                      handleSubscribe('business');
                    }}
                    className={`w-full py-3 rounded-xl text-xs font-black transition ${
                      selectedPlan === 'business'
                        ? 'bg-warm-600 hover:bg-warm-700 text-white shadow-md'
                        : 'bg-warm-50 hover:bg-warm-100 text-warm-800'
                    }`}
                  >
                    {isProcessing && selectedPlan === 'business' ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Redirection Wave...</span>
                      </span>
                    ) : currentPlanId === 'business' ? (
                      'Votre Formule Actuelle'
                    ) : (
                      'Choisir BUSINESS (5 000 FCFA)'
                    )}
                  </button>
                </div>

              </div>

              {/* Moyen de paiement exclusif Wave Côte d'Ivoire */}
              <div className="p-4 sm:p-5 rounded-2xl bg-creme-50 border border-creme-200 space-y-3.5">
                <WaveBadge />

                <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="text-xs text-slate-600">
                    Formule sélectionnée : <strong className="text-slate-900 uppercase">{selectedPlan}</strong> ({selectedPrice.toLocaleString('fr-FR')} FCFA)
                  </div>

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleSubscribe(selectedPlan)}
                    className="px-6 py-3 bg-gradient-to-r from-[#0ea5e9] to-[#0284c7] hover:from-[#0284c7] hover:to-[#0369a1] text-white font-black text-xs rounded-xl shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Redirection Wave...</span>
                      </>
                    ) : (
                      <span>Payer via Wave ({selectedPrice.toLocaleString('fr-FR')} FCFA) →</span>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}

        </div>

      </div>
    </div>
  );
}
