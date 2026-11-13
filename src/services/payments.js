/**
 * ==============================================================================
 * SERVICE DE PAIEMENT RÉEL MONEROO — WAVE CÔTE D'IVOIRE (+225)
 * ==============================================================================
 * - Initialisation réelle via https://api.moneroo.io/v1/payments/initialize
 *   (ou endpoint backend sécurisé si VITE_PAYMENT_BACKEND_URL est configuré).
 * - Restriction stricte : methods: ["wave_ci"] et currency: "XOF" (FCFA).
 * - Vérification stricte côté serveur / passerelle avant toute activation.
 */

import { fetchStrapiPaymentByReference, getStoredJwt } from './strapi.js';

const MONEROO_API_URL = (
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MONEROO_API_URL) ||
  'https://api.moneroo.io/v1'
).replace(/\/+$/, '');
const MONEROO_SECRET_KEY = (
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MONEROO_SECRET_KEY) ||
  ''
).trim();
const PAYMENT_BACKEND_URL = (
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PAYMENT_BACKEND_URL) ||
  ''
).trim().replace(/\/+$/, '');

export function isMonerooConfigured() {
  return Boolean(PAYMENT_BACKEND_URL || MONEROO_SECRET_KEY);
}

/**
 * Détecte si la passerelle Moneroo fonctionne avec une clé Sandbox (test)
 */
export function isMonerooSandbox() {
  return MONEROO_SECRET_KEY.startsWith('pvk_test_');
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
 * Sanitisation automatique universelle et stricte de l'objet metadata pour l'API Moneroo.
 * Moneroo impose une double contrainte stricte sur metadata :
 *  1. Chaque valeur doit être string, boolean ou integer (pas de null, undefined ou objet).
 *  2. Le tableau metadata ne peut JAMAIS contenir plus de 10 éléments.
 * 
 * Cette fonction extrait et ne conserve strictement que les 5 clés indispensables sous forme de chaînes :
 *  - type       : "boost" ou "subscription"
 *  - user_id    : identifiant de l'utilisateur
 *  - ad_id      : identifiant de l'annonce (uniquement si boost)
 *  - item_id    : identifiant de la formule (ex: "plus", "business", "boost_7d")
 *  - payment_id : identifiant de transaction ou référence Strapi
 * 
 * Elle applique une découpe explicite à 8 éléments maximum pour garantir mathématiquement
 * de ne jamais dépasser la limite de 10 fixée par Moneroo.
 */
export function sanitizeMetadata(rawMetadata = {}, fallbackRef = '') {
  if (!rawMetadata || typeof rawMetadata !== 'object') return {};

  const clean = {};

  // 1. Type d'opération : "boost" ou "subscription"
  const rawType = String(rawMetadata.type || rawMetadata.payment_type || '').toLowerCase();
  const type = rawType.includes('boost') ? 'boost' : 'subscription';
  clean.type = type;

  // 2. Identifiant de l'utilisateur
  const rawUser = rawMetadata.user_id || rawMetadata.userId || rawMetadata.actor_id;
  clean.user_id = rawUser && String(rawUser).trim() && String(rawUser).trim() !== 'null' && String(rawUser).trim() !== 'undefined'
    ? String(rawUser).trim()
    : 'guest';

  // 3. Identifiant de l'annonce ciblée (uniquement pour un boost)
  if (type === 'boost') {
    const rawAdId = rawMetadata.ad_id || rawMetadata.listing_id || rawMetadata.target_id;
    if (rawAdId && String(rawAdId).trim() && String(rawAdId).trim() !== 'null' && String(rawAdId).trim() !== 'undefined') {
      clean.ad_id = String(rawAdId).trim();
    }
  }

  // 4. Identifiant de l'item / formule d'abonnement ou de boost
  const rawItemId =
    rawMetadata.item_id ||
    (type === 'subscription'
      ? (rawMetadata.plan_id || 'plus')
      : (rawMetadata.boost_package_id || rawMetadata.boost_id || 'boost_7d'));
  if (rawItemId && String(rawItemId).trim() && String(rawItemId).trim() !== 'null' && String(rawItemId).trim() !== 'undefined') {
    clean.item_id = String(rawItemId).trim();
  }

  // 5. Identifiant de paiement / référence Strapi
  const rawPaymentId =
    rawMetadata.payment_id ||
    rawMetadata.payment_record_id ||
    rawMetadata.strapi_document_id ||
    rawMetadata.reference ||
    fallbackRef;
  if (rawPaymentId && String(rawPaymentId).trim() && String(rawPaymentId).trim() !== 'null' && String(rawPaymentId).trim() !== 'undefined') {
    clean.payment_id = String(rawPaymentId).trim();
  }

  // Sécurité explicite : garantir mathématiquement au maximum 8 clés (Moneroo limite à 10 max)
  return Object.fromEntries(Object.entries(clean).slice(0, 8));
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

  // Sanitisation universelle stricte : conservation de 5 clés maximum et découpe à 8 max
  const cleanMetadata = sanitizeMetadata(metadata, reference);

  // Détection du mode Sandbox (clé commençant par pvk_test_) vs Réel (pvk_live_)
  const isSandbox = isMonerooSandbox();

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
    metadata: cleanMetadata,
    // En Sandbox (pvk_test_), ne pas restreindre methods pour laisser s'ouvrir le simulateur Moneroo.
    // En mode réel (pvk_live_ / production), forcer strictement Wave Côte d'Ivoire.
    ...(!isSandbox ? { methods: ['wave_ci'] } : {}),
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

