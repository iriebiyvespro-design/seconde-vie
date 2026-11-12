// ==============================================================================
// SUPABASE EDGE FUNCTION : check-expirations
// Traitement périodique : Expiration des boosts & abonnements
// ==============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Exécution de la procédure SQL sécurisée
    const { data, error } = await supabase.rpc("expire_subscriptions_and_boosts");

    if (error) {
      console.error("Erreur expiration cron:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.info("Rapport d'expiration exécuté avec succès :", data);

    return new Response(JSON.stringify({ success: true, report: data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

