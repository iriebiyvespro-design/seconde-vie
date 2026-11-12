// ==============================================================================
// SUPABASE EDGE FUNCTION : cinetpay-webhook
// Réception, Vérification Côté Serveur & Idempotence des Paiements
// ==============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const cinetpayApiKey = Deno.env.get("CINETPAY_API_KEY");
    const cinetpaySiteId = Deno.env.get("CINETPAY_SITE_ID");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extraction du payload (JSON ou FormData selon CinetPay)
    let payload: any = {};
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      payload = await req.json();
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      formData.forEach((value, key) => {
        payload[key] = value;
      });
    }

    const transactionId = payload.cpm_trans_id || payload.transaction_id;
    const clientIp = req.headers.get("x-forwarded-for") || "unknown";

    if (!transactionId) {
      return new Response(JSON.stringify({ error: "cpm_trans_id manquant" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 1. Journalisation Immuable de l'Événement Reçu
    await supabase.from("payment_events").insert({
      transaction_id: transactionId,
      event_type: "WEBHOOK_NOTIFICATION_RECEIVED",
      provider_signature: req.headers.get("x-token") || "none",
      payload,
      ip_address: clientIp,
    });

    // 2. Vérification Côté Serveur Auprès de l'API CinetPay (Anti-Usurpation)
    let isPaymentValid = false;
    let providerRef = payload.cpm_trans_id;
    let paymentChannel = payload.payment_method || "MOBILE_MONEY";
    let gatewayFee = 0;

    if (cinetpayApiKey && cinetpaySiteId) {
      // Appel strict de contre-vérification API CinetPay
      const checkResponse = await fetch("https://api-checkout.cinetpay.com/v2/payment/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apikey: cinetpayApiKey,
          site_id: cinetpaySiteId,
          transaction_id: transactionId,
        }),
      });

      const checkData = await checkResponse.json();

      if (checkData.code === "00" && checkData.data?.status === "ACCEPTED") {
        isPaymentValid = true;
        providerRef = checkData.data.operator_id || checkData.data.payment_method;
        paymentChannel = checkData.data.payment_method || "MOBILE_MONEY";
      } else {
        console.warn(`Paiement non confirmé par l'API CinetPay pour ${transactionId}:`, checkData);
      }
    } else {
      // Mode Test / Sandbox
      if (payload.status === "ACCEPTED" || payload.cpm_result === "00" || payload.test_mode === true) {
        isPaymentValid = true;
        providerRef = `TEST-REF-${Date.now()}`;
        paymentChannel = payload.payment_channel || "WAVE_CI_TEST";
      }
    }

    if (!isPaymentValid) {
      // Mettre à jour l'état en 'failed' si refus
      await supabase
        .from("payments")
        .update({ status: "failed" })
        .eq("transaction_id", transactionId);

      return new Response(JSON.stringify({ code: "400", message: "Paiement non confirmé" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3. Appel de la Procédure SQL Idempotente (Verrouillage + Activation)
    const { data: processResult, error: rpcError } = await supabase.rpc(
      "process_confirmed_payment",
      {
        p_transaction_id: transactionId,
        p_provider_reference: providerRef,
        p_payment_channel: paymentChannel,
        p_gateway_fee: gatewayFee,
      }
    );

    if (rpcError) {
      console.error("Erreur RPC process_confirmed_payment:", rpcError);
      return new Response(JSON.stringify({ error: rpcError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 4. Enregistrement du Succès dans les Événements
    await supabase.from("payment_events").insert({
      transaction_id: transactionId,
      event_type: "PAYMENT_ACTIVATED_SUCCESSFULLY",
      payload: processResult,
      ip_address: clientIp,
    });

    return new Response(JSON.stringify({ code: "200", status: "ACCEPTED", result: processResult }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Erreur serveur webhook:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

