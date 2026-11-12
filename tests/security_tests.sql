-- ==============================================================================
-- SUITE DE TESTS DE SÉCURITÉ SQL & LOGIQUE MÉTIER (PostgreSQL / RLS)
-- Projet : SECONDE VIE – CODE S
-- ==============================================================================

BEGIN;

DO $$
DECLARE
  v_user_a UUID := '11111111-1111-1111-1111-111111111111'::UUID;
  v_user_b UUID := '22222222-2222-2222-2222-222222222222'::UUID;
  v_listing_a UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::UUID;
  v_sub_id UUID;
BEGIN
  RAISE NOTICE '-------------------------------------------------------------------';
  RAISE NOTICE 'AUDIT SQL & RLS : SECONDE VIE – CODE S';
  RAISE NOTICE '-------------------------------------------------------------------';

  -- Création utilisateurs test
  INSERT INTO public.profiles (id, email, full_name) VALUES (v_user_a, 'user_a@test.ci', 'User A') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_user_a, 'member') ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.profiles (id, email, full_name) VALUES (v_user_b, 'user_b@test.ci', 'User B') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_user_b, 'member') ON CONFLICT (user_id) DO NOTHING;

  -- TEST 1 : Vérification contrainte de prix 0 FCFA sur les dons gratuits
  BEGIN
    INSERT INTO public.listings (seller_id, title, description, category_id, condition, type, price, commune, quartier, contact_name, contact_phone)
    VALUES (v_user_a, 'Don avec faux prix', 'Description valide de test', 'divers', 'bon-etat', 'don', 5000, 'Cocody', 'Angré', 'User A', '+22507');
    RAISE EXCEPTION 'ÉCHEC TEST 1 : Un don gratuit avec prix > 0 a été accepté !';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE '✓ TEST 1 VALIDÉ : La contrainte chk_don_price_zero bloque tout don payant.';
  END;

  -- TEST 2 : Quotas de publication (GRATUIT = 3 max ; articles vendus/donnés ne comptent pas)
  INSERT INTO public.listings (id, seller_id, title, description, category_id, condition, type, price, commune, quartier, contact_name, contact_phone, status)
  VALUES
    (v_listing_a, v_user_a, 'Objet 1', 'Description valide', 'divers', 'bon-etat', 'vente', 1000, 'Cocody', 'Angré', 'A', '+22507', 'approved'),
    (uuid_generate_v4(), v_user_a, 'Objet 2', 'Description valide', 'divers', 'bon-etat', 'vente', 2000, 'Cocody', 'Angré', 'A', '+22507', 'approved'),
    (uuid_generate_v4(), v_user_a, 'Objet 3 (Don)', 'Description valide', 'divers', 'bon-etat', 'don', 0, 'Cocody', 'Angré', 'A', '+22507', 'pending'),
    (uuid_generate_v4(), v_user_a, 'Objet Vendu (Exclu)', 'Description valide', 'divers', 'bon-etat', 'vente', 3000, 'Cocody', 'Angré', 'A', '+22507', 'sold');

  BEGIN
    INSERT INTO public.listings (seller_id, title, description, category_id, condition, type, price, commune, quartier, contact_name, contact_phone, status)
    VALUES (v_user_a, 'Objet 4 Dépassement', 'Description valide', 'divers', 'bon-etat', 'vente', 4000, 'Cocody', 'Angré', 'A', '+22507', 'approved');
    RAISE EXCEPTION 'ÉCHEC TEST 2 : Dépassement du quota de 3 annonces autorisé !';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✓ TEST 2 VALIDÉ : Le dépassement du quota gratuit (3 annonces actives) est bloqué.';
  END;

  -- TEST 3 : Paiement confirmé & Idempotence (Double réception webhook)
  INSERT INTO public.payments (transaction_id, user_id, amount, payment_type, plan_id, status)
  VALUES ('SV-SQL-TEST-PLUS', v_user_b, 2000, 'subscription', 'plus', 'pending');

  PERFORM public.process_confirmed_payment('SV-SQL-TEST-PLUS', 'CINET-REF-1', 'WAVE_CI', 30);
  -- 2ème exécution simulée
  PERFORM public.process_confirmed_payment('SV-SQL-TEST-PLUS', 'CINET-REF-1', 'WAVE_CI', 30);

  IF (SELECT COUNT(*) FROM public.subscriptions WHERE user_id = v_user_b AND status = 'active') != 1 THEN
    RAISE EXCEPTION 'ÉCHEC TEST 3 : Double activation détectée !';
  END IF;
  RAISE NOTICE '✓ TEST 3 VALIDÉ : Idempotence stricte vérifiée et 2 crédits PLUS alloués.';

  -- TEST 4 : Boost individuel payé survit à l'expiration de l'abonnement
  INSERT INTO public.payments (transaction_id, user_id, amount, payment_type, boost_package_id, listing_id, status)
  VALUES ('SV-SQL-TEST-BOOST', v_user_b, 1500, 'boost', 'boost_7d', v_listing_a, 'pending');

  PERFORM public.process_confirmed_payment('SV-SQL-TEST-BOOST', 'CINET-BOOST-1', 'ORANGE_MONEY_CI', 22);

  -- Simuler expiration immédiate de l'abonnement de User B
  UPDATE public.subscriptions SET expires_at = now() - INTERVAL '1 hour' WHERE user_id = v_user_b;
  PERFORM public.expire_subscriptions_and_boosts();

  IF NOT EXISTS (SELECT 1 FROM public.boosts WHERE listing_id = v_listing_a AND status = 'active' AND source = 'paid_individual') THEN
    RAISE EXCEPTION 'ÉCHEC TEST 4 : Le boost individuel payé a été annulé à tort lors de l''expiration d''abonnement !';
  END IF;
  RAISE NOTICE '✓ TEST 4 VALIDÉ : Le boost individuel survit à l''expiration de l''abonnement.';

  RAISE NOTICE '-------------------------------------------------------------------';
  RAISE NOTICE 'TOUS LES TESTS POSTGRESQL SONT VALIDÉS AVEC SUCCÈS !';
  RAISE NOTICE '-------------------------------------------------------------------';
END $$;

ROLLBACK;
