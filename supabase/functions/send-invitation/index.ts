import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY nincs beállítva");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email }: InvitationRequest = await req.json();

    if (!email || !email.includes("@")) {
      throw new Error("Érvénytelen email cím");
    }

    // Get invitation details
    const { data: invitation, error: inviteError } = await supabase
      .from("invitations")
      .select("*")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (inviteError) {
      console.error("Invitation fetch error:", inviteError);
      throw new Error("Nem található meghívó");
    }

    // Get company name from profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_name")
      .eq("id", invitation.invited_by)
      .single();

    const companyName = profile?.company_name || "Vadásztársaság";
    const registrationUrl = `${Deno.env.get("SUPABASE_URL")?.replace("/v1", "")}/register`;

    // Send email using Resend
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Vadgondnok <onboarding@resend.dev>",
        to: [email],
        subject: `Meghívó a ${companyName} vadászati nyilvántartásához`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2d5a3d;">Meghívót kapott!</h1>
            <p>Meghívást kapott a <strong>${companyName}</strong> vadászati nyilvántartó rendszerébe.</p>
            <p>Szerkesztőként a következőket teheti:</p>
            <ul>
              <li>Új állatok hozzáadása a nyilvántartáshoz</li>
              <li>Állatok megtekintése</li>
            </ul>
            <p><strong>Nem tudja:</strong> állatok módosítását vagy törlését végezni.</p>
            <p style="margin: 30px 0;">
              <a href="${registrationUrl}" 
                 style="background-color: #2d5a3d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Regisztráció
              </a>
            </p>
            <p style="color: #666; font-size: 14px;">
              Ez a meghívó 7 napig érvényes. Kérjük, regisztráljon ezzel az email címmel: <strong>${email}</strong>
            </p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
              Ha nem kért meghívót, nyugodtan hagyja figyelmen kívül ezt az emailt.
            </p>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Resend API error:", errorText);
      throw new Error(`Email küldése sikertelen: ${errorText}`);
    }

    const result = await emailResponse.json();
    console.log("Email sikeresen elküldve:", result);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-invitation function:", error);
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
