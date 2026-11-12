-- ==============================================================================
-- PHASE 7 / MIGRATION 07 : Orchestrateur de Paiement Orqex (Axa Zara LLC)
-- Unification des passerelles Mobile Money (Wave, Orange, MTN, Moov) & CinetPay
-- ==============================================================================

-- 1. Ajout des colonnes d'orchestration Orqex sur la table payments
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS orchestrator_session_id TEXT,
  ADD COLUMN IF NOT EXISTS underlying_psp TEXT, -- ex: 'cinetpay', 'wave_direct', 'orange_money', 'stripe'
  ADD COLUMN IF NOT EXISTS routing_rule TEXT DEFAULT 'auto_best_conversion';

-- Mettre à jour la valeur par défaut du fournisseur vers 'orqex'
ALTER TABLE public.payments
  ALTER COLUMN payment_provider SET DEFAULT 'orqex';

CREATE INDEX IF NOT EXISTS idx_payments_orchestrator_session ON public.payments(orchestrator_session_id);

-- 2. Configuration de l'orchestrateur dans platform_settings
INSERT INTO public.platform_settings (key, value, description)
VALUES
  ('active_payment_orchestrator', '"orqex"', 'Orchestrateur actif : orqex (Axa Zara LLC) ou cinetpay'),
  ('orqex_configured', 'false', 'Devient true uniquement lorsque ORQEX_API_KEY et ORQEX_WEBHOOK_SECRET sont définis côté serveur'),
  ('orqex_mode', '"sandbox"', 'Environnement Orqex : sandbox ou production'),
  ('orqex_supported_channels', '["WAVE_CI", "ORANGE_MONEY_CI", "MTN_CI", "MOOV_CI", "CREDIT_CARD"]', 'Canaux routés par Orqex en Côte d''Ivoire')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description;

-- 3. Mise à jour de la procédure d'activation idempotente pour supporter le routage PSP Orqex
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
  -- Verrouillage exclusif de la transaction pour idempotence stricte
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

  -- Mise à jour du paiement avec traçabilité orchestrateur + PSP sous-jacent
  UPDATE public.payments
  SET
    status = 'confirmed',
    provider_reference = p_provider_reference,
    payment_channel = p_payment_channel,
    underlying_psp = p_underlying_psp,
    gateway_fee = p_gateway_fee,
    net_amount = v_payment.amount - p_gateway_fee,
    confirmed_at = now()
  WHERE id = v_payment.id;

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
      v_payment.user_id, 'INDIVIDUAL_BOOST_PAID_ORQEX', 'listings', v_payment.listing_id::text,
      jsonb_build_object('package', v_pkg.id, 'expires_at', v_expires_at, 'psp', p_underlying_psp)
    );

  ELSIF v_payment.payment_type = 'subscription' THEN
    SELECT * INTO v_plan FROM public.subscription_plans WHERE id = v_payment.plan_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Formule d''abonnement inconnue : %', v_payment.plan_id;
    END IF;

    v_expires_at := now() + (v_plan.duration_days || ' days')::INTERVAL;

    UPDATE public.subscriptions
    SET status = 'expired', updated_at = now()
    WHERE user_id = v_payment.user_id AND status = 'active';

    UPDATE public.subscription_credits
    SET status = 'expired'
    WHERE user_id = v_payment.user_id AND status = 'active';

    INSERT INTO public.subscriptions (
      user_id, plan_id, starts_at, expires_at, status, manual_renewal, payment_id
    ) VALUES (
      v_payment.user_id, v_plan.id, now(), v_expires_at, 'active', true, v_payment.id
    ) RETURNING id INTO v_sub_id;

    IF v_plan.monthly_boost_credits > 0 THEN
      INSERT INTO public.subscription_credits (
        user_id, subscription_id, total_credits, used_credits, period_starts_at, period_expires_at, status
      ) VALUES (
        v_payment.user_id, v_sub_id, v_plan.monthly_boost_credits, 0, now(), v_expires_at, 'active'
      );
    END IF;

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
      v_payment.user_id, 'SUBSCRIPTION_ACTIVATED_ORQEX', 'subscriptions', v_sub_id::text,
      jsonb_build_object('plan', v_plan.id, 'expires_at', v_expires_at, 'psp', p_underlying_psp)
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'already_confirmed', false,
    'transaction_id', p_transaction_id,
    'orchestrator', 'orqex',
    'underlying_psp', p_underlying_psp
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

