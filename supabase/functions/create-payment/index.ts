// ==============================================================================
// SUPABASE EDGE FUNCTION : create-payment
// Orchestrateur Principal : Orqex (Axa Zara LLC) + Support Fallback CinetPay
// ==============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    // Identifiants Orqex (Axa Zara LLC) lus strictement depuis l'environnement serveur
    const orqexApiKey = Deno.env.get("ORQEX_API_KEY");
    const orqexApiUrl = Deno.env.get("ORQEX_API_URL") || "https://api.orqex.com/v1";

    // Identifiants Fallback CinetPay
    const cinetpayApiKey = Deno.env.get("CINETPAY_API_KEY");
    const cinetpaySiteId = Deno.env.get("CINETPAY_SITE_ID");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Authentification Utilisateur
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé : token manquant" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Session invalide ou expirée" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { payment_type, plan_id, boost_package_id, listing_id, return_url, preferred_channel } = await req.json();

    // 2. Validation & Résolution du Prix Côté Serveur (Jamais faire confiance au client)
    let validatedAmount = 0;
    let description = "";

    if (payment_type === "subscription") {
      const { data: plan, error: planError } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("id", plan_id)
        .eq("is_active", true)
        .single();

      if (planError || !plan || Number(plan.price_fcfa) <= 0) {
        return new Response(JSON.stringify({ error: "Formule d'abonnement payante introuvable." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      validatedAmount = Number(plan.price_fcfa);
      description = `Abonnement SECONDE VIE CODE S - ${plan.name}`;

    } else if (payment_type === "boost") {
      if (!listing_id) {
        return new Response(JSON.stringify({ error: "L'identifiant de l'annonce à booster est requis." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: listing, error: listingErr } = await supabase
        .from("listings")
        .select("id, seller_id, title")
        .eq("id", listing_id)
        .single();

      if (listingErr || !listing || listing.seller_id !== user.id) {
        return new Response(JSON.stringify({ error: "Annonce introuvable ou propriété non vérifiée." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: pkg, error: pkgErr } = await supabase
        .from("boost_packages")
        .select("*")
        .eq("id", boost_package_id)
        .eq("is_active", true)
        .single();

      if (pkgErr || !pkg) {
        return new Response(JSON.stringify({ error: "Package de boost invalide." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      validatedAmount = Number(pkg.price_fcfa);
      description = `Boost ${pkg.name} - ${listing.title.slice(0, 30)}`;

    } else {
      return new Response(JSON.stringify({ error: "Type de paiement non supporté." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Création de la Commande de Paiement Interne
    const timestamp = Date.now();
    const transactionId = `SV-ORQ-${timestamp}-${Math.floor(1000 + Math.random() * 9000)}`;
    const clientIp = req.headers.get("x-forwarded-for") || "unknown";

    const hasOrqexCredentials = Boolean(orqexApiKey && orqexApiKey !== "YOUR_ORQEX_API_KEY");
    const hasCinetpayCredentials = Boolean(cinetpayApiKey && cinetpaySiteId && cinetpayApiKey !== "YOUR_CINETPAY_API_KEY");

    const selectedProvider = hasOrqexCredentials ? "orqex" : (hasCinetpayCredentials ? "cinetpay" : "orqex");

    const { data: paymentRecord, error: insertError } = await supabase
      .from("payments")
      .insert({
        transaction_id: transactionId,
        user_id: user.id,
        amount: validatedAmount,
        currency: "FCFA",
        payment_provider: selectedProvider,
        payment_type,
        plan_id: plan_id || null,
        boost_package_id: boost_package_id || null,
        listing_id: listing_id || null,
        payment_channel: preferred_channel || "AUTO_ORQEX_ROUTE",
        status: "pending",
        client_ip: clientIp,
        metadata: { description, user_email: user.email, orchestrator: "Axa Zara LLC - Orqex" },
      })
      .select()
      .single();

    if (insertError) {
      return new Response(JSON.stringify({ error: "Erreur création de la commande." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. RÈGLE : Ne pas activer les paiements réels tant que les identifiants marchands ne sont pas configurés
    if (!hasOrqexCredentials && !hasCinetpayCredentials) {
      return new Response(
        JSON.stringify({
          success: true,
          mode: "sandbox_unconfigured",
          orchestrator: "orqex",
          transaction_id: transactionId,
          amount: validatedAmount,
          currency: "FCFA",
          message: "Identifiants marchands Orqex (et fallback CinetPay) non configurés. Paiement réel désactivé ; utilisez l'environnement de test.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Initialisation Session de Paiement via Orqex (Axa Zara LLC)
    if (hasOrqexCredentials) {
      const orqexResponse = await fetch(`${orqexApiUrl}/checkout/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${orqexApiKey}`,
          "Accept": "application/json",
        },
        body: JSON.stringify({
          reference: transactionId,
          amount: validatedAmount,
          currency: "XOF",
          description,
          customer: {
            id: user.id,
            email: user.email || "client@secondevie.ci",
            phone: user.user_metadata?.phone || undefined,
          },
          preferred_channel: preferred_channel || undefined,
          callback_url: `${supabaseUrl}/functions/v1/orqex-webhook`,
          return_url: return_url || "https://secondevie.ci/payment-return",
          metadata: {
            payment_type,
            plan_id,
            boost_package_id,
            listing_id,
          },
        }),
      });

      const orqexData = await orqexResponse.json();

      if (orqexResponse.ok && (orqexData.checkout_url || orqexData.data?.checkout_url)) {
        const checkoutUrl = orqexData.checkout_url || orqexData.data?.checkout_url;
        const sessionId = orqexData.session_id || orqexData.id || orqexData.data?.id;

        await supabase
          .from("payments")
          .update({ orchestrator_session_id: sessionId })
          .eq("id", paymentRecord.id);

        return new Response(
          JSON.stringify({
            success: true,
            mode: "live",
            orchestrator: "orqex",
            transaction_id: transactionId,
            session_id: sessionId,
            payment_url: checkoutUrl,
            amount: validatedAmount,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.error("Erreur Orqex API :", orqexData);
      // Si Orqex échoue et CinetPay est configuré, failover possible vers CinetPay
      if (!hasCinetpayCredentials) {
        return new Response(JSON.stringify({ error: orqexData.message || "Erreur orchestrateur Orqex" }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // 6. Fallback direct CinetPay si configuré
    const cinetResponse = await fetch("https://api-checkout.cinetpay.com/v2/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apikey: cinetpayApiKey,
        site_id: cinetpaySiteId,
        transaction_id: transactionId,
        amount: validatedAmount,
        currency: "XOF",
        description,
        return_url: return_url || "https://secondevie.ci/payment-return",
        notify_url: `${supabaseUrl}/functions/v1/cinetpay-webhook`,
        customer_id: user.id,
        customer_email: user.email || "client@secondevie.ci",
        channels: "ALL",
      }),
    });

    const cinetData = await cinetResponse.json();
    if (cinetData.code === "201") {
      await supabase
        .from("payments")
        .update({ provider_reference: cinetData.data.payment_token, underlying_psp: "cinetpay_fallback" })
        .eq("id", paymentRecord.id);

      return new Response(
        JSON.stringify({
          success: true,
          mode: "live",
          orchestrator: "cinetpay_fallback",
          transaction_id: transactionId,
          payment_url: cinetData.data.payment_url,
          amount: validatedAmount,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: cinetData.message || "Erreur passerelle de paiement" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
