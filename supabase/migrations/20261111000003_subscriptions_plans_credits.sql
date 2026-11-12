-- ==============================================================================
-- PHASE 3 / MIGRATION 03 : Abonnements, Quotas & Crédits de Boost Mensuels
-- Tables : subscription_plans, subscriptions, subscription_credits
-- ==============================================================================

-- 1. TABLE DES FORMULES D'ABONNEMENT
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id TEXT PRIMARY KEY, -- 'gratuit', 'plus', 'business'
  name TEXT NOT NULL,
  price_fcfa NUMERIC NOT NULL DEFAULT 0 CHECK (price_fcfa >= 0),
  duration_days INTEGER NOT NULL DEFAULT 30,
  active_ads_limit INTEGER NOT NULL CHECK (active_ads_limit > 0),
  monthly_boost_credits INTEGER NOT NULL DEFAULT 0 CHECK (monthly_boost_credits >= 0),
  badge_label TEXT, -- NULL, 'PLUS', 'PROFESSIONNEL'
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
    'gratuit',
    'GRATUIT',
    0,
    30,
    3,
    0,
    NULL,
    false,
    false,
    false,
    'Formule de base pour les particuliers.',
    '["3 annonces actives maximum", "Vente et don gratuit autorisés", "Photos et descriptions", "Gestion des annonces", "Favoris et contact vendeur"]'::JSONB,
    1
  ),
  (
    'plus',
    'PLUS',
    2000,
    30,
    20,
    2,
    'PLUS',
    true,
    false,
    false,
    'Idéal pour les vendeurs réguliers à Abidjan.',
    '["20 annonces actives maximum", "2 crédits de boost par mois (non cumulables)", "Statistiques de consultation", "Badge PLUS officiel"]'::JSONB,
    2
  ),
  (
    'business',
    'BUSINESS',
    5000,
    30,
    100,
    5,
    'PROFESSIONNEL',
    true,
    true,
    true,
    'Conçu pour les boutiques, commerçants et pros.',
    '["100 annonces actives maximum", "5 crédits de boost par mois (non cumulables)", "Statistiques avancées", "Badge professionnel vérifié", "Gestion de catalogue"]'::JSONB,
    3
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price_fcfa = EXCLUDED.price_fcfa,
  active_ads_limit = EXCLUDED.active_ads_limit,
  monthly_boost_credits = EXCLUDED.monthly_boost_credits,
  badge_label = EXCLUDED.badge_label,
  features = EXCLUDED.features;

-- 2. TABLE DES ABONNEMENTS UTILISATEURS (SUBSCRIPTIONS)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  plan_id TEXT REFERENCES public.subscription_plans(id) NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  manual_renewal BOOLEAN NOT NULL DEFAULT true, -- Pas de renouvellement automatique en v1
  notified_before_expiry BOOLEAN DEFAULT false,
  payment_id UUID, -- Lié au paiement ayant activé cet abonnement
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status_expires ON public.subscriptions(status, expires_at);

-- 3. TABLE DES CRÉDITS DE BOOST MENSUELS (SUBSCRIPTION_CREDITS)
-- Crédits NON CUMULABLES d'un mois à l'autre, renouvelés uniquement à chaque nouvelle période payée
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

-- 4. FONCTION DE VÉRIFICATION DES QUOTAS DE PUBLICATION (CÔTÉ SERVEUR)
CREATE OR REPLACE FUNCTION public.get_user_active_quota(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_plan_id TEXT;
  v_limit INTEGER;
BEGIN
  -- Vérifier l'abonnement actif le plus élevé non expiré
  SELECT s.plan_id INTO v_plan_id
  FROM public.subscriptions s
  WHERE s.user_id = p_user_id
    AND s.status = 'active'
    AND s.expires_at > now()
  ORDER BY s.expires_at DESC
  LIMIT 1;

  IF v_plan_id IS NULL THEN
    v_plan_id := 'gratuit';
  END IF;

  SELECT active_ads_limit INTO v_limit
  FROM public.subscription_plans
  WHERE id = v_plan_id;

  RETURN COALESCE(v_limit, 3);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.check_active_listings_quota()
RETURNS TRIGGER AS $$
DECLARE
  v_limit INTEGER;
  v_current_active_count INTEGER;
BEGIN
  -- Seules les annonces en attente ou publiées consomment du quota.
  -- Vendues, données, supprimées ou expirées ne consomment plus de place active.
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
      RAISE EXCEPTION 'Quota atteint : vous avez % annonce(s) active(s) pour une limite de % selon votre formule actuelle. Régularisez vos annonces ou passez à une formule supérieure.', v_current_active_count, v_limit;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_active_listings_quota ON public.listings;
CREATE TRIGGER trg_check_active_listings_quota
  BEFORE INSERT OR UPDATE OF status ON public.listings
  FOR EACH ROW EXECUTE PROCEDURE public.check_active_listings_quota();

