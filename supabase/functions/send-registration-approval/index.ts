import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RegistrationApprovalRequest {
  hunterId: string;
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

    const { hunterId }: RegistrationApprovalRequest = await req.json();

    console.log("[REGISTRATION-APPROVAL] Processing hunter:", hunterId);

    // Fetch hunter profile
    const { data: hunter, error: hunterError } = await supabaseClient
      .from("profiles")
      .select("id, contact_name, contact_email, hunter_society_id")
      .eq("id", hunterId)
      .single();

    if (hunterError || !hunter) {
      console.error("[REGISTRATION-APPROVAL] Hunter not found:", hunterError);
      throw new Error("Hunter not found");
    }

    console.log("[REGISTRATION-APPROVAL] Hunter found");

    // Get user's email from auth.users
    const { data: { user }, error: userError } = await supabaseClient.auth.admin.getUserById(hunterId);

    if (userError || !user?.email) {
      console.error("[REGISTRATION-APPROVAL] User email not found:", userError);
      throw new Error("User email not found");
    }

    console.log("[REGISTRATION-APPROVAL] User email:", user.email);

    // Get hunter society name
    const { data: society } = await supabaseClient
      .from("profiles")
      .select("company_name")
      .eq("id", hunter.hunter_society_id)
      .single();

    const userName = hunter.contact_name || "Vadász";
    const societyName = society?.company_name || "vadásztársaság";

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2d5016;">Regisztráció jóváhagyva!</h2>
        <p>Tisztelt ${userName}!</p>
        <p>Örömmel értesítjük, hogy regisztrációját a <strong>${societyName}</strong> jóváhagyta.</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;">Most már bejelentkezhet a rendszerbe és használhatja az összes funkciót.</p>
        </div>

        <p>Bejelentkezéshez kattintson az alábbi gombra:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${req.headers.get("origin") || "https://vadgondnok.lovable.app"}/login" 
             style="background-color: #2d5016; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; display: inline-block;">
            Bejelentkezés
          </a>
        </div>
        
        <p>Kellemes vadászatot kívánunk!</p>
        
        <p>Üdvözlettel,<br>Vadgondnok Csapat</p>
      </div>
    `;

    console.log("[REGISTRATION-APPROVAL] Sending email to:", user.email);

    // Send email
    const emailResponse = await resend.emails.send({
      from: "Vadgondnok <onboarding@resend.dev>",
      to: [user.email],
      subject: "Regisztráció jóváhagyva",
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
