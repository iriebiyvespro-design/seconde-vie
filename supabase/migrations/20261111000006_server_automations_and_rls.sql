-- ==============================================================================
-- PHASE 6 / MIGRATION 06 : Automations Serveur, Idempotence & RLS Intégrale
-- Couvre toutes les 17 tables avec séparation stricte des privilèges
-- ==============================================================================

-- 1. TRAITEMENT IDEMPOTENT D'UN PAIEMENT CONFIRMÉ (CINETPAY)
CREATE OR REPLACE FUNCTION public.process_confirmed_payment(
  p_transaction_id TEXT,
  p_provider_reference TEXT,
  p_payment_channel TEXT,
  p_gateway_fee NUMERIC DEFAULT 0
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
  -- Verrouillage exclusif de la transaction pour prévenir les doubles activations concurrentes
  SELECT * INTO v_payment
  FROM public.payments
  WHERE transaction_id = p_transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Paiement introuvable : %', p_transaction_id;
  END IF;

  -- GARANTIE D'IDEMPOTENCE
  IF v_payment.status = 'confirmed' THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_confirmed', true,
      'transaction_id', p_transaction_id
    );
  END IF;

  -- Mise à jour du paiement
  UPDATE public.payments
  SET
    status = 'confirmed',
    provider_reference = p_provider_reference,
    payment_channel = p_payment_channel,
    gateway_fee = p_gateway_fee,
    net_amount = v_payment.amount - p_gateway_fee,
    confirmed_at = now()
  WHERE id = v_payment.id;

  -- TRAITEMENT SELON LE TYPE D'ACHAT
  IF v_payment.payment_type = 'boost' THEN
    
    SELECT * INTO v_pkg FROM public.boost_packages WHERE id = v_payment.boost_package_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Package de boost inconnu : %', v_payment.boost_package_id;
    END IF;

    v_expires_at := now() + (v_pkg.duration_hours || ' hours')::INTERVAL;

    INSERT INTO public.boosts (
      listing_id, user_id, boost_package_id, source, payment_id, starts_at, expires_at, status
    ) VALUES (
      v_payment.listing_id, v_payment.user_id, v_pkg.id, 'paid_individual', v_payment.id, now(), v_expires_at, 'active'
    );

    UPDATE public.listings
    SET is_boosted = true, boost_expires_at = v_expires_at, updated_at = now()
    WHERE id = v_payment.listing_id;

    INSERT INTO public.admin_logs (actor_id, action, target_type, target_id, new_values)
    VALUES (
      v_payment.user_id, 'INDIVIDUAL_BOOST_PAID', 'listings', v_payment.listing_id::text,
      jsonb_build_object('package', v_pkg.id, 'expires_at', v_expires_at, 'amount', v_payment.amount)
    );

  ELSIF v_payment.payment_type = 'subscription' THEN

    SELECT * INTO v_plan FROM public.subscription_plans WHERE id = v_payment.plan_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Formule d''abonnement inconnue : %', v_payment.plan_id;
    END IF;

    v_expires_at := now() + (v_plan.duration_days || ' days')::INTERVAL;

    -- Expirer les éventuels abonnements et crédits précédents (NON CUMULABLES)
    UPDATE public.subscriptions
    SET status = 'expired', updated_at = now()
    WHERE user_id = v_payment.user_id AND status = 'active';

    UPDATE public.subscription_credits
    SET status = 'expired'
    WHERE user_id = v_payment.user_id AND status = 'active';

    -- Créer le nouvel abonnement (manuel en v1)
    INSERT INTO public.subscriptions (
      user_id, plan_id, starts_at, expires_at, status, manual_renewal, payment_id
    ) VALUES (
      v_payment.user_id, v_plan.id, now(), v_expires_at, 'active', true, v_payment.id
    ) RETURNING id INTO v_sub_id;

    -- Allouer les crédits de boost mensuels non cumulables (2 pour PLUS, 5 pour BUSINESS)
    IF v_plan.monthly_boost_credits > 0 THEN
      INSERT INTO public.subscription_credits (
        user_id, subscription_id, total_credits, used_credits, period_starts_at, period_expires_at, status
      ) VALUES (
        v_payment.user_id, v_sub_id, v_plan.monthly_boost_credits, 0, now(), v_expires_at, 'active'
      );
    END IF;

    -- Mettre à jour le rôle utilisateur si ce n'est pas déjà un membre du staff
    SELECT role INTO v_current_role FROM public.user_roles WHERE user_id = v_payment.user_id;
    IF v_current_role NOT IN ('moderator', 'admin', 'super_admin') THEN
      v_target_role := CASE
        WHEN v_plan.id = 'business' THEN 'business'
        WHEN v_plan.id = 'plus' THEN 'premium'
        ELSE 'member'
      END;

      UPDATE public.user_roles
      SET role = v_target_role, updated_at = now()
      WHERE user_id = v_payment.user_id;
    END IF;

    INSERT INTO public.admin_logs (actor_id, action, target_type, target_id, new_values)
    VALUES (
      v_payment.user_id, 'SUBSCRIPTION_ACTIVATED', 'subscriptions', v_sub_id::text,
      jsonb_build_object('plan', v_plan.id, 'expires_at', v_expires_at, 'credits', v_plan.monthly_boost_credits)
    );

  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'already_confirmed', false,
    'transaction_id', p_transaction_id,
    'type', v_payment.payment_type
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. AUTOMATISATION DES EXPIRATIONS (BOOSTS INDÉPENDANTS & ABONNEMENTS SANS SUPPRESSION D'ANNONCES)
CREATE OR REPLACE FUNCTION public.expire_subscriptions_and_boosts()
RETURNS JSONB AS $$
DECLARE
  v_expired_boosts INTEGER := 0;
  v_expired_subs INTEGER := 0;
  v_sub RECORD;
  v_user_role TEXT;
BEGIN
  -- A. Expiration automatique des boosts arrivés à échéance
  -- NOTE : Un boost individuel ('paid_individual') continue jusqu'à sa propre date expires_at
  -- même si l'abonnement de l'utilisateur a expiré !
  WITH exp_boosts AS (
    UPDATE public.boosts
    SET status = 'expired'
    WHERE status = 'active' AND expires_at <= now()
    RETURNING listing_id
  )
  SELECT COUNT(*) INTO v_expired_boosts FROM exp_boosts;

  -- Nettoyer le flag is_boosted sur les annonces qui n'ont plus aucun boost actif
  UPDATE public.listings l
  SET is_boosted = false, boost_expires_at = NULL, updated_at = now()
  WHERE l.is_boosted = true
    AND NOT EXISTS (
      SELECT 1 FROM public.boosts b
      WHERE b.listing_id = l.id AND b.status = 'active' AND b.expires_at > now()
    );

  -- B. Expiration automatique des abonnements arrivés à terme
  FOR v_sub IN
    SELECT * FROM public.subscriptions
    WHERE status = 'active' AND expires_at <= now()
  LOOP
    UPDATE public.subscriptions
    SET status = 'expired', updated_at = now()
    WHERE id = v_sub.id;

    -- Expirer les crédits de boost de la période (non cumulables)
    UPDATE public.subscription_credits
    SET status = 'expired'
    WHERE subscription_id = v_sub.id AND status = 'active';

    -- Rétrograder le rôle utilisateur vers 'member' (si pas staff)
    SELECT role INTO v_user_role FROM public.user_roles WHERE user_id = v_sub.user_id;
    IF v_user_role IN ('premium', 'business') THEN
      UPDATE public.user_roles SET role = 'member', updated_at = now()
      WHERE user_id = v_sub.user_id;
    END IF;

    -- RÈGLE D : Conserver toutes les annonces existantes sans les supprimer !
    -- La barrière trg_check_active_listings_quota bloquera les NOUVELLES publications
    -- si l'utilisateur dépasse le quota gratuit (3).

    v_expired_subs := v_expired_subs + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'expired_boosts', v_expired_boosts,
    'expired_subscriptions', v_expired_subs,
    'executed_at', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. ACTIVATION DE RLS SUR LES 17 TABLES
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

-- POLITIQUES RLS STRICTES :

-- profiles : Accès privé aux détails complets (utilisateur voit son profil, admins voient tout)
CREATE POLICY "Accès privé profil utilisateur" ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "Modification propre profil" ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- user_roles : Lecture de son propre rôle ou admin ; modification interdite via API directe
CREATE POLICY "Lecture rôle personnel ou admin" ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Gestion rôles par super_admin uniquement" ON public.user_roles FOR ALL
  USING (public.is_super_admin() OR auth.role() = 'service_role');

-- platform_settings : Lecture publique des paramètres non sensibles, gestion super_admin
CREATE POLICY "Lecture paramètres" ON public.platform_settings FOR SELECT USING (true);
CREATE POLICY "Modification paramètres par admin" ON public.platform_settings FOR ALL
  USING (public.is_super_admin() OR public.is_admin());

-- admin_logs : Lecture admin uniquement, insertion backend
CREATE POLICY "Lecture admin_logs par admin" ON public.admin_logs FOR SELECT
  USING (public.is_admin());
CREATE POLICY "Insertion admin_logs" ON public.admin_logs FOR INSERT
  WITH CHECK (true);

-- categories : Lecture publique, modification admin
CREATE POLICY "Lecture publique catégories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Gestion catégories admin" ON public.categories FOR ALL USING (public.is_admin());

-- listings : Lecture publique des approuvées, édition par propriétaire, modération par modérateur
CREATE POLICY "Lecture publique annonces approuvées" ON public.listings FOR SELECT
  USING (status IN ('approved', 'sold', 'given') OR auth.uid() = seller_id OR public.is_moderator());
CREATE POLICY "Insertion annonce membre actif" ON public.listings FOR INSERT
  WITH CHECK (
    auth.uid() = seller_id
    AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_blocked = true OR is_suspended = true))
  );
CREATE POLICY "Modification annonce propriétaire ou modo" ON public.listings FOR UPDATE
  USING (auth.uid() = seller_id OR public.is_moderator());
CREATE POLICY "Suppression annonce propriétaire ou admin" ON public.listings FOR DELETE
  USING (auth.uid() = seller_id OR public.is_admin());

-- listing_images
CREATE POLICY "Lecture publique images annonces" ON public.listing_images FOR SELECT USING (true);
CREATE POLICY "Gestion images par propriétaire" ON public.listing_images FOR ALL
  USING (EXISTS (SELECT 1 FROM public.listings WHERE id = listing_id AND seller_id = auth.uid()) OR public.is_moderator());

-- favorites
CREATE POLICY "Gestion propres favoris" ON public.favorites FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- reports
CREATE POLICY "Soumission signalement ouverte" ON public.reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Lecture signalements modérateurs" ON public.reports FOR SELECT USING (public.is_moderator());
CREATE POLICY "Traitement signalements modérateurs" ON public.reports FOR UPDATE USING (public.is_moderator());

-- conversations & reviews
CREATE POLICY "Accès conversations participants" ON public.conversations FOR ALL
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "Lecture avis publique" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Publication avis authentifiée" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- subscription_plans & boost_packages
CREATE POLICY "Lecture publique formules" ON public.subscription_plans FOR SELECT USING (true);
CREATE POLICY "Modification formules super_admin/admin" ON public.subscription_plans FOR ALL USING (public.is_admin());
CREATE POLICY "Lecture publique boosts tarifs" ON public.boost_packages FOR SELECT USING (true);
CREATE POLICY "Modification boosts tarifs admin" ON public.boost_packages FOR ALL USING (public.is_admin());

-- subscriptions & subscription_credits (Protection stricte contre la modification depuis le navigateur)
CREATE POLICY "Lecture propre abonnement" ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Écriture abonnements backend uniquement" ON public.subscriptions FOR ALL
  USING (auth.role() = 'service_role' OR public.is_admin())
  WITH CHECK (auth.role() = 'service_role' OR public.is_admin());

CREATE POLICY "Lecture propres crédits" ON public.subscription_credits FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Écriture crédits backend uniquement" ON public.subscription_credits FOR ALL
  USING (auth.role() = 'service_role' OR public.is_admin())
  WITH CHECK (auth.role() = 'service_role' OR public.is_admin());

-- boosts
CREATE POLICY "Lecture publique boosts actifs" ON public.boosts FOR SELECT USING (true);
CREATE POLICY "Gestion boosts backend uniquement" ON public.boosts FOR ALL
  USING (auth.role() = 'service_role' OR public.is_admin())
  WITH CHECK (auth.role() = 'service_role' OR public.is_admin());

-- payments & payment_events
CREATE POLICY "Lecture paiements propriétaire ou admin" ON public.payments FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Écriture paiements backend uniquement" ON public.payments FOR ALL
  USING (auth.role() = 'service_role' OR public.is_admin())
  WITH CHECK (auth.role() = 'service_role' OR public.is_admin());

CREATE POLICY "Lecture payment_events admin uniquement" ON public.payment_events FOR SELECT
  USING (public.is_admin());
CREATE POLICY "Écriture payment_events backend uniquement" ON public.payment_events FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR public.is_admin());

-- 4. STORAGE BUCKET
INSERT INTO storage.buckets (id, name, public)
VALUES ('ad-images', 'ad-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Images publiques" ON storage.objects;
CREATE POLICY "Images publiques" ON storage.objects FOR SELECT USING (bucket_id = 'ad-images');

DROP POLICY IF EXISTS "Upload images authentifié" ON storage.objects;
CREATE POLICY "Upload images authentifié" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'ad-images' AND auth.role() = 'authenticated');

