import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RegistrationApprovalRequest {
  registrationId: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("[REGISTRATION-APPROVAL] Function invoked");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { registrationId }: RegistrationApprovalRequest = await req.json();

    console.log("[REGISTRATION-APPROVAL] Processing registration:", registrationId);

    // Fetch registration details with security zone info
    const { data: registration, error: regError } = await supabaseClient
      .from("hunting_registrations")
      .select(`
        *,
        security_zones!inner(name),
        hunting_locations(name)
      `)
      .eq("id", registrationId)
      .single();

    if (regError || !registration) {
      console.error("[REGISTRATION-APPROVAL] Registration not found:", regError);
      throw new Error("Registration not found");
    }

    console.log("[REGISTRATION-APPROVAL] Registration found");

    // Get user's email from auth.users
    const { data: { user }, error: userError } = await supabaseClient.auth.admin.getUserById(
      registration.user_id
    );

    if (userError || !user?.email) {
      console.error("[REGISTRATION-APPROVAL] User email not found:", userError);
      throw new Error("User email not found");
    }

    console.log("[REGISTRATION-APPROVAL] User email:", user.email);

    // Get user's profile for name
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("contact_name, company_name")
      .eq("id", registration.user_id)
      .single();

    const userName = profile?.contact_name || profile?.company_name || "Vadász";

    // Format dates
    const startDate = new Date(registration.start_time).toLocaleString('hu-HU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const endDate = new Date(registration.end_time).toLocaleString('hu-HU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const htmlContent = `
      <h2>Beiratkozás jóváhagyva</h2>
      <p>Kedves ${userName}!</p>
      <p>Örömmel értesítjük, hogy a vadászati beiratkozási kérelme <strong>jóváhagyásra került</strong>.</p>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Beiratkozás részletei:</h3>
        <p><strong>Vadászterület:</strong> ${registration.security_zones?.name || 'N/A'}</p>
        ${registration.hunting_locations ? `<p><strong>Helyszín:</strong> ${registration.hunting_locations.name}</p>` : ''}
        <p><strong>Kezdés:</strong> ${startDate}</p>
        <p><strong>Befejezés:</strong> ${endDate}</p>
      </div>

      <p>A beiratkozás részleteit az alkalmazásban is megtekintheti.</p>
      
      <p>Kellemes vadászatot kívánunk!</p>
      
      <p>Üdvözlettel,<br>Vadászterület Kezelő Csapat</p>
    `;

    console.log("[REGISTRATION-APPROVAL] Sending email to:", user.email);

    // Send email
    const emailResponse = await resend.emails.send({
      from: "Vadászterület Kezelő <onboarding@resend.dev>",
      to: [user.email],
      subject: "Beiratkozás jóváhagyva",
      html: htmlContent,
    });

    console.log("[REGISTRATION-APPROVAL] Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("[REGISTRATION-APPROVAL] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
