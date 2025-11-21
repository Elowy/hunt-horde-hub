import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  hiredHunterId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { hiredHunterId }: InvitationRequest = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: hunter, error: hunterError } = await supabase
      .from("hired_hunters")
      .select("*, profiles!hired_hunters_user_id_fkey(company_name)")
      .eq("id", hiredHunterId)
      .single();

    if (hunterError || !hunter) {
      throw new Error("Bérvadász nem található");
    }

    if (!hunter.email) {
      throw new Error("Email cím nincs megadva");
    }

    const baseUrl = req.headers.get("origin") || "http://localhost:8080";
    const registrationLink = `${baseUrl}/hired-hunter-register/${hunter.invitation_token}`;
    
    const societyName = hunter.profiles?.company_name || "Vadásztársaság";
    const expiresAt = hunter.expires_at 
      ? new Date(hunter.expires_at).toLocaleDateString("hu-HU")
      : "nem meghatározott";

    const emailResponse = await resend.emails.send({
      from: "Vadgondok <onboarding@resend.dev>",
      to: [hunter.email],
      subject: `Bérvadász regisztráció - ${societyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Üdvözöljük!</h2>
          <p>Tisztelt ${hunter.name}!</p>
          <p>A <strong>${societyName}</strong> bérvadászként regisztrálta Önt a rendszerünkben.</p>
          
          <p>Kérjük, kattintson az alábbi gombra az adatai véglegesítéséhez:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${registrationLink}" 
               style="background-color: #10b981; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              Regisztráció befejezése
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            Ez a link <strong>${expiresAt}</strong> dátumig érvényes.
          </p>
          
          <p>Ha nem Ön kérte ezt a regisztrációt, kérjük, hagyja figyelmen kívül ezt az emailt.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          <p style="color: #999; font-size: 12px;">
            Ez egy automatikusan generált email. Kérjük, ne válaszoljon rá.
          </p>
        </div>
      `,
    });

    await supabase
      .from("hired_hunters")
      .update({ invited_at: new Date().toISOString() })
      .eq("id", hiredHunterId);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error:", error);
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
