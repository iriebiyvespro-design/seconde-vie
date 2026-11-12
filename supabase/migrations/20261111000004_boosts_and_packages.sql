-- ==============================================================================
-- PHASE 4 / MIGRATION 04 : Boosts Individuels & Boosts par Crédits
-- Produits : 24h (500 FCFA), 7 jours (1500 FCFA), 14 jours (2500 FCFA)
-- ==============================================================================

-- 1. TABLE DES TARIFS DE BOOST (Modifiables en Admin sans modifier le code)
CREATE TABLE IF NOT EXISTS public.boost_packages (
  id TEXT PRIMARY KEY, -- 'boost_24h', 'boost_7d', 'boost_14d'
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

-- 2. TABLE DES BOOSTS ACTIFS & HISTORIQUES (BOOSTS)
CREATE TABLE IF NOT EXISTS public.boosts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  boost_package_id TEXT REFERENCES public.boost_packages(id) NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('paid_individual', 'subscription_credit')),
  payment_id UUID, -- Requis si source = 'paid_individual'
  credit_id UUID REFERENCES public.subscription_credits(id), -- Requis si source = 'subscription_credit'
  starts_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_boosts_listing ON public.boosts(listing_id);
CREATE INDEX IF NOT EXISTS idx_boosts_status_expires ON public.boosts(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_boosts_source ON public.boosts(source);

-- 3. FONCTION UTILISATION D'UN CRÉDIT DE BOOST INCLUS DANS L'ABONNEMENT
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
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentification requise.';
  END IF;

  -- Vérifier propriété de l'annonce
  SELECT * INTO v_listing FROM public.listings WHERE id = p_listing_id;
  IF NOT FOUND OR v_listing.seller_id != v_user_id THEN
    RAISE EXCEPTION 'Annonce introuvable ou vous n''en êtes pas le propriétaire.';
  END IF;

  IF v_listing.status != 'approved' THEN
    RAISE EXCEPTION 'Seule une annonce validée et publiée peut être boostée.';
  END IF;

  -- Vérifier s'il reste des crédits actifs non expirés pour ce mois
  SELECT * INTO v_credit
  FROM public.subscription_credits
  WHERE user_id = v_user_id
    AND status = 'active'
    AND period_expires_at > now()
    AND used_credits < total_credits
  ORDER BY period_expires_at ASC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aucun crédit de boost mensuel disponible. Vous pouvez acheter un boost individuel.';
  END IF;

  SELECT * INTO v_pkg FROM public.boost_packages WHERE id = p_boost_package_id;
  IF NOT FOUND THEN
    SELECT * INTO v_pkg FROM public.boost_packages WHERE id = 'boost_7d';
  END IF;

  v_expires_at := now() + (v_pkg.duration_hours || ' hours')::INTERVAL;

  -- Décompter 1 crédit
  UPDATE public.subscription_credits
  SET used_credits = used_credits + 1
  WHERE id = v_credit.id;

  -- Créer le boost lié au crédit
  INSERT INTO public.boosts (
    listing_id, user_id, boost_package_id, source, credit_id, starts_at, expires_at, status
  ) VALUES (
    p_listing_id, v_user_id, v_pkg.id, 'subscription_credit', v_credit.id, now(), v_expires_at, 'active'
  );

  -- Marquer l'annonce comme boostée
  UPDATE public.listings
  SET is_boosted = true, boost_expires_at = v_expires_at, updated_at = now()
  WHERE id = p_listing_id;

  RETURN jsonb_build_object(
    'success', true,
    'listing_id', p_listing_id,
    'remaining_credits', v_credit.total_credits - (v_credit.used_credits + 1),
    'expires_at', v_expires_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

