import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
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

    const { email }: PasswordResetRequest = await req.json();

    if (!email || !email.includes("@")) {
      throw new Error("Érvénytelen email cím");
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Get user by email
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error("User fetch error:", userError);
      throw new Error("Nem található felhasználó");
    }

    const user = userData.users.find(u => u.email === email);
    
    if (!user) {
      // Don't reveal if user exists
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    // Store code in user metadata (temporary solution)
    await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        password_reset_code: code,
        password_reset_expires: expiresAt.toISOString(),
      },
    });

    console.log(`Generated code for ${email}: ${code}`);

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
        subject: "Jelszó módosítási kód",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2d5a3d;">Jelszó módosítás</h1>
            <p>Az Ön jelszó módosítási kódja:</p>
            <div style="background-color: #f4f4f4; border-radius: 5px; border: 1px solid #ddd; padding: 20px; text-align: center; margin: 30px 0;">
              <h2 style="color: #2d5a3d; font-size: 32px; letter-spacing: 5px; margin: 0;">${code}</h2>
            </div>
            <p>Ez a kód <strong>10 percig</strong> érvényes.</p>
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              Ha nem kért jelszó módosítást, nyugodtan hagyja figyelmen kívül ezt az emailt.
            </p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
              Ez egy automatikus email, kérjük ne válaszoljon rá.
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
    console.error("Error in send-password-reset-code function:", error);
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
