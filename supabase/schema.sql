-- ==============================================================================
-- FICHIER SQL COMPLET & UNIFIÉ : SECONDE VIE (Abidjan, Côte d'Ivoire)
-- Prêt à être exécuté en 1 clic dans Supabase > SQL Editor > New query > Run
-- Inclut : 18 Tables, Catégories, Formules, Boosts, Orchestrateur Orqex, RLS,
--          Triggers, Fonctions Idempotentes, Automations & Storage Bucket.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- PARTIE A : PROFILS, RÔLES, PARAMÈTRES & LOGS D'AUDIT
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  whatsapp TEXT,
  commune TEXT DEFAULT 'Cocody',
  quartier TEXT,
  avatar_url TEXT,
  is_blocked BOOLEAN DEFAULT false,
  is_suspended BOOLEAN DEFAULT false,
  email_verified BOOLEAN DEFAULT false,
  phone_verified BOOLEAN DEFAULT false,
  mfa_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Séparation stricte des privilèges (jamais modifiables directement par le membre)
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('visitor', 'member', 'premium', 'business', 'moderator', 'admin', 'super_admin')),
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO public.platform_settings (key, value, description)
VALUES
  ('active_payment_orchestrator', '"orqex"', 'Orchestrateur actif : orqex (Axa Zara LLC) ou cinetpay'),
  ('orqex_configured', 'false', 'Devient true lorsque ORQEX_API_KEY et ORQEX_WEBHOOK_SECRET sont définis côté serveur'),
  ('orqex_mode', '"sandbox"', 'Environnement Orqex : sandbox ou production'),
  ('orqex_supported_channels', '["WAVE_CI", "ORANGE_MONEY_CI", "MTN_CI", "MOOV_CI", "CREDIT_CARD"]', 'Canaux routés par Orqex en Côte d''Ivoire'),
  ('commission_rate', '0', 'Commission sur les ventes et dons (0% en v1)'),
  ('ad_revenue_fcfa', '0', 'Recettes publicitaires cumulées hors abonnements/boosts'),
  ('maintenance_mode', 'false', 'Mode maintenance de la plateforme')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description;

CREATE TABLE IF NOT EXISTS public.admin_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_actor ON public.admin_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON public.admin_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON public.admin_logs(created_at DESC);

-- ==============================================================================
-- PARTIE B : CATÉGORIES, ANNONCES (LISTINGS), IMAGES, FAVORIS & SOCIAL
-- ==============================================================================

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
  CONSTRAINT chk_don_price_zero CHECK (type != 'don' OR price = 0)
);

CREATE INDEX IF NOT EXISTS idx_listings_status ON public.listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_seller ON public.listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_listings_category ON public.listings(category_id);
CREATE INDEX IF NOT EXISTS idx_listings_boosted ON public.listings(is_boosted DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS public.listing_images (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_listing_images_listing ON public.listing_images(listing_id);

CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, listing_id)
);

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

-- ==============================================================================
-- PARTIE C : FORMULES D'ABONNEMENT, CRÉDITS & BOOSTS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_fcfa NUMERIC NOT NULL DEFAULT 0 CHECK (price_fcfa >= 0),
  duration_days INTEGER NOT NULL DEFAULT 30,
  active_ads_limit INTEGER NOT NULL CHECK (active_ads_limit > 0),
  monthly_boost_credits INTEGER NOT NULL DEFAULT 0 CHECK (monthly_boost_credits >= 0),
  badge_label TEXT,
  has_consultation_stats BOOLEAN DEFAULT false,
  has_advanced_stats BOOLEAN DEFAULT false,
  has_catalogue_management BOOLEAN DEFAULT false,
  description TEXT,
  features JSONB DEFAULT '[]'::JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO public.subscription_plans (id, name, price_fcfa, duration_days, active_ads_limit, monthly_boost_credits, badge_label, has_consultation_stats, has_advanced_stats, has_catalogue_management, description, features, display_order)
VALUES
  (
    'gratuit', 'GRATUIT', 0, 30, 3, 0, NULL, false, false, false,
    'Formule de base pour les particuliers.',
    '["3 annonces actives maximum", "Vente et don gratuit autorisés", "Photos et descriptions", "Gestion des annonces", "Favoris et contact vendeur"]'::JSONB, 1
  ),
  (
    'plus', 'PLUS', 2000, 30, 20, 2, 'PLUS', true, false, false,
    'Idéal pour les vendeurs réguliers à Abidjan.',
    '["20 annonces actives maximum", "2 crédits de boost par mois (non cumulables)", "Statistiques de consultation", "Badge PLUS officiel"]'::JSONB, 2
  ),
  (
    'business', 'BUSINESS', 5000, 30, 100, 5, 'PROFESSIONNEL', true, true, true,
    'Conçu pour les boutiques, commerçants et pros.',
    '["100 annonces actives maximum", "5 crédits de boost par mois (non cumulables)", "Statistiques avancées", "Badge professionnel vérifié", "Gestion de catalogue"]'::JSONB, 3
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price_fcfa = EXCLUDED.price_fcfa,
  active_ads_limit = EXCLUDED.active_ads_limit,
  monthly_boost_credits = EXCLUDED.monthly_boost_credits,
  badge_label = EXCLUDED.badge_label,
  features = EXCLUDED.features;

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  plan_id TEXT REFERENCES public.subscription_plans(id) NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  manual_renewal BOOLEAN NOT NULL DEFAULT true,
  notified_before_expiry BOOLEAN DEFAULT false,
  payment_id UUID,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status_expires ON public.subscriptions(status, expires_at);

CREATE TABLE IF NOT EXISTS public.subscription_credits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE NOT NULL,
  total_credits INTEGER NOT NULL CHECK (total_credits >= 0),
  used_credits INTEGER NOT NULL DEFAULT 0 CHECK (used_credits >= 0),
  period_starts_at TIMESTAMPTZ NOT NULL,
  period_expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT chk_credits_usage CHECK (used_credits <= total_credits)
);

CREATE INDEX IF NOT EXISTS idx_sub_credits_user_status ON public.subscription_credits(user_id, status);

CREATE TABLE IF NOT EXISTS public.boost_packages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  duration_hours INTEGER NOT NULL CHECK (duration_hours > 0),
  price_fcfa NUMERIC NOT NULL CHECK (price_fcfa > 0),
  badge_text TEXT NOT NULL DEFAULT 'Sponsorisé',
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO public.boost_packages (id, name, duration_hours, price_fcfa, badge_text, display_order)
VALUES
  ('boost_24h', 'Boost 24 heures', 24, 500, 'Sponsorisé 24h', 1),
  ('boost_7d', 'Boost 7 jours', 168, 1500, 'Sponsorisé 7j', 2),
  ('boost_14d', 'Boost 14 jours', 336, 2500, 'Sponsorisé 14j', 3)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  duration_hours = EXCLUDED.duration_hours,
  price_fcfa = EXCLUDED.price_fcfa;

CREATE TABLE IF NOT EXISTS public.boosts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  boost_package_id TEXT REFERENCES public.boost_packages(id) NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('paid_individual', 'subscription_credit')),
  payment_id UUID,
  credit_id UUID REFERENCES public.subscription_credits(id),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_boosts_listing ON public.boosts(listing_id);
CREATE INDEX IF NOT EXISTS idx_boosts_status_expires ON public.boosts(status, expires_at);

-- ==============================================================================
-- PARTIE D : PAIEMENTS ORCHESTRATEUR ORQEX (AXA ZARA LLC) & CINETPAY FALLBACK
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  transaction_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'FCFA',
  payment_provider TEXT NOT NULL DEFAULT 'orqex',
  orchestrator_session_id TEXT,
  underlying_psp TEXT,
  routing_rule TEXT DEFAULT 'auto_best_conversion',
  provider_reference TEXT UNIQUE,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('subscription', 'boost', 'ad_revenue')),
  plan_id TEXT REFERENCES public.subscription_plans(id),
  boost_package_id TEXT REFERENCES public.boost_packages(id),
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  payment_channel TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed', 'refunded')),
  gateway_fee NUMERIC DEFAULT 0 CHECK (gateway_fee >= 0),
  net_amount NUMERIC DEFAULT 0,
  client_ip TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  confirmed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_trans_id ON public.payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_orchestrator_session ON public.payments(orchestrator_session_id);

CREATE TABLE IF NOT EXISTS public.payment_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  transaction_id TEXT,
  event_type TEXT NOT NULL,
  provider_signature TEXT,
  payload JSONB NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payment_events_trans ON public.payment_events(transaction_id);

-- ==============================================================================
-- PARTIE E : FONCTIONS SÉCURISÉES (SECURITY DEFINER) & TRIGGERS
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id UUID DEFAULT auth.uid())
RETURNS TEXT AS $$
DECLARE v_role TEXT;
BEGIN
  IF p_user_id IS NULL THEN RETURN 'visitor'; END IF;
  SELECT role INTO v_role FROM public.user_roles WHERE user_id = p_user_id;
  RETURN COALESCE(v_role, 'member');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_moderator()
RETURNS BOOLEAN AS $$
BEGIN RETURN public.get_user_role(auth.uid()) IN ('moderator', 'admin', 'super_admin'); END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN RETURN public.get_user_role(auth.uid()) IN ('admin', 'super_admin'); END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN RETURN public.get_user_role(auth.uid()) = 'super_admin'; END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Blocage absolu de l'élévation de privilèges et de l'attribution de super_admin depuis le navigateur
CREATE OR REPLACE FUNCTION public.protect_user_roles_modification()
RETURNS TRIGGER AS $$
DECLARE v_jwt_role TEXT;
BEGIN
  v_jwt_role := current_setting('request.jwt.claims', true)::jsonb->>'role';

  IF NEW.role = 'super_admin' AND v_jwt_role = 'authenticated' THEN
    RAISE EXCEPTION 'Violation de sécurité : le rôle super_admin ne peut jamais être attribué depuis le navigateur.';
  END IF;

  IF auth.role() = 'service_role' OR current_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.role IN ('admin', 'moderator') AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Privilèges insuffisants : seul un Super Administrateur peut nommer un administrateur ou modérateur.';
  END IF;

  IF NOT public.is_super_admin() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Action interdite : vous ne pouvez pas modifier votre rôle.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_user_roles ON public.user_roles;
CREATE TRIGGER trg_protect_user_roles
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE PROCEDURE public.protect_user_roles_modification();

-- Protection des champs sensibles du profil utilisateur (blocage, suspension, vérification)
CREATE OR REPLACE FUNCTION public.protect_profile_security_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF public.is_admin() OR auth.role() = 'service_role' OR current_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  IF OLD.is_blocked IS DISTINCT FROM NEW.is_blocked OR OLD.is_suspended IS DISTINCT FROM NEW.is_suspended THEN
    RAISE EXCEPTION 'Action interdite : la gestion des suspensions est réservée à l''administration.';
  END IF;

  IF OLD.email_verified IS DISTINCT FROM NEW.email_verified OR OLD.phone_verified IS DISTINCT FROM NEW.phone_verified THEN
    RAISE EXCEPTION 'Action interdite : les badges de vérification sont gérés par le serveur.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_profile_security_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_security_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.protect_profile_security_fields();

-- Création automatique du profil & rôle 'member' à l'inscription Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Membre Seconde Vie'),
    COALESCE(new.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'member')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Vérification serveur du quota d'annonces actives
CREATE OR REPLACE FUNCTION public.get_user_active_quota(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_plan_id TEXT;
  v_limit INTEGER;
BEGIN
  SELECT s.plan_id INTO v_plan_id
  FROM public.subscriptions s
  WHERE s.user_id = p_user_id AND s.status = 'active' AND s.expires_at > now()
  ORDER BY s.expires_at DESC
  LIMIT 1;

  IF v_plan_id IS NULL THEN v_plan_id := 'gratuit'; END IF;
  SELECT active_ads_limit INTO v_limit FROM public.subscription_plans WHERE id = v_plan_id;
  RETURN COALESCE(v_limit, 3);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.check_active_listings_quota()
RETURNS TRIGGER AS $$
DECLARE
  v_limit INTEGER;
  v_current_active_count INTEGER;
BEGIN
  IF NEW.status NOT IN ('pending', 'approved') THEN
    RETURN NEW;
  END IF;

  v_limit := public.get_user_active_quota(NEW.seller_id);

  SELECT COUNT(*) INTO v_current_active_count
  FROM public.listings
  WHERE seller_id = NEW.seller_id
    AND status IN ('pending', 'approved')
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status NOT IN ('pending', 'approved'))) THEN
    IF v_current_active_count >= v_limit THEN
      RAISE EXCEPTION 'Quota atteint : vous avez % annonce(s) active(s) pour une limite de % selon votre formule actuelle.', v_current_active_count, v_limit;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_active_listings_quota ON public.listings;
CREATE TRIGGER trg_check_active_listings_quota
  BEFORE INSERT OR UPDATE OF status ON public.listings
  FOR EACH ROW EXECUTE PROCEDURE public.check_active_listings_quota();

-- Utilisation d'un crédit de boost mensuel
CREATE OR REPLACE FUNCTION public.use_subscription_boost_credit(
  p_listing_id UUID,
  p_boost_package_id TEXT DEFAULT 'boost_7d'
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_listing RECORD;
  v_credit RECORD;
  v_pkg RECORD;
  v_expires_at TIMESTAMPTZ;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentification requise.'; END IF;

  SELECT * INTO v_listing FROM public.listings WHERE id = p_listing_id;
  IF NOT FOUND OR v_listing.seller_id != v_user_id THEN
    RAISE EXCEPTION 'Annonce introuvable ou propriété non vérifiée.';
  END IF;

  IF v_listing.status != 'approved' THEN
    RAISE EXCEPTION 'Seule une annonce publiée peut être boostée.';
  END IF;

  SELECT * INTO v_credit
  FROM public.subscription_credits
  WHERE user_id = v_user_id AND status = 'active' AND period_expires_at > now() AND used_credits < total_credits
  ORDER BY period_expires_at ASC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aucun crédit de boost mensuel disponible.';
  END IF;

  SELECT * INTO v_pkg FROM public.boost_packages WHERE id = p_boost_package_id;
  IF NOT FOUND THEN SELECT * INTO v_pkg FROM public.boost_packages WHERE id = 'boost_7d'; END IF;

  v_expires_at := now() + (v_pkg.duration_hours || ' hours')::INTERVAL;

  UPDATE public.subscription_credits SET used_credits = used_credits + 1 WHERE id = v_credit.id;

  INSERT INTO public.boosts (listing_id, user_id, boost_package_id, source, credit_id, starts_at, expires_at, status)
  VALUES (p_listing_id, v_user_id, v_pkg.id, 'subscription_credit', v_credit.id, now(), v_expires_at, 'active');

  UPDATE public.listings SET is_boosted = true, boost_expires_at = v_expires_at, updated_at = now() WHERE id = p_listing_id;

  RETURN jsonb_build_object('success', true, 'listing_id', p_listing_id, 'expires_at', v_expires_at);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Traitement idempotent d'un paiement confirmé (Orqex / CinetPay)
CREATE OR REPLACE FUNCTION public.process_confirmed_payment(
  p_transaction_id TEXT,
  p_provider_reference TEXT,
  p_payment_channel TEXT,
  p_gateway_fee NUMERIC DEFAULT 0,
  p_underlying_psp TEXT DEFAULT 'orqex_routed'
)
RETURNS JSONB AS $$
DECLARE
  v_payment RECORD;
  v_pkg RECORD;
  v_plan RECORD;
  v_sub_id UUID;
  v_expires_at TIMESTAMPTZ;
  v_current_role TEXT;
  v_target_role TEXT;
BEGIN
  SELECT * INTO v_payment FROM public.payments WHERE transaction_id = p_transaction_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Paiement introuvable : %', p_transaction_id; END IF;

  IF v_payment.status = 'confirmed' THEN
    RETURN jsonb_build_object('success', true, 'already_confirmed', true, 'transaction_id', p_transaction_id);
  END IF;

  UPDATE public.payments
  SET status = 'confirmed', provider_reference = p_provider_reference, payment_channel = p_payment_channel,
      underlying_psp = p_underlying_psp, gateway_fee = p_gateway_fee,
      net_amount = v_payment.amount - p_gateway_fee, confirmed_at = now()
  WHERE id = v_payment.id;

  IF v_payment.payment_type = 'boost' THEN
    SELECT * INTO v_pkg FROM public.boost_packages WHERE id = v_payment.boost_package_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Package boost inconnu'; END IF;
    v_expires_at := now() + (v_pkg.duration_hours || ' hours')::INTERVAL;

    INSERT INTO public.boosts (listing_id, user_id, boost_package_id, source, payment_id, starts_at, expires_at, status)
    VALUES (v_payment.listing_id, v_payment.user_id, v_pkg.id, 'paid_individual', v_payment.id, now(), v_expires_at, 'active');

    UPDATE public.listings SET is_boosted = true, boost_expires_at = v_expires_at, updated_at = now() WHERE id = v_payment.listing_id;

    INSERT INTO public.admin_logs (actor_id, action, target_type, target_id, new_values)
    VALUES (v_payment.user_id, 'INDIVIDUAL_BOOST_PAID', 'listings', v_payment.listing_id::text, jsonb_build_object('package', v_pkg.id, 'expires_at', v_expires_at));

  ELSIF v_payment.payment_type = 'subscription' THEN
    SELECT * INTO v_plan FROM public.subscription_plans WHERE id = v_payment.plan_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Formule inconnue'; END IF;
    v_expires_at := now() + (v_plan.duration_days || ' days')::INTERVAL;

    UPDATE public.subscriptions SET status = 'expired', updated_at = now() WHERE user_id = v_payment.user_id AND status = 'active';
    UPDATE public.subscription_credits SET status = 'expired' WHERE user_id = v_payment.user_id AND status = 'active';

    INSERT INTO public.subscriptions (user_id, plan_id, starts_at, expires_at, status, manual_renewal, payment_id)
    VALUES (v_payment.user_id, v_plan.id, now(), v_expires_at, 'active', true, v_payment.id)
    RETURNING id INTO v_sub_id;

    IF v_plan.monthly_boost_credits > 0 THEN
      INSERT INTO public.subscription_credits (user_id, subscription_id, total_credits, used_credits, period_starts_at, period_expires_at, status)
      VALUES (v_payment.user_id, v_sub_id, v_plan.monthly_boost_credits, 0, now(), v_expires_at, 'active');
    END IF;

    SELECT role INTO v_current_role FROM public.user_roles WHERE user_id = v_payment.user_id;
    IF v_current_role NOT IN ('moderator', 'admin', 'super_admin') THEN
      v_target_role := CASE WHEN v_plan.id = 'business' THEN 'business' WHEN v_plan.id = 'plus' THEN 'premium' ELSE 'member' END;
      UPDATE public.user_roles SET role = v_target_role, updated_at = now() WHERE user_id = v_payment.user_id;
    END IF;

    INSERT INTO public.admin_logs (actor_id, action, target_type, target_id, new_values)
    VALUES (v_payment.user_id, 'SUBSCRIPTION_ACTIVATED', 'subscriptions', v_sub_id::text, jsonb_build_object('plan', v_plan.id, 'expires_at', v_expires_at));
  END IF;

  RETURN jsonb_build_object('success', true, 'already_confirmed', false, 'transaction_id', p_transaction_id, 'psp', p_underlying_psp);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Expiration automatique des boosts & abonnements (conserve les annonces existantes)
CREATE OR REPLACE FUNCTION public.expire_subscriptions_and_boosts()
RETURNS JSONB AS $$
DECLARE
  v_expired_boosts INTEGER := 0;
  v_expired_subs INTEGER := 0;
  v_sub RECORD;
  v_user_role TEXT;
BEGIN
  WITH exp_boosts AS (
    UPDATE public.boosts SET status = 'expired' WHERE status = 'active' AND expires_at <= now() RETURNING listing_id
  )
  SELECT COUNT(*) INTO v_expired_boosts FROM exp_boosts;

  UPDATE public.listings l
  SET is_boosted = false, boost_expires_at = NULL, updated_at = now()
  WHERE l.is_boosted = true
    AND NOT EXISTS (SELECT 1 FROM public.boosts b WHERE b.listing_id = l.id AND b.status = 'active' AND b.expires_at > now());

  FOR v_sub IN SELECT * FROM public.subscriptions WHERE status = 'active' AND expires_at <= now() LOOP
    UPDATE public.subscriptions SET status = 'expired', updated_at = now() WHERE id = v_sub.id;
    UPDATE public.subscription_credits SET status = 'expired' WHERE subscription_id = v_sub.id AND status = 'active';

    SELECT role INTO v_user_role FROM public.user_roles WHERE user_id = v_sub.user_id;
    IF v_user_role IN ('premium', 'business') THEN
      UPDATE public.user_roles SET role = 'member', updated_at = now() WHERE user_id = v_sub.user_id;
    END IF;

    v_expired_subs := v_expired_subs + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'expired_boosts', v_expired_boosts, 'expired_subscriptions', v_expired_subs);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- PARTIE F : POLITIQUES DE SÉCURITÉ RLS SUR LES 18 TABLES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boost_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Accès privé profil utilisateur" ON public.profiles;
CREATE POLICY "Accès privé profil utilisateur" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.is_admin());
DROP POLICY IF EXISTS "Modification propre profil" ON public.profiles;
CREATE POLICY "Modification propre profil" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Lecture rôle personnel ou admin" ON public.user_roles;
CREATE POLICY "Lecture rôle personnel ou admin" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS "Gestion rôles par super_admin uniquement" ON public.user_roles;
CREATE POLICY "Gestion rôles par super_admin uniquement" ON public.user_roles FOR ALL USING (public.is_super_admin() OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Lecture paramètres" ON public.platform_settings;
CREATE POLICY "Lecture paramètres" ON public.platform_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Modification paramètres par admin" ON public.platform_settings;
CREATE POLICY "Modification paramètres par admin" ON public.platform_settings FOR ALL USING (public.is_super_admin() OR public.is_admin());

DROP POLICY IF EXISTS "Lecture admin_logs par admin" ON public.admin_logs;
CREATE POLICY "Lecture admin_logs par admin" ON public.admin_logs FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS "Insertion admin_logs" ON public.admin_logs;
CREATE POLICY "Insertion admin_logs" ON public.admin_logs FOR INSERT WITH CHECK (public.is_admin() OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Lecture publique catégories" ON public.categories;
CREATE POLICY "Lecture publique catégories" ON public.categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Gestion catégories admin" ON public.categories;
CREATE POLICY "Gestion catégories admin" ON public.categories FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Lecture publique annonces approuvées" ON public.listings;
CREATE POLICY "Lecture publique annonces approuvées" ON public.listings FOR SELECT
  USING (status IN ('approved', 'sold', 'given') OR auth.uid() = seller_id OR public.is_moderator());
DROP POLICY IF EXISTS "Insertion annonce membre actif" ON public.listings;
CREATE POLICY "Insertion annonce membre actif" ON public.listings FOR INSERT
  WITH CHECK (auth.uid() = seller_id AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_blocked = true OR is_suspended = true)));
DROP POLICY IF EXISTS "Modification annonce propriétaire ou modo" ON public.listings;
CREATE POLICY "Modification annonce propriétaire ou modo" ON public.listings FOR UPDATE USING (auth.uid() = seller_id OR public.is_moderator());
DROP POLICY IF EXISTS "Suppression annonce propriétaire ou admin" ON public.listings;
CREATE POLICY "Suppression annonce propriétaire ou admin" ON public.listings FOR DELETE USING (auth.uid() = seller_id OR public.is_admin());

DROP POLICY IF EXISTS "Lecture publique images annonces" ON public.listing_images;
CREATE POLICY "Lecture publique images annonces" ON public.listing_images FOR SELECT USING (true);
DROP POLICY IF EXISTS "Gestion images par propriétaire" ON public.listing_images;
CREATE POLICY "Gestion images par propriétaire" ON public.listing_images FOR ALL
  USING (EXISTS (SELECT 1 FROM public.listings WHERE id = listing_id AND seller_id = auth.uid()) OR public.is_moderator());

DROP POLICY IF EXISTS "Gestion propres favoris" ON public.favorites;
CREATE POLICY "Gestion propres favoris" ON public.favorites FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Soumission signalement ouverte" ON public.reports;
CREATE POLICY "Soumission signalement ouverte" ON public.reports FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Lecture signalements modérateurs" ON public.reports;
CREATE POLICY "Lecture signalements modérateurs" ON public.reports FOR SELECT USING (public.is_moderator());
DROP POLICY IF EXISTS "Traitement signalements modérateurs" ON public.reports;
CREATE POLICY "Traitement signalements modérateurs" ON public.reports FOR UPDATE USING (public.is_moderator());

DROP POLICY IF EXISTS "Accès conversations participants" ON public.conversations;
CREATE POLICY "Accès conversations participants" ON public.conversations FOR ALL USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
DROP POLICY IF EXISTS "Lecture avis publique" ON public.reviews;
CREATE POLICY "Lecture avis publique" ON public.reviews FOR SELECT USING (true);
DROP POLICY IF EXISTS "Publication avis authentifiée" ON public.reviews;
CREATE POLICY "Publication avis authentifiée" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

DROP POLICY IF EXISTS "Lecture publique formules" ON public.subscription_plans;
CREATE POLICY "Lecture publique formules" ON public.subscription_plans FOR SELECT USING (true);
DROP POLICY IF EXISTS "Modification formules admin" ON public.subscription_plans;
CREATE POLICY "Modification formules admin" ON public.subscription_plans FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Lecture publique boosts tarifs" ON public.boost_packages;
CREATE POLICY "Lecture publique boosts tarifs" ON public.boost_packages FOR SELECT USING (true);
DROP POLICY IF EXISTS "Modification boosts tarifs admin" ON public.boost_packages;
CREATE POLICY "Modification boosts tarifs admin" ON public.boost_packages FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Lecture propre abonnement" ON public.subscriptions;
CREATE POLICY "Lecture propre abonnement" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS "Écriture abonnements backend uniquement" ON public.subscriptions;
CREATE POLICY "Écriture abonnements backend uniquement" ON public.subscriptions FOR ALL
  USING (auth.role() = 'service_role' OR public.is_admin()) WITH CHECK (auth.role() = 'service_role' OR public.is_admin());

DROP POLICY IF EXISTS "Lecture propres crédits" ON public.subscription_credits;
CREATE POLICY "Lecture propres crédits" ON public.subscription_credits FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS "Écriture crédits backend uniquement" ON public.subscription_credits;
CREATE POLICY "Écriture crédits backend uniquement" ON public.subscription_credits FOR ALL
  USING (auth.role() = 'service_role' OR public.is_admin()) WITH CHECK (auth.role() = 'service_role' OR public.is_admin());

DROP POLICY IF EXISTS "Lecture publique boosts actifs" ON public.boosts;
CREATE POLICY "Lecture publique boosts actifs" ON public.boosts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Gestion boosts backend uniquement" ON public.boosts;
CREATE POLICY "Gestion boosts backend uniquement" ON public.boosts FOR ALL
  USING (auth.role() = 'service_role' OR public.is_admin()) WITH CHECK (auth.role() = 'service_role' OR public.is_admin());

DROP POLICY IF EXISTS "Lecture paiements propriétaire ou admin" ON public.payments;
CREATE POLICY "Lecture paiements propriétaire ou admin" ON public.payments FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS "Écriture paiements backend uniquement" ON public.payments;
CREATE POLICY "Écriture paiements backend uniquement" ON public.payments FOR ALL
  USING (auth.role() = 'service_role' OR public.is_admin()) WITH CHECK (auth.role() = 'service_role' OR public.is_admin());

DROP POLICY IF EXISTS "Lecture payment_events admin uniquement" ON public.payment_events;
CREATE POLICY "Lecture payment_events admin uniquement" ON public.payment_events FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS "Écriture payment_events backend uniquement" ON public.payment_events;
CREATE POLICY "Écriture payment_events backend uniquement" ON public.payment_events FOR INSERT WITH CHECK (auth.role() = 'service_role' OR public.is_admin());

-- ==============================================================================
-- PARTIE G : STORAGE BUCKET POUR LES PHOTOS D'ANNONCES
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('ad-images', 'ad-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Images publiques" ON storage.objects;
CREATE POLICY "Images publiques" ON storage.objects FOR SELECT USING (bucket_id = 'ad-images');

DROP POLICY IF EXISTS "Upload images authentifié" ON storage.objects;
CREATE POLICY "Upload images authentifié" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'ad-images' AND auth.role() = 'authenticated');
