import React from 'react';
import { Clock, RefreshCw, AlertCircle, ShieldCheck, Smartphone, Loader2 } from 'lucide-react';

const CHANNEL_LABELS = {
  WAVE_CI: 'Wave Côte d’Ivoire',
  ORANGE_MONEY_CI: 'Orange Money CI',
  MTN_CI: 'MTN Mobile Money CI',
  MOOV_CI: 'Moov Money CI',
  CARD: 'Carte Bancaire (Visa / Mastercard)',
};

export default function PendingPaymentCard({
  transactionId,
  amountFcfa,
  description,
  channel = 'WAVE_CI',
  statusFeedback = '',
  isVerifying = false,
  onVerifyStatus,
  onCancel,
}) {
  return (
    <div className="py-2 sm:py-4 max-w-lg mx-auto space-y-4">
      <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="inline-block text-[10px] font-black uppercase tracking-wider bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-md">
              Statut : En attente (pending)
            </span>
            <h3 className="text-base sm:text-lg font-black text-slate-900 mt-1">
              Paiement en attente de validation Moneroo
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Votre service ne sera activé qu'après confirmation réelle du règlement par la passerelle Moneroo / Mobile Money.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-3.5 border border-amber-200/80 space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500 font-medium">Objet :</span>
            <span className="font-bold text-slate-900 text-right">{description}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500 font-medium">Montant à régler :</span>
            <span className="font-black text-eco-900">{Number(amountFcfa).toLocaleString('fr-FR')} FCFA (XOF)</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500 font-medium flex items-center gap-1">
              <Smartphone className="w-3.5 h-3.5 text-eco-600" /> Moyen choisi :
            </span>
            <span className="font-bold text-slate-800">{CHANNEL_LABELS[channel] || channel}</span>
          </div>
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
            <span className="text-slate-500 font-medium">Référence Strapi :</span>
            <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
              {transactionId}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white/80 border border-amber-200/60 text-[11px] text-amber-950 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <span>
            La transaction a bien été enregistrée en base avec le statut <strong>pending</strong>. Ajoutez{' '}
            <code className="bg-amber-100 px-1 rounded">VITE_MONEROO_SECRET_KEY</code> (ou{' '}
            <code className="bg-amber-100 px-1 rounded">VITE_PAYMENT_BACKEND_URL</code>) dans{' '}
            <code className="bg-amber-100 px-1 rounded">.env</code> pour rediriger automatiquement vers Moneroo Checkout.
          </span>
        </div>
      </div>

      {statusFeedback && (
        <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-slate-600 flex-shrink-0" />
          <span>{statusFeedback}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <button
          type="button"
          onClick={onVerifyStatus}
          disabled={isVerifying}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-eco-700 hover:bg-eco-800 disabled:opacity-60 text-white font-extrabold text-xs rounded-xl shadow-md transition"
        >
          {isVerifying ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Vérification en cours...</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              <span>Vérifier le statut du paiement</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}

