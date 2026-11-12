-- ==============================================================================
-- PHASE 1 / MIGRATION 01 : Profils, Séparation des Rôles, Paramètres & Logs Admin
-- Tables : profiles, user_roles, platform_settings, admin_logs
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLE DES PROFILS UTILISATEURS
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

-- 2. TABLE DÉDIÉE AUX RÔLES UTILISATEURS (Séparation stricte des privilèges)
-- Rôles : visitor, member, premium, business, moderator, admin, super_admin
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('visitor', 'member', 'premium', 'business', 'moderator', 'admin', 'super_admin')),
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABLE DES PARAMÈTRES PLATEFORME
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO public.platform_settings (key, value, description)
VALUES
  ('cinetpay_mode', '"sandbox"', 'Mode CinetPay : sandbox (test) ou production (réel)'),
  ('cinetpay_configured', 'false', 'Indique si les identifiants marchands réels CinetPay sont définis'),
  ('commission_rate', '0', 'Commission sur les ventes et dons (0% en v1)'),
  ('ad_revenue_fcfa', '0', 'Recettes publicitaires cumulées hors abonnements/boosts'),
  ('maintenance_mode', 'false', 'Mode maintenance de la marketplace')
ON CONFLICT (key) DO NOTHING;

-- 4. TABLE DES JOURNAUX DE SÉCURITÉ ET D'ADMINISTRATION (admin_logs)
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

-- 5. FONCTIONS SÉCURISÉES DE CONTRÔLE DES RÔLES (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id UUID DEFAULT auth.uid())
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN 'visitor';
  END IF;

  SELECT role INTO v_role
  FROM public.user_roles
  WHERE user_id = p_user_id;

  RETURN COALESCE(v_role, 'member');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_moderator()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_user_role(auth.uid()) IN ('moderator', 'admin', 'super_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_user_role(auth.uid()) IN ('admin', 'super_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_user_role(auth.uid()) = 'super_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 6. PROTECTION ABSOLUE SUR USER_ROLES (Anti-Élévation & Blocage Super Admin depuis Navigateur)
CREATE OR REPLACE FUNCTION public.protect_user_roles_modification()
RETURNS TRIGGER AS $$
DECLARE
  v_jwt_role TEXT;
BEGIN
  v_jwt_role := current_setting('request.jwt.claims', true)::jsonb->>'role';

  -- Le rôle super_admin ne peut JAMAIS être attribué depuis un appel client/navigateur (authenticated)
  IF NEW.role = 'super_admin' AND v_jwt_role = 'authenticated' THEN
    RAISE EXCEPTION 'Violation de sécurité : le rôle super_admin ne peut jamais être attribué depuis le navigateur.';
  END IF;

  -- Si appelé par service_role ou directement via console SQL admin postgres, autoriser
  IF auth.role() = 'service_role' OR current_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  -- Pour tout utilisateur connecté, vérifier qu'il possède les droits d'attribution
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

-- 7. TRIGGER CRÉATION PROFIL ET RÔLE À L'INSCRIPTION
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Membre Seconde Vie'),
    COALESCE(new.raw_user_meta_data->>'avatar_url', '')
  );

  -- Tout nouvel inscrit démarre strictement comme 'member'
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

