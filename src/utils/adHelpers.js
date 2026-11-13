/**
 * Utilitaires partagés pour les annonces : détection boost actif & tri prioritaire
 */

export function isAdBoostActive(ad) {
  if (!ad) return false;
  const expiry = ad.boost_expires_at || ad.boostExpiresAt;
  if (expiry) {
    const expTs = new Date(expiry).getTime();
    if (!Number.isNaN(expTs)) {
      return expTs > Date.now();
    }
  }
  return Boolean(ad.is_boosted || ad.isBoosted);
}

/**
 * Trie systématiquement les annonces boostées en premier, puis applique le tri secondaire (par défaut récent).
 */
export function compareAdsBoostFirst(a, b, secondaryComparator) {
  const aBoost = isAdBoostActive(a);
  const bBoost = isAdBoostActive(b);
  if (aBoost && !bBoost) return -1;
  if (!aBoost && bBoost) return 1;
  if (secondaryComparator) return secondaryComparator(a, b);
  return new Date(b.createdAt) - new Date(a.createdAt);
}

/**
 * Récupère et normalise la configuration WhatsApp du support client.
 * Configurable dynamiquement via la variable d'environnement VITE_SUPPORT_WHATSAPP.
 */
export function getSupportWhatsAppConfig() {
  const envPhone = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPPORT_WHATSAPP) || '';
  const rawPhone = String(envPhone).trim();
  const fallbackDigits = '2250700000000';
  const fallbackDisplay = '+225 07 00 00 00 00';

  if (!rawPhone) {
    return {
      cleanDigits: fallbackDigits,
      display: fallbackDisplay,
      url: `https://wa.me/${fallbackDigits}?text=${encodeURIComponent("Bonjour l'équipe Seconde Vie, j'ai une question sur la plateforme.")}`
    };
  }

  let cleanDigits = rawPhone.replace(/\D/g, '');
  if (!cleanDigits.startsWith('225') && cleanDigits.length === 10) {
    cleanDigits = `225${cleanDigits}`;
  } else if (!cleanDigits) {
    cleanDigits = fallbackDigits;
  }

  let display = rawPhone;
  if (cleanDigits.startsWith('225') && cleanDigits.length === 13) {
    const local = cleanDigits.slice(3);
    display = `+225 ${local.slice(0, 2)} ${local.slice(2, 4)} ${local.slice(4, 6)} ${local.slice(6, 8)} ${local.slice(8, 10)}`;
  }

  return {
    cleanDigits,
    display,
    url: `https://wa.me/${cleanDigits}?text=${encodeURIComponent("Bonjour l'équipe Seconde Vie, j'ai une question sur la plateforme.")}`
  };
}

