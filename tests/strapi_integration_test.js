/**
 * Test d'intégration & de normalisation Strapi v5 -> Seconde Vie
 */
import assert from 'node:assert';

// Simulation de l'environnement import.meta.env pour Node
globalThis.localStorage = {
  store: {},
  getItem(k) { return this.store[k] ?? null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; }
};

// Importer les normalisateurs (ou tester via fetch direct si Vite env absent)
console.log("=== Test Normalisation & API Strapi v5 ===");

const strapiUrl = 'http://localhost:1337/api';

// 1. Test normalisation Strapi v5 format plat & format { data: [{ id, ...attributes }] }
const sampleStrapiV5Ad = {
  id: 12,
  documentId: "abc123xyz",
  titre: "Vélo VTT Cocody",
  description: "Vélo en très bon état utilisé 3 mois.",
  prix: "45000",
  statut: "active",
  est_sponsorisee: true,
  date_expiration_boost: "2026-12-01T10:00:00Z",
  categorie: { id: 4, nom: "Sports et loisirs", icone: "Trophy" },
  photos: [{ id: 8, url: "/uploads/velo_123.jpg" }],
  createdAt: "2026-11-11T22:00:00Z"
};

const sampleStrapiV4Wrapped = {
  id: 15,
  attributes: {
    titre: "Lot Livres Scolaires",
    description: "Don gratuit pour élèves",
    prix: 0,
    statut: "active",
    est_sponsorisee: false,
    createdAt: "2026-11-11T21:00:00Z"
  }
};

// Import dynamique sans erreur vite
const fs = await import('node:fs');
const srcCode = fs.readFileSync('./src/services/strapi.js', 'utf8')
  .replace("export const STRAPI_API_URL = import.meta.env.VITE_STRAPI_API_URL || 'http://localhost:1337/api';", "export const STRAPI_API_URL = 'http://localhost:1337/api';");

fs.writeFileSync('./tests/.strapi_temp.mjs', srcCode);
const strapiMod = await import('./.strapi_temp.mjs');

const norm1 = strapiMod.normalizeStrapiAd(sampleStrapiV5Ad);
assert.strictEqual(norm1.id, "abc123xyz");
assert.strictEqual(norm1.title, "Vélo VTT Cocody");
assert.strictEqual(norm1.price, 45000);
assert.strictEqual(norm1.type, "vente");
assert.strictEqual(norm1.status, "approved");
assert.strictEqual(norm1.is_boosted, true);
assert.strictEqual(norm1.category, "sports-et-loisirs");
assert.strictEqual(norm1.images[0], "http://localhost:1337/uploads/velo_123.jpg");
console.log("✅ Normalisation Strapi v5 (format plat + média + catégorie) OK");

const norm2 = strapiMod.normalizeStrapiAd(sampleStrapiV4Wrapped);
assert.strictEqual(norm2.title, "Lot Livres Scolaires");
assert.strictEqual(norm2.price, 0);
assert.strictEqual(norm2.type, "don");
console.log("✅ Normalisation Strapi format { id, attributes } OK");

const normCat = strapiMod.normalizeStrapiCategory({ id: 2, nom: "Vêtements et mode", icone: "Shirt" });
assert.strictEqual(normCat.id, "vetements-et-mode");
assert.strictEqual(normCat.name, "Vêtements et mode");
assert.strictEqual(normCat.icon, "Shirt");
console.log("✅ Normalisation Catégorie Strapi OK");

const normUser = strapiMod.normalizeStrapiUser({
  id: 7,
  username: "awa_ci",
  email: "awa@test.ci",
  role: { id: 3, name: "Premium", type: "premium" }
});
assert.strictEqual(normUser.roleName, "Premium");
assert.strictEqual(normUser.role, "premium");
console.log("✅ Normalisation Utilisateur & Rôle BDD Strapi OK");

// Nettoyage fichier temporaire
fs.unlinkSync('./tests/.strapi_temp.mjs');

// 2. Probe HTTP sur http://localhost:1337
try {
  const health = await fetch('http://localhost:1337/_health');
  console.log(`ℹ️ Strapi _health status : ${health.status}`);
  const annoncesRes = await fetch(`${strapiUrl}/annonces?populate=*`);
  console.log(`ℹ️ Strapi GET /api/annonces?populate=* status : ${annoncesRes.status}`);
  const catsRes = await fetch(`${strapiUrl}/categories`);
  console.log(`ℹ️ Strapi GET /api/categories status : ${catsRes.status}`);
  const authRes = await fetch(`${strapiUrl}/auth/local`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'probe@test.ci', password: 'wrong' })
  });
  console.log(`ℹ️ Strapi POST /api/auth/local status : ${authRes.status}`);
} catch (err) {
  console.warn("⚠️ Erreur lors du test HTTP Strapi :", err.message);
}

