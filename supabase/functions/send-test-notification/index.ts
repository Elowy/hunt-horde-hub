import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TestNotificationRequest {
  notification_type: string;
  user_email: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Test notification function invoked");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error("Error getting user:", userError);
      throw new Error("Unauthorized");
    }

    console.log("User authenticated:", user.id);

    // Check if user is super admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (roleError) {
      console.error("Error checking role:", roleError);
      throw new Error("Error checking permissions");
    }

    if (!roleData) {
      console.error("User is not super admin");
      throw new Error("Only super admins can send test notifications");
    }

    const { notification_type, user_email }: TestNotificationRequest =
      await req.json();

    console.log("Sending test notification:", notification_type, "to:", user_email);

    // Get email templates based on notification type
    const templates = {
      transport: {
        subject: "Teszt: Új szállítás értesítés",
        html: `
          <h1>Teszt értesítés - Szállítás</h1>
          <p>Ez egy teszt értesítés az új szállításokról.</p>
          <p>Valós esetben itt jelennek meg a szállítás részletei.</p>
        `,
      },
      storage_full: {
        subject: "Teszt: Hűtő telítettség figyelmeztetés",
        html: `
          <h1>Teszt értesítés - Hűtő telítettség</h1>
          <p>Ez egy teszt értesítés a hűtő telítettségről.</p>
          <p>Valós esetben itt jelenik meg, hogy mely hűtő érte el a 80%-os kapacitást.</p>
        `,
      },
      animal_add: {
        subject: "Teszt: Új vad hozzáadva",
        html: `
          <h1>Teszt értesítés - Új vad</h1>
          <p>Ez egy teszt értesítés új vad hozzáadásáról.</p>
          <p>Valós esetben itt jelennek meg az állat részletei.</p>
        `,
      },
      animal_update: {
        subject: "Teszt: Vad módosítva",
        html: `
          <h1>Teszt értesítés - Vad módosítás</h1>
          <p>Ez egy teszt értesítés vad módosításáról.</p>
          <p>Valós esetben itt jelennek meg a változások.</p>
        `,
      },
      animal_delete: {
        subject: "Teszt: Vad törölve",
        html: `
          <h1>Teszt értesítés - Vad törlés</h1>
          <p>Ez egy teszt értesítés vad törléséről.</p>
          <p>Valós esetben itt jelennek meg a törölt állat adatai.</p>
        `,
      },
      registration_approved: {
        subject: "Teszt: Beiratkozás jóváhagyva",
        html: `
          <h1>Teszt értesítés - Beiratkozás jóváhagyva</h1>
          <p>Ez egy teszt értesítés beiratkozás jóváhagyásáról.</p>
          <p>Valós esetben itt jelennek meg a beiratkozás részletei.</p>
        `,
      },
      registration_rejected: {
        subject: "Teszt: Beiratkozás elutasítva",
        html: `
          <h1>Teszt értesítés - Beiratkozás elutasítva</h1>
          <p>Ez egy teszt értesítés beiratkozás elutasításáról.</p>
          <p>Valós esetben itt jelennek meg az elutasítás indokai.</p>
        `,
      },
      announcement: {
        subject: "Teszt: Új hír",
        html: `
          <h1>Teszt értesítés - Új hír</h1>
          <p>Ez egy teszt értesítés új hír közzétételéről.</p>
          <p>Valós esetben itt jelenik meg a hír címe és tartalma.</p>
        `,
      },
    };

    const template = templates[notification_type as keyof typeof templates];

    if (!template) {
      throw new Error(`Unknown notification type: ${notification_type}`);
    }

    const emailResponse = await resend.emails.send({
      from: "Vadászati Rendszer <onboarding@resend.dev>",
      to: [user_email],
      subject: template.subject,
      html: template.html,
    });

    console.log("Test email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-test-notification function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.message === "Unauthorized" || error.message === "Only super admins can send test notifications" ? 403 : 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
