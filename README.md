# 🌿 SECONDE VIE
### Marketplace Communautaire d'Objets d'Occasion & Dons Solidaires en Côte d'Ivoire

> **Slogan officiel :** *« Achetez, vendez, donnez. Donnez une deuxième vie à vos objets ! »*  
> **Devise :** Franc CFA (FCFA)  
> **Marché de lancement :** Abidjan (Cocody, Yopougon, Marcory, Plateau...) avec extension progressive à toute la Côte d'Ivoire.

---

## 📖 1. Présentation du Projet

**SECONDE VIE** est une plateforme web moderne et responsable qui permet à chacun de :
- Vendre ses objets inutilisés à petit prix en **Francs CFA (FCFA)**.
- Donner gratuitement des articles dans un esprit d'entraide et de solidarité (**0 FCFA**).
- Acheter en toute confiance des produits de seconde main vérifiés et géolocalisés à Abidjan.
- Lutter activement contre le gaspillage et préserver le pouvoir d'achat des foyers ivoiriens.

---

## 🎨 2. Identité Visuelle & Charte Graphique

- **Nom officiel :** Seconde Vie
- **Palette chromatique :**
  - 🌲 **Vert Écologique** (`#15803d` / `#166534`) : Nature, durabilité, économie circulaire et seconde chance.
  - 🍊 **Orange Chaleureux** (`#ea580c` / `#f97316`) : Convivialité, dynamisme, dons solidaires et opportunités.
  - 🥛 **Crème & Ivoire** (`#fffdf7` / `#fefce8`) : Douceur visuelle, élégance et confort de lecture.
- **Typographie :** *Plus Jakarta Sans* & *Inter* pour une lisibilité irréprochable sur mobile et ordinateur.

---

## 📦 3. Les 12 Catégories Officielles

1. **Vêtements et mode** (pantalons, robes, chemises, pagnes traditionnels...)
2. **Chaussures** (baskets, sandales, souliers de ville...)
3. **Sacs et accessoires** (montres, ceintures, bijoux, sacs à main...)
4. **Téléphones et électronique** (smartphones, tablettes, écouteurs...)
5. **Informatique** (PC portables, écrans, imprimantes...)
6. **Maison et décoration** (luminaires, tableaux, tapis, vaisselle...)
7. **Meubles** (salons, lits, armoires, tables de salle à manger...)
8. **Électroménager** (réfrigérateurs, micro-ondes, mixeurs, téléviseurs...)
9. **Livres et fournitures** (romans, manuels scolaires, fournitures de bureau...)
10. **Articles pour enfants et bébés** (poussettes, berceaux, jouets d'éveil...)
11. **Sports et loisirs** (vélos, instruments de musique, fitness...)
12. **Divers** (bricolage, jardinage, accessoires divers...)

---

## ⚡ 4. Fonctionnalités Déployées

### 👥 Visiteurs
- Consultation libre des annonces sans inscription obligatoire.
- Recherche instantanée par mots-clés, titres, descriptions et quartiers.
- Filtres avancés : par Catégorie, par Type (Ventes vs Dons Gratuits), par Fourchette de Prix (FCFA), par État de l'objet (Neuf, Très bon état, Bon état, État satisfaisant), et par Commune d'Abidjan.
- Fiches détaillées avec carrousel photo, zoom, géolocalisation et conseils de sécurité.
- **Prise de contact directe par WhatsApp** avec message pré-rempli ou appel téléphonique immédiat.
- Partage d'annonces (Web Share API / Copie de lien).
- Signalement d'annonces suspectes avec motif pour examen modérateur.

### 👤 Espace Utilisateur & Membre
- Authentification fluide (Inscription, Connexion, Déconnexion).
- Gestion du profil (Nom, Téléphone, WhatsApp, Commune, Quartier, Photo).
- Formulaire de publication d'annonce professionnel :
  - Upload multiple de photos avec prévisualisation et suppression.
  - Sélection de catégorie et d'état.
  - Choix Vente (prix FCFA) ou Don Gratuit (0 FCFA).
  - Sélection précise de la commune et du quartier.
  - **Soumission automatique à l'équipe de modération**.
- Gestion de ses annonces : Modifier, Supprimer, Marquer comme "Vendu", Marquer comme "Donné", Remettre en ligne.
- Gestion de sa liste de Favoris (mise en mémoire et synchronisation).

### 🛡️ Tableau de Bord Administrateur & Financier
- **KPIs & Statistiques en temps réel** : Total annonces, annonces en attente, objets vendus, dons gratuits, signalements.
- **Modération des annonces** : Valider, refuser (avec motif) ou supprimer les annonces soumises.
- **Gestion des membres** : Consulter la liste des inscrits et bloquer/débloquer les comptes abusifs.
- **Traitement des signalements** : Examiner les motifs rapportés par la communauté et agir.
- **Indicateur d'état Supabase** : Visualisation de l'état de synchronisation cloud.

---

## 🛠️ 5. Installation & Lancement Local

```bash
# 1. Cloner ou naviguer dans le dossier du projet
cd c:\Users\PC\Desktop\GF

# 2. Installer les dépendances
npm install

# 3. Lancer le serveur de développement Vite
npm run dev
```

L'application s'ouvrira immédiatement sur `http://localhost:5173`.

---

## ☁️ 6. Connexion à Supabase, Migrations & Paiements

1. Créez un projet sur [supabase.com](https://supabase.com).
2. Exécutez dans **SQL Editor** (ou via CLI `supabase db push`) les migrations versionnées dans l'ordre exact de `supabase/migrations/` :
   - `20261111000001_core_profiles_roles_settings.sql`
   - `20261111000002_categories_listings_images_favorites.sql`
   - `20261111000003_subscriptions_plans_credits.sql`
   - `20261111000004_boosts_and_packages.sql`
   - `20261111000005_payments_cinetpay.sql`
   - `20261111000006_server_automations_and_rls.sql`
   - `20261111000007_orqex_orchestrator.sql`
3. Déployez les Edge Functions :
   - `supabase functions deploy create-payment`
   - `supabase functions deploy orqex-webhook`
   - `supabase functions deploy cinetpay-webhook`
   - `supabase functions deploy check-expirations`
4. Configurez les secrets de l'orchestrateur **Orqex (Axa Zara LLC)** côté serveur uniquement (jamais dans le frontend) :
   ```bash
   supabase secrets set ORQEX_API_KEY="votre_cle_orqex" ORQEX_WEBHOOK_SECRET="votre_secret_webhook"
   ```
   *(Optionnel en fallback : `CINETPAY_API_KEY` et `CINETPAY_SITE_ID`)*
5. Créez votre fichier `.env` frontend avec les clés publiques uniquement :
   ```env
   VITE_SUPABASE_URL=https://votre-projet.supabase.co
   VITE_SUPABASE_ANON_KEY=votre_cle_anon_publique
   ```

---

## 🔒 7. Tests de Sécurité & Vérification

Exécutez la suite de tests automatisés vérifiant les 10 scénarios de sécurité critiques (RLS, quotas, paiements, idempotence, expirations) :

```bash
node tests/security_tests.js
```

Des tests PostgreSQL natifs sont également disponibles dans `tests/security_tests.sql`.

---

## 🚀 8. Déploiement en Production

Le projet est optimisé pour être déployé en 1 clic sur :
- **Cloudflare Pages** : `npm run build`, dossier de sortie `dist`.
- **Vercel** ou **Netlify** : Détection automatique de Vite + React.

---
*Projet développé avec rigueur selon les standards Start-up & UX pour SECONDE VIE.*

