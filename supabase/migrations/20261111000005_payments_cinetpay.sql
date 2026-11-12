-- ==============================================================================
-- PHASE 5 / MIGRATION 05 : Paiements CinetPay, Événements & Rapprochement
-- Tables : payments, payment_events
-- ==============================================================================

-- 1. TABLE DES PAIEMENTS
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  transaction_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'FCFA',
  payment_provider TEXT NOT NULL DEFAULT 'cinetpay',
  provider_reference TEXT UNIQUE,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('subscription', 'boost', 'ad_revenue')),
  plan_id TEXT REFERENCES public.subscription_plans(id),
  boost_package_id TEXT REFERENCES public.boost_packages(id),
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  payment_channel TEXT, -- 'ORANGE_MONEY_CI', 'MTN_CI', 'MOOV_CI', 'WAVE_CI', 'CREDIT_CARD'
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
CREATE INDEX IF NOT EXISTS idx_payments_created ON public.payments(created_at DESC);

-- 2. TABLE DES ÉVÉNEMENTS DE PAIEMENT (WEBHOOKS CINETPAY)
CREATE TABLE IF NOT EXISTS public.payment_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  transaction_id TEXT,
  event_type TEXT NOT NULL, -- 'WEBHOOK_RECEIVED', 'CINETPAY_VERIFIED', 'VERIFICATION_FAILED', 'REFUND'
  provider_signature TEXT,
  payload JSONB NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_payment_events_trans ON public.payment_events(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_created ON public.payment_events(created_at DESC);

