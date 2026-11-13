/**
 * ==============================================================================
 * SERVICE API STRAPI v5 : SECONDE VIE
 * URL par défaut : http://localhost:1337/api (configurable via VITE_STRAPI_API_URL)
 * ==============================================================================
 */

export const STRAPI_API_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_STRAPI_API_URL) ||
  'http://localhost:1337/api';
export const STRAPI_ORIGIN = STRAPI_API_URL.replace(/\/api\/?$/, '');

export const JWT_STORAGE_KEY = 'sv_jwt';
export const USER_STORAGE_KEY = 'sv_user';

const FALLBACK_AD_IMAGE =
  'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80';

/**
 * Récupère le token JWT stocké dans localStorage
 */
export function getStoredJwt() {
  return localStorage.getItem(JWT_STORAGE_KEY);
}

/**
 * Construit les en-têtes HTTP avec authentification Bearer optionnelle
 */
function buildHeaders(jwt = getStoredJwt(), isJson = true) {
  const headers = {};
  if (isJson) {
    headers['Content-Type'] = 'application/json';
  }
  if (jwt) {
    headers['Authorization'] = `Bearer ${jwt}`;
  }
  return headers;
}

/**
 * Déballe un item Strapi v5 (plat) ou Strapi v4 (avec .attributes)
 */
function unwrapStrapiItem(item) {
  if (!item) return null;
  if (item.attributes && typeof item.attributes === 'object') {
    return {
      id: item.id,
      documentId: item.documentId || item.attributes.documentId,
      ...item.attributes,
    };
  }
  return item;
}

/**
 * Résout une URL média relative Strapi (/uploads/...) vers l'URL complète
 */
function resolveMediaUrl(url) {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return `${STRAPI_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

/**
 * Extrait un tableau d'URLs d'images depuis les formats Strapi v5 / v4 / URLs simples
 */
function extractImages(raw) {
  const allImages = [];

  // 1. Médias uploadés dans Strapi (relation photos)
  const mediaCandidate = raw.photos || raw.images || raw.photo || raw.image;
  if (mediaCandidate) {
    let list = [];
    if (Array.isArray(mediaCandidate)) {
      list = mediaCandidate;
    } else if (Array.isArray(mediaCandidate.data)) {
      list = mediaCandidate.data;
    } else if (mediaCandidate.data) {
      list = [mediaCandidate.data];
    } else if (typeof mediaCandidate === 'object' && mediaCandidate.url) {
      list = [mediaCandidate];
    } else if (typeof mediaCandidate === 'string') {
      list = [mediaCandidate];
    }

    list.forEach((m) => {
      if (typeof m === 'string') {
        allImages.push(resolveMediaUrl(m));
      } else {
        const unwrapped = unwrapStrapiItem(m);
        const url = unwrapped?.url || unwrapped?.formats?.medium?.url || unwrapped?.formats?.small?.url;
        if (url) allImages.push(resolveMediaUrl(url));
      }
    });
  }

  // 2. URLs d'images externes (photos_externes)
  if (raw.photos_externes) {
    const extList = Array.isArray(raw.photos_externes)
      ? raw.photos_externes
      : typeof raw.photos_externes === 'string'
        ? [raw.photos_externes]
        : [];
    extList.forEach((u) => {
      if (typeof u === 'string' && u.trim()) {
        allImages.push(resolveMediaUrl(u.trim()));
      }
    });
  }

  return allImages.length > 0 ? allImages : [FALLBACK_AD_IMAGE];
}

/**
 * Traduit le statut Strapi (active, vendue, donnee, expiree) vers le statut UI
 */
function mapStrapiStatusToFrontend(statut) {
  switch (statut) {
    case 'active':
    case 'approved':
      return 'approved';
    case 'vendue':
    case 'sold':
      return 'sold';
    case 'donnee':
    case 'given':
      return 'given';
    case 'expiree':
    case 'expired':
      return 'expired';
    case 'pending':
    case 'en_attente':
      return 'pending';
    case 'rejected':
    case 'refusee':
      return 'rejected';
    default:
      return 'approved';
  }
}

export function mapFrontendStatusToStrapi(status) {
  switch (status) {
    case 'approved':
      return 'active';
    case 'pending':
      return 'en_attente';
    case 'rejected':
      return 'refusee';
    case 'sold':
      return 'vendue';
    case 'given':
      return 'donnee';
    case 'expired':
      return 'expiree';
    default:
      return 'active';
  }
}

/**
 * Normalise une annonce Strapi v5 pour une compatibilité totale avec AdCard, AdDetailModal, etc.
 */
export function normalizeStrapiAd(rawItem) {
  const raw = unwrapStrapiItem(rawItem);
  if (!raw) return null;

  const price = Number(raw.prix ?? raw.price ?? 0);
  const type = raw.type || (price === 0 ? 'don' : 'vente');

  // Extraction catégorie si relation populée ou chaîne
  const rawCat = unwrapStrapiItem(raw.categorie?.data || raw.categorie || raw.category?.data || raw.category);
  const categorySlug =
    typeof rawCat === 'string'
      ? rawCat
      : rawCat?.slug ||
      (rawCat?.nom
        ? rawCat.nom
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
        : rawCat?.id
          ? String(rawCat.id)
          : 'divers');

  // Extraction vendeur si relation populée
  const rawSeller = unwrapStrapiItem(raw.auteur?.data || raw.auteur || raw.seller?.data || raw.seller || raw.user);

  return {
    id: String(raw.documentId || raw.id),
    numericId: raw.id,
    documentId: raw.documentId || String(raw.id),
    title: raw.titre || raw.title || 'Objet sans titre',
    description: raw.description || 'Aucune description fournie pour cet article.',
    category: categorySlug || 'divers',
    condition: raw.etat || raw.condition || 'bon-etat',
    type,
    price,
    currency: raw.devise || raw.currency || 'FCFA',
    commune: raw.commune || 'Abidjan',
    quartier: raw.quartier || 'Côte d\'Ivoire',
    contactName: raw.contact_nom || raw.contactName || rawSeller?.username || rawSeller?.full_name || 'Vendeur Seconde Vie',
    contactPhone: raw.contact_telephone || raw.contactPhone || rawSeller?.phone || '+2250700000000',
    contactWhatsapp: raw.contact_whatsapp || raw.contactWhatsapp || raw.contact_telephone || raw.contactPhone || rawSeller?.phone || '+2250700000000',
    images: extractImages(raw),
    status: mapStrapiStatusToFrontend(raw.statut || raw.status),
    is_boosted: Boolean(raw.est_sponsorisee ?? raw.is_boosted),
    boost_expires_at: raw.date_expiration_boost || raw.boost_expires_at || null,
    views: Number(raw.vues ?? raw.views ?? 0),
    favoritesCount: Number(raw.favoris_count ?? raw.favoritesCount ?? 0),
    createdAt: raw.createdAt || raw.publishedAt || new Date().toISOString(),
    sellerId: rawSeller?.id ? String(rawSeller.id) : raw.seller_id ? String(raw.seller_id) : 'strapi-user',
  };
}

/**
 * Normalise une catégorie Strapi v5 pour CategoryGrid et HeroBanner
 */
export function normalizeStrapiCategory(rawItem) {
  const raw = unwrapStrapiItem(rawItem);
  if (!raw) return null;

  const name = raw.nom || raw.name || 'Catégorie';
  const slug =
    raw.slug ||
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

  return {
    id: slug,
    numericId: raw.id,
    documentId: raw.documentId || String(raw.id),
    name,
    icon: raw.icone || raw.icon || 'Layers',
    description: raw.description || '',
    badgeColor: raw.badgeColor || 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
}

/**
 * Normalise un utilisateur Strapi + son rôle réel en base de données
 */
export function normalizeStrapiUser(rawUser) {
  if (!rawUser) return null;
  const roleObj = rawUser.role;
  const roleName = typeof roleObj === 'object' ? roleObj?.name : roleObj;
  const roleType = typeof roleObj === 'object' ? roleObj?.type : roleObj;

  return {
    id: String(rawUser.id),
    username: rawUser.username,
    email: rawUser.email,
    full_name: rawUser.full_name || rawUser.username || rawUser.email,
    phone: rawUser.phone || '+2250700000000',
    whatsapp: rawUser.whatsapp || rawUser.phone || '+2250700000000',
    commune: rawUser.commune || 'Cocody',
    quartier: rawUser.quartier || '',
    avatar_url: resolveMediaUrl(rawUser.avatar?.url) || '',
    role: (roleType || roleName || 'authenticated').toLowerCase(),
    roleName: roleName || 'Authenticated',
    roleType: roleType || 'authenticated',
    subscription_plan_id: rawUser.subscription_plan_id || 'gratuit',
    confirmed: rawUser.confirmed,
    blocked: Boolean(rawUser.blocked),
  };
}

/**
 * Gestionnaire d'erreurs HTTP Strapi
 */
async function handleStrapiResponse(response) {
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const serverMsg = payload?.error?.message || payload?.message || `Erreur HTTP ${response.status}`;
    const err = new Error(serverMsg);
    err.status = response.status;
    err.details = payload?.error?.details;
    throw err;
  }

  return payload;
}

// ==============================================================================
// ENDPOINTS PUBLICS & ANNONCES
// ==============================================================================

/**
 * Fetch avec délai maximal (évite de bloquer l'affichage Cloud si localhost Strapi est inaccessible)
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = 4000) {
  if (
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    /^http:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(url)
  ) {
    throw new Error('LOCALHOST_UNREACHABLE_FROM_HTTPS');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Récupère les annonces actives depuis GET /annonces?populate=*
 */
export async function fetchActiveAds() {
  const response = await fetchWithTimeout(`${STRAPI_API_URL}/annonces?populate=*`, {
    method: 'GET',
    headers: buildHeaders(null, true),
  });

  const payload = await handleStrapiResponse(response);
  const rawList = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];

  return rawList.map(normalizeStrapiAd).filter(Boolean);
}

/**
 * Récupère les catégories depuis GET /categories
 */
export async function fetchCategories() {
  const response = await fetchWithTimeout(`${STRAPI_API_URL}/categories?populate=*`, {
    method: 'GET',
    headers: buildHeaders(null, true),
  });

  const payload = await handleStrapiResponse(response);
  const rawList = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];

  return rawList.map(normalizeStrapiCategory).filter(Boolean);
}

/**
 * Upload de fichiers vers Strapi Media Library (POST /upload)
 */
export async function uploadFilesToStrapi(files, jwt = getStoredJwt()) {
  if (!files || files.length === 0) return [];
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));

  const response = await fetch(`${STRAPI_API_URL}/upload`, {
    method: 'POST',
    headers: buildHeaders(jwt, false),
    body: formData,
  });

  const uploaded = await handleStrapiResponse(response);
  return Array.isArray(uploaded) ? uploaded : [];
}

/**
 * Crée une nouvelle annonce via POST /annonces
 */
export async function createAd(adData, jwt = getStoredJwt()) {
  let uploadedMediaIds = [];

  // 1. Téléversement préalable des fichiers binaires vers POST /api/upload
  if (adData.files && adData.files.length > 0 && jwt) {
    try {
      const uploaded = await uploadFilesToStrapi(adData.files, jwt);
      uploadedMediaIds = uploaded.map((m) => m.id);
    } catch (uploadErr) {
      console.warn('Upload média Strapi ignoré :', uploadErr.message);
    }
  }

  // 2. Filtrer les URLs d'images externes (commençant par http:// ou https://)
  const externalImages = (adData.images || []).filter(
    (img) => typeof img === 'string' && (img.startsWith('http://') || img.startsWith('https://'))
  );

  const strapiPayload = {
    data: {
      titre: adData.title || adData.titre || 'Nouvel article',
      description: adData.description || '',
      prix: adData.type === 'don' || adData.nature === 'don' ? 0 : Number(adData.price || adData.prix) || 0,
      devise: 'FCFA',
      commune: adData.commune || 'Cocody',
      quartier: adData.quartier || '',
      etat: adData.condition || adData.etat || 'tres-bon-etat',
      nature: adData.type === 'don' || adData.nature === 'don' ? 'don' : 'vente',
      telephone: adData.contactPhone || adData.telephone || '',
      whatsapp: adData.contactWhatsapp || adData.whatsapp || adData.contactPhone || '',
      contact_nom: adData.contactName || adData.contact_nom || 'Membre Seconde Vie',
      statut: 'active',
      est_sponsorisee: Boolean(adData.is_boosted || adData.est_sponsorisee),
      ...(adData.boost_expires_at ? { date_expiration_boost: adData.boost_expires_at } : {}),
      ...(uploadedMediaIds.length > 0 ? { photos: uploadedMediaIds } : {}),
      ...(externalImages.length > 0 ? { photos_externes: externalImages } : {}),
      ...(adData.categoryId ? { categorie: adData.categoryId } : {}),
      ...(adData.authorId ? { auteur: adData.authorId } : {}),
    },
  };

  const response = await fetch(`${STRAPI_API_URL}/annonces`, {
    method: 'POST',
    headers: buildHeaders(jwt, true),
    body: JSON.stringify(strapiPayload),
  });

  const result = await handleStrapiResponse(response);
  const normalized = normalizeStrapiAd(result?.data || result);

  // Conserver les métadonnées locales pour retour immédiat et réactivité de l'UI
  return {
    ...normalized,
    category: adData.category || normalized.category,
    condition: adData.condition || normalized.condition,
    type: adData.type || normalized.type,
    commune: adData.commune || normalized.commune,
    quartier: adData.quartier || normalized.quartier,
    contactName: adData.contactName || normalized.contactName,
    contactPhone: adData.contactPhone || normalized.contactPhone,
    contactWhatsapp: adData.contactWhatsapp || normalized.contactWhatsapp,
    images:
      normalized.images && normalized.images[0] !== FALLBACK_AD_IMAGE
        ? normalized.images
        : adData.images && adData.images.length > 0
          ? adData.images
          : normalized.images,
  };
}

/**
 * Met à jour une annonce existante (PUT /annonces/:documentId)
 */
export async function updateAdStrapi(idOrDocId, updates, jwt = getStoredJwt()) {
  const strapiData = {};
  if (updates.title !== undefined) strapiData.titre = updates.title;
  if (updates.description !== undefined) strapiData.description = updates.description;
  if (updates.price !== undefined) strapiData.prix = Number(updates.price);
  if (updates.commune !== undefined) strapiData.commune = updates.commune;
  if (updates.quartier !== undefined) strapiData.quartier = updates.quartier;
  if (updates.condition !== undefined) strapiData.etat = updates.condition;
  if (updates.type !== undefined) strapiData.nature = updates.type;
  if (updates.contactPhone !== undefined) strapiData.telephone = updates.contactPhone;
  if (updates.contactWhatsapp !== undefined) strapiData.whatsapp = updates.contactWhatsapp;
  if (updates.contactName !== undefined) strapiData.contact_nom = updates.contactName;
  if (updates.status !== undefined) strapiData.statut = mapFrontendStatusToStrapi(updates.status);
  if (updates.is_boosted !== undefined) strapiData.est_sponsorisee = updates.is_boosted;
  if (updates.boost_expires_at !== undefined) strapiData.date_expiration_boost = updates.boost_expires_at;

  const response = await fetch(`${STRAPI_API_URL}/annonces/${idOrDocId}`, {
    method: 'PUT',
    headers: buildHeaders(jwt, true),
    body: JSON.stringify({ data: strapiData }),
  });

  const result = await handleStrapiResponse(response);
  return normalizeStrapiAd(result?.data || result);
}

/**
 * Supprime une annonce (DELETE /annonces/:documentId)
 */
export async function deleteAdStrapi(idOrDocId, jwt = getStoredJwt()) {
  const response = await fetch(`${STRAPI_API_URL}/annonces/${idOrDocId}`, {
    method: 'DELETE',
    headers: buildHeaders(jwt, true),
  });

  if (response.status === 204) return true;
  return await handleStrapiResponse(response);
}

// ==============================================================================
// AUTHENTIFICATION STRAPI v5 (/auth/local, /auth/local/register, /users/me)
// ==============================================================================

/**
 * Récupère l'utilisateur connecté et son rôle réel en base (GET /users/me?populate=role)
 */
export async function fetchCurrentUserStrapi(jwt = getStoredJwt()) {
  if (!jwt) return null;

  const response = await fetch(`${STRAPI_API_URL}/users/me?populate=role`, {
    method: 'GET',
    headers: buildHeaders(jwt, true),
  });

  const rawUser = await handleStrapiResponse(response);
  return normalizeStrapiUser(rawUser);
}

/**
 * Connexion utilisateur via POST /auth/local
 */
export async function loginStrapi(identifier, password) {
  const response = await fetch(`${STRAPI_API_URL}/auth/local`, {
    method: 'POST',
    headers: buildHeaders(null, true),
    body: JSON.stringify({ identifier, password }),
  });

  const data = await handleStrapiResponse(response);
  if (!data?.jwt) {
    throw new Error('Token JWT non reçu depuis Strapi.');
  }

  localStorage.setItem(JWT_STORAGE_KEY, data.jwt);

  // Récupérer l'utilisateur complet avec son rôle réel depuis la base
  let fullUser = null;
  try {
    fullUser = await fetchCurrentUserStrapi(data.jwt);
  } catch {
    fullUser = normalizeStrapiUser(data.user);
  }

  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(fullUser));
  return { jwt: data.jwt, user: fullUser };
}

/**
 * Inscription utilisateur via POST /auth/local/register
 */
export async function registerStrapi({ username, email, password, full_name, phone, commune, quartier }) {
  const cleanUsername = username || full_name?.trim() || email.split('@')[0];

  const response = await fetch(`${STRAPI_API_URL}/auth/local/register`, {
    method: 'POST',
    headers: buildHeaders(null, true),
    body: JSON.stringify({
      username: cleanUsername,
      email,
      password,
    }),
  });

  const data = await handleStrapiResponse(response);
  if (!data?.jwt) {
    throw new Error("Impossible d'obtenir un token JWT lors de l'inscription Strapi.");
  }

  localStorage.setItem(JWT_STORAGE_KEY, data.jwt);

  // Récupérer le rôle réel attribué par Strapi en base de données
  let fullUser = null;
  try {
    fullUser = await fetchCurrentUserStrapi(data.jwt);
  } catch {
    fullUser = normalizeStrapiUser(data.user);
  }

  // Conserver localement les coordonnées de contact ivoiriennes complémentaires si besoin
  const enrichedUser = {
    ...fullUser,
    full_name: full_name || fullUser.full_name,
    phone: phone || fullUser.phone,
    whatsapp: phone || fullUser.whatsapp,
    commune: commune || fullUser.commune,
    quartier: quartier || fullUser.quartier,
  };

  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(enrichedUser));
  return { jwt: data.jwt, user: enrichedUser };
}

/**
 * Mise à jour du profil utilisateur via PUT /users/:id
 */
export async function updateUserStrapi(userId, updates, jwt = getStoredJwt()) {
  const response = await fetch(`${STRAPI_API_URL}/users/${userId}`, {
    method: 'PUT',
    headers: buildHeaders(jwt, true),
    body: JSON.stringify(updates),
  });

  const updated = await handleStrapiResponse(response);
  return normalizeStrapiUser(updated);
}

/**
 * Demande de réinitialisation de mot de passe (POST /auth/forgot-password)
 */
export async function forgotPasswordStrapi(email) {
  const response = await fetch(`${STRAPI_API_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: buildHeaders(null, true),
    body: JSON.stringify({ email }),
  });
  return await handleStrapiResponse(response);
}

/**
 * Définition du nouveau mot de passe avec le code Strapi (POST /auth/reset-password)
 */
export async function resetPasswordStrapi({ code, password, passwordConfirmation }) {
  const response = await fetch(`${STRAPI_API_URL}/auth/reset-password`, {
    method: 'POST',
    headers: buildHeaders(null, true),
    body: JSON.stringify({ code, password, passwordConfirmation }),
  });

  const data = await handleStrapiResponse(response);
  if (data?.jwt) {
    localStorage.setItem(JWT_STORAGE_KEY, data.jwt);
    let fullUser = null;
    try {
      fullUser = await fetchCurrentUserStrapi(data.jwt);
    } catch {
      fullUser = normalizeStrapiUser(data.user);
    }
    if (fullUser) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(fullUser));
    }
    return { jwt: data.jwt, user: fullUser };
  }
  return data;
}

// ==============================================================================
// ENDPOINTS ADMINISTRATION STRAPI v5
// ==============================================================================

/**
 * Liste tous les utilisateurs inscrits avec leur rôle réel (GET /users?populate=role)
 */
export async function fetchStrapiUsers(jwt = getStoredJwt()) {
  const response = await fetch(`${STRAPI_API_URL}/users?populate=role`, {
    method: 'GET',
    headers: buildHeaders(jwt, true),
  });
  const list = await handleStrapiResponse(response);
  return Array.isArray(list) ? list.map(normalizeStrapiUser) : [];
}

/**
 * Liste les rôles Users & Permissions disponibles dans Strapi (GET /users-permissions/roles)
 */
export async function fetchStrapiRoles(jwt = getStoredJwt()) {
  const response = await fetch(`${STRAPI_API_URL}/users-permissions/roles`, {
    method: 'GET',
    headers: buildHeaders(jwt, true),
  });
  const payload = await handleStrapiResponse(response);
  return payload?.roles || [];
}

/**
 * Normalise un paiement Strapi v5 (paiements)
 */
export function normalizeStrapiPayment(rawItem) {
  const raw = unwrapStrapiItem(rawItem);
  if (!raw) return null;

  const statusMap = {
    successful: 'confirmed',
    confirmed: 'confirmed',
    pending: 'pending',
    failed: 'failed',
    refunded: 'refunded',
  };

  const amount = Number(raw.montant ?? raw.amount ?? 0);
  const fee = Math.round(amount * 0.015);

  return {
    id: String(raw.documentId || raw.id),
    documentId: raw.documentId || String(raw.id),
    transaction_id: raw.reference || raw.transaction_id || `STRAPI-${raw.id}`,
    user_id: raw.user?.id ? String(raw.user.id) : 'strapi-user',
    user_name: raw.user?.username || raw.user?.email || 'Membre Strapi',
    amount,
    currency: 'FCFA',
    payment_provider: raw.passerelle || raw.payment_provider || 'orqex',
    payment_channel: raw.canal || 'ORQEX_ROUTED',
    payment_type: raw.type_achat?.toLowerCase().includes('boost') ? 'boost' : 'subscription',
    plan_id: raw.type_achat || 'plus',
    status: statusMap[raw.statut || raw.status] || 'pending',
    gateway_fee: fee,
    net_amount: amount - fee,
    created_at: raw.createdAt || new Date().toISOString(),
  };
}

/**
 * Liste les paiements depuis Strapi (GET /paiements?populate=*)
 */
export async function fetchStrapiPayments(jwt = getStoredJwt()) {
  const response = await fetch(`${STRAPI_API_URL}/paiements?populate=*`, {
    method: 'GET',
    headers: buildHeaders(jwt, true),
  });
  const payload = await handleStrapiResponse(response);
  const list = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
  return list.map(normalizeStrapiPayment).filter(Boolean);
}

/**
 * Liste les abonnements depuis Strapi (GET /abonnements?populate=*)
 */
export async function fetchStrapiSubscriptions(jwt = getStoredJwt()) {
  const response = await fetch(`${STRAPI_API_URL}/abonnements?populate=*`, {
    method: 'GET',
    headers: buildHeaders(jwt, true),
  });
  const payload = await handleStrapiResponse(response);
  const list = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
  return list.map(unwrapStrapiItem).filter(Boolean);
}

/**
 * Crée une catégorie dans Strapi (POST /categories)
 */
export async function createCategoryStrapi({ nom, icone = 'Layers' }, jwt = getStoredJwt()) {
  const response = await fetch(`${STRAPI_API_URL}/categories`, {
    method: 'POST',
    headers: buildHeaders(jwt, true),
    body: JSON.stringify({ data: { nom, icone } }),
  });
  const result = await handleStrapiResponse(response);
  return normalizeStrapiCategory(result?.data || result);
}

/**
 * Supprime une catégorie dans Strapi (DELETE /categories/:documentId)
 */
export async function deleteCategoryStrapi(idOrDocId, jwt = getStoredJwt()) {
  const response = await fetch(`${STRAPI_API_URL}/categories/${idOrDocId}`, {
    method: 'DELETE',
    headers: buildHeaders(jwt, true),
  });
  if (response.status === 204) return true;
  return await handleStrapiResponse(response);
}

/**
 * Enregistre une transaction en base Strapi (POST /paiements) avec statut 'pending' initial
 */
export async function createStrapiPayment(
  { reference, montant, passerelle = 'moneroo', statut = 'pending', type_achat },
  jwt = getStoredJwt()
) {
  const response = await fetch(`${STRAPI_API_URL}/paiements`, {
    method: 'POST',
    headers: buildHeaders(jwt, true),
    body: JSON.stringify({
      data: {
        reference,
        montant: Number(montant),
        passerelle,
        statut,
        type_achat,
      },
    }),
  });
  const result = await handleStrapiResponse(response);
  return normalizeStrapiPayment(result?.data || result);
}

/**
 * Recherche un paiement Strapi par référence (GET /paiements?filters[reference][$eq]=...)
 */
export async function fetchStrapiPaymentByReference(reference, jwt = getStoredJwt()) {
  const response = await fetch(
    `${STRAPI_API_URL}/paiements?filters[reference][$eq]=${encodeURIComponent(reference)}&populate=*`,
    {
      method: 'GET',
      headers: buildHeaders(jwt, true),
    }
  );
  const payload = await handleStrapiResponse(response);
  const list = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
  return list.length > 0 ? normalizeStrapiPayment(list[0]) : null;
}

/**
 * Met à jour le statut d'un paiement dans Strapi (PUT /paiements/:documentId)
 */
export async function updateStrapiPaymentStatus(idOrDocId, statut, jwt = getStoredJwt()) {
  const response = await fetch(`${STRAPI_API_URL}/paiements/${idOrDocId}`, {
    method: 'PUT',
    headers: buildHeaders(jwt, true),
    body: JSON.stringify({ data: { statut } }),
  });
  const result = await handleStrapiResponse(response);
  return normalizeStrapiPayment(result?.data || result);
}

/**
 * Enregistre une inscription aux alertes nouveautés dans Strapi (POST /alertes)
 * avec repli local propre si Strapi est hors ligne ou le content-type pas encore créé.
 */
export async function subscribeNewsletterStrapi({ email, whatsapp, categoryId, categoryName }, jwt = getStoredJwt()) {
  const payload = {
    email: email || null,
    whatsapp: whatsapp || null,
    categorie: categoryName || categoryId || 'Toutes les catégories',
    categorie_slug: categoryId || 'all',
    created_at: new Date().toISOString(),
  };

  try {
    const response = await fetchWithTimeout(`${STRAPI_API_URL}/alertes`, {
      method: 'POST',
      headers: buildHeaders(jwt, true),
      body: JSON.stringify({ data: payload }),
    });
    const res = await handleStrapiResponse(response);
    return { syncedWithStrapi: true, data: res?.data || res || payload };
  } catch (err) {
    // Repli local pour ne jamais bloquer le visiteur (mode Cloud / Strapi sans table alertes)
    try {
      const existing = JSON.parse(localStorage.getItem('sv_alert_subscriptions') || '[]');
      localStorage.setItem('sv_alert_subscriptions', JSON.stringify([payload, ...existing]));
    } catch {}
    return { syncedWithStrapi: false, data: payload, fallbackReason: err.message };
  }
}


