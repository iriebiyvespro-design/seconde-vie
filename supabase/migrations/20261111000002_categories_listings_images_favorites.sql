-- ==============================================================================
-- PHASE 2 / MIGRATION 02 : Catégories, Annonces (Listings), Images, Favoris, Avis & Messagerie
-- Tables : categories, listings, listing_images, favorites, reports, conversations, reviews
-- ==============================================================================

-- 1. TABLE DES CATÉGORIES OFFICIELLES (12 Catégories)
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO public.categories (id, name, icon, description, display_order)
VALUES
  ('vetements-mode', 'Vêtements et mode', 'Shirt', 'T-shirts, chemises, pantalons, pagnes, robes', 1),
  ('chaussures', 'Chaussures', 'Footprints', 'Baskets, souliers, sandales, talons', 2),
  ('sacs-accessoires', 'Sacs et accessoires', 'Briefcase', 'Sacs à main, montres, ceintures, bijoux', 3),
  ('telephones-electronique', 'Téléphones et électronique', 'Smartphone', 'Smartphones, écouteurs, tablettes', 4),
  ('informatique', 'Informatique', 'Laptop', 'Ordinateurs portables, écrans, imprimantes', 5),
  ('maison-decoration', 'Maison et décoration', 'Home', 'Tableaux, tapis, luminaires, vaisselle', 6),
  ('meubles', 'Meubles', 'Armchair', 'Salons, tables, lits, armoires', 7),
  ('electromenager', 'Électroménager', 'Tv', 'Réfrigérateurs, micro-ondes, télévisions', 8),
  ('livres-fournitures', 'Livres et fournitures', 'BookOpen', 'Romans, manuels scolaires, fournitures', 9),
  ('articles-enfants-bebes', 'Articles pour enfants et bébés', 'Baby', 'Poussettes, jouets, vêtements bébé', 10),
  ('sports-loisirs', 'Sports et loisirs', 'Trophy', 'Vélos, fitness, guitares, jeux', 11),
  ('divers', 'Divers', 'Layers', 'Outils, jardinage, auto/moto et autres', 12)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, display_order = EXCLUDED.display_order;

-- 2. TABLE DES ANNONCES (LISTINGS)
CREATE TABLE IF NOT EXISTS public.listings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL CHECK (char_length(title) >= 3),
  description TEXT NOT NULL CHECK (char_length(description) >= 10),
  category_id TEXT REFERENCES public.categories(id) NOT NULL,
  condition TEXT NOT NULL CHECK (condition IN ('neuf', 'tres-bon-etat', 'bon-etat', 'satisfaisant')),
  type TEXT NOT NULL CHECK (type IN ('vente', 'don')),
  price NUMERIC NOT NULL DEFAULT 0 CHECK (price >= 0),
  currency TEXT NOT NULL DEFAULT 'FCFA',
  commune TEXT NOT NULL,
  quartier TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_whatsapp TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'sold', 'given', 'suspended', 'expired', 'deleted')),
  is_boosted BOOLEAN DEFAULT false,
  boost_expires_at TIMESTAMPTZ,
  views INTEGER DEFAULT 0,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  -- RÈGLE E : Pour un don gratuit, le prix doit obligatoirement être égal à zéro
  CONSTRAINT chk_don_price_zero CHECK (type != 'don' OR price = 0)
);

CREATE INDEX IF NOT EXISTS idx_listings_status ON public.listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_seller ON public.listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_listings_category ON public.listings(category_id);
CREATE INDEX IF NOT EXISTS idx_listings_boosted ON public.listings(is_boosted DESC, created_at DESC);

-- 3. TABLE DES IMAGES D'ANNONCES (LISTING_IMAGES)
CREATE TABLE IF NOT EXISTS public.listing_images (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_listing_images_listing ON public.listing_images(listing_id);

-- 4. TABLE DES FAVORIS (FAVORITES)
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, listing_id)
);

-- 5. TABLE DES SIGNALEMENTS (REPORTS)
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. TABLE DES CONVERSATIONS (MESSAGERIE INTERNE FUTURE)
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  buyer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'archived', 'blocked')),
  last_message_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(listing_id, buyer_id, seller_id)
);

-- 7. TABLE DES AVIS & ÉVALUATIONS VENDEUR (REVIEWS)
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  reviewer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(listing_id, reviewer_id)
);

