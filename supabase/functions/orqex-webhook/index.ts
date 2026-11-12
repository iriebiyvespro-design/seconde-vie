// ==============================================================================
// SUPABASE EDGE FUNCTION : orqex-webhook
// Réception, Vérification HMAC & Traitement Idempotent des Webhooks Orqex (Axa Zara LLC)
// ==============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Vérification cryptographique HMAC-SHA256 temps constant
async function verifyHmacSignature(secret: string, rawBody: string, signatureHex: string): Promise<boolean> {
  if (!secret || !signatureHex) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  const computedHex = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const cleanProvided = signatureHex.replace(/^sha256=/i, "").toLowerCase();
  if (computedHex.length !== cleanProvided.length) return false;

  // Comparaison en temps constant
  let mismatch = 0;
  for (let i = 0; i < computedHex.length; i++) {
    mismatch |= computedHex.charCodeAt(i) ^ cleanProvided.charCodeAt(i);
  }
  return mismatch === 0;
}

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const orqexWebhookSecret = Deno.env.get("ORQEX_WEBHOOK_SECRET");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const rawBody = await req.text();
    const signatureHeader = req.headers.get("x-orqex-signature") || req.headers.get("x-signature") || "";
    const clientIp = req.headers.get("x-forwarded-for") || "unknown";

    // 1. Vérification Cryptographique de la Signature Webhook (Anti-Usurpation)
    if (orqexWebhookSecret && orqexWebhookSecret !== "YOUR_ORQEX_WEBHOOK_SECRET") {
      const isValidSig = await verifyHmacSignature(orqexWebhookSecret, rawBody, signatureHeader);
      if (!isValidSig) {
        console.warn("Signature Webhook Orqex invalide depuis IP:", clientIp);
        return new Response(JSON.stringify({ error: "Signature HMAC invalide" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    const payload = JSON.parse(rawBody || "{}");
    const eventType = payload.event || "unknown";
    const data = payload.data || payload;
    const transactionId = data.reference || data.transaction_id;

    if (!transactionId) {
      return new Response(JSON.stringify({ error: "Référence de transaction manquante" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. Journalisation Immuable dans payment_events
    await supabase.from("payment_events").insert({
      transaction_id: transactionId,
      event_type: `ORQEX_${eventType.toUpperCase()}`,
      provider_signature: signatureHeader || "sandbox",
      payload,
      ip_address: clientIp,
    });

    // 3. Traitement selon le statut de l'événement Orqex
    if (eventType === "payment.succeeded" || eventType === "transaction.completed" || data.status === "completed") {
      const providerRef = data.orqex_transaction_id || data.transaction_id || `ORQ-${Date.now()}`;
      const underlyingPsp = data.provider || data.psp || "orqex_routed";
      const channel = data.channel || data.payment_method || "MOBILE_MONEY";
      const gatewayFee = Number(data.fee || 0);

      // Appel SQL Idempotent (SELECT ... FOR UPDATE)
      const { data: processResult, error: rpcError } = await supabase.rpc(
        "process_confirmed_payment",
        {
          p_transaction_id: transactionId,
          p_provider_reference: providerRef,
          p_payment_channel: channel,
          p_gateway_fee: gatewayFee,
          p_underlying_psp: underlyingPsp,
        }
      );

      if (rpcError) {
        return new Response(JSON.stringify({ error: rpcError.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ received: true, result: processResult }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (eventType === "payment.failed" || data.status === "failed") {
      await supabase
        .from("payments")
        .update({ status: "failed" })
        .eq("transaction_id", transactionId)
        .eq("status", "pending");
    }

    return new Response(JSON.stringify({ received: true, event: eventType }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Erreur webhook Orqex:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

