import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Csak POST kérés engedélyezett." }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "A beküldő szolgáltatás nincs megfelelően beállítva." }, 500);
    }

    const body = await req.json();
    const { storage_location_id, species } = body;

    if (!storage_location_id || !species) {
      return jsonResponse({ error: "A hűtőhely azonosítója és a vadfaj megadása kötelező." }, 400);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: storageLocation, error: storageError } = await supabaseAdmin
      .from("storage_locations")
      .select("id, user_id")
      .eq("id", storage_location_id)
      .single();

    if (storageError || !storageLocation?.user_id) {
      console.error("QR animal submit storage location lookup failed:", storageError);
      return jsonResponse({ error: "A megadott hűtőhely nem található." }, 500);
    }

    const allowedOptionalFields = [
      "animal_id",
      "gender",
      "hunter_name",
      "notes",
      "security_zone_id",
      "weight",
      "class",
      "age",
      "cooling_date",
      "shooting_date",
    ];

    const pendingAnimal: Record<string, unknown> = {
      storage_location_id,
      hunter_society_id: storageLocation.user_id,
      species,
      approval_status: "pending",
      submitted_via: "qr_code",
    };

    for (const field of allowedOptionalFields) {
      if (body[field] !== undefined && body[field] !== "") {
        pendingAnimal[field] = body[field];
      }
    }

    const { error: insertError } = await supabaseAdmin
      .from("pending_animals")
      .insert(pendingAnimal);

    if (insertError) {
      console.error("QR animal submit insert failed:", insertError);
      return jsonResponse({ error: `Nem sikerült beküldeni az állatot: ${insertError.message}` }, 500);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ismeretlen hiba történt.";
    console.error("QR animal submit function failed:", error);
    return jsonResponse({ error: `Hiba történt a beküldés során: ${message}` }, 500);
  }
});