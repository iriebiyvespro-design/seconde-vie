/**
 * ==============================================================================
 * SERVICE DE PAIEMENT RÉEL MONEROO / ORQEX (Devise XOF / FCFA)
 * ==============================================================================
 * - Initialisation réelle via https://api.moneroo.io/v1/payments/initialize
 *   (ou endpoint backend sécurisé si VITE_PAYMENT_BACKEND_URL est configuré).
 * - Vérification stricte côté serveur / passerelle avant toute activation.
 */

import { fetchStrapiPaymentByReference, getStoredJwt } from './strapi';

const MONEROO_API_URL = (import.meta.env.VITE_MONEROO_API_URL || 'https://api.moneroo.io/v1').replace(/\/+$/, '');
const MONEROO_SECRET_KEY = (import.meta.env.VITE_MONEROO_SECRET_KEY || '').trim();
const PAYMENT_BACKEND_URL = (import.meta.env.VITE_PAYMENT_BACKEND_URL || '').trim().replace(/\/+$/, '');

export function isMonerooConfigured() {
  return Boolean(PAYMENT_BACKEND_URL || MONEROO_SECRET_KEY);
}

/**
 * Découpe proprement un nom complet en prénom / nom pour Moneroo
 */
function splitCustomerName(fullName = 'Membre Seconde Vie') {
  const parts = String(fullName || 'Membre Seconde Vie').trim().split(/\s+/);
  const first_name = parts[0] || 'Membre';
  const last_name = parts.slice(1).join(' ') || 'Seconde Vie';
  return { first_name, last_name };
}

/**
 * Initialise une session de paiement Moneroo en XOF (Francs CFA)
 */
export async function initializeMonerooCheckout({
  reference,
  amountXof,
  description,
  customerEmail,
  customerName,
  returnUrl,
  metadata = {},
}) {
  if (!isMonerooConfigured()) {
    return {
      configured: false,
      status: 'pending',
      checkout_url: null,
      moneroo_payment_id: null,
      reference,
    };
  }

  const { first_name, last_name } = splitCustomerName(customerName);
  const payload = {
    amount: Math.round(Number(amountXof)),
    currency: 'XOF',
    description,
    return_url: returnUrl,
    customer: {
      email: customerEmail || 'client@secondevie.ci',
      first_name,
      last_name,
    },
    metadata: {
      ...metadata,
      reference,
    },
  };

  // Préférer un endpoint backend proxy s'il est configuré (sécurité production)
  const endpoint = PAYMENT_BACKEND_URL
    ? `${PAYMENT_BACKEND_URL}/payments/initialize`
    : `${MONEROO_API_URL}/payments/initialize`;

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(!PAYMENT_BACKEND_URL && MONEROO_SECRET_KEY
      ? { Authorization: `Bearer ${MONEROO_SECRET_KEY}` }
      : {}),
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.message || `Erreur Moneroo (${response.status}) lors de l'initialisation.`);
  }

  const data = result?.data || result;
  return {
    configured: true,
    status: 'pending',
    checkout_url: data?.checkout_url || null,
    moneroo_payment_id: data?.id || null,
    reference,
  };
}

/**
 * Vérifie le statut réel d'un paiement auprès de Moneroo et/ou de Strapi.
 * Retourne strictement { status: 'success' | 'pending' | 'failed', verified: boolean }.
 */
export async function verifyMonerooTransaction({
  reference,
  monerooPaymentId = null,
  jwt = getStoredJwt(),
}) {
  // 1. Vérification directe Moneroo si un ID de session et la passerelle sont disponibles
  if (monerooPaymentId && isMonerooConfigured()) {
    try {
      const verifyUrl = PAYMENT_BACKEND_URL
        ? `${PAYMENT_BACKEND_URL}/payments/${encodeURIComponent(monerooPaymentId)}/verify`
        : `${MONEROO_API_URL}/payments/${encodeURIComponent(monerooPaymentId)}/verify`;

      const headers = {
        Accept: 'application/json',
        ...(!PAYMENT_BACKEND_URL && MONEROO_SECRET_KEY
          ? { Authorization: `Bearer ${MONEROO_SECRET_KEY}` }
          : {}),
      };

      const res = await fetch(verifyUrl, { method: 'GET', headers });
      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        const data = json?.data || json;
        const remoteStatus = String(data?.status || '').toLowerCase();
        if (remoteStatus === 'success') {
          return { status: 'success', verified: true, source: 'moneroo', monerooPaymentId };
        }
        if (['failed', 'cancelled', 'expired'].includes(remoteStatus)) {
          return { status: 'failed', verified: false, source: 'moneroo', monerooPaymentId };
        }
        return { status: 'pending', verified: false, source: 'moneroo', monerooPaymentId };
      }
    } catch (err) {
      console.warn('Vérification Moneroo indisponible, repli Strapi :', err.message);
    }
  }

  // 2. Vérification dans Strapi (/api/paiements)
  if (reference) {
    try {
      const strapiPay = await fetchStrapiPaymentByReference(reference, jwt);
      if (strapiPay) {
        if (strapiPay.status === 'confirmed') {
          return { status: 'success', verified: true, source: 'strapi', documentId: strapiPay.documentId };
        }
        if (strapiPay.status === 'failed') {
          return { status: 'failed', verified: false, source: 'strapi', documentId: strapiPay.documentId };
        }
        return { status: 'pending', verified: false, source: 'strapi', documentId: strapiPay.documentId };
      }
    } catch (err) {
      console.warn('Lecture paiement Strapi impossible :', err.message);
    }
  }

  return { status: 'pending', verified: false, source: 'none' };
}

