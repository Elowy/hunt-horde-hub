import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface MembershipFeeNotificationRequest {
  user_email: string;
  user_name: string;
  period: string;
  amount: number;
  season_year: number;
  hunter_society_name: string;
}

const periodLabels: Record<string, string> = {
  first_half: "első félév",
  second_half: "második félév",
  full_year: "teljes év",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Hiányzó autorizáció");
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

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error("Nincs bejelentkezve");
    }

    const {
      user_email,
      user_name,
      period,
      amount,
      season_year,
      hunter_society_name,
    }: MembershipFeeNotificationRequest = await req.json();

    console.log("Tagdíj értesítés küldése:", { user_email, period, amount });

    // Check notification settings
    const { data: notificationSettings } = await supabaseClient
      .from("notification_settings")
      .select("notify_on_membership_fee")
      .eq("user_id", user.id)
      .maybeSingle();

    if (notificationSettings && !notificationSettings.notify_on_membership_fee) {
      console.log("Tagdíj értesítés kikapcsolva a felhasználónál");
      return new Response(
        JSON.stringify({ success: true, message: "Értesítés kikapcsolva" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const periodLabel = periodLabels[period] || period;
    const seasonLabel = `${season_year}/${season_year + 1}`;

    const emailResponse = await resend.emails.send({
      from: "Vadászat Nyilvántartó <onboarding@resend.dev>",
      to: [user_email],
      subject: `Új tagdíj fizetési értesítés - ${seasonLabel}`,
      html: `
        <h1>Új tagdíj fizetési értesítés</h1>
        <p>Kedves ${user_name}!</p>
        <p>Új tagdíj fizetési kötelezettség került kiküldésre.</p>
        
        <h2>Részletek:</h2>
        <ul>
          <li><strong>Vadásztársaság:</strong> ${hunter_society_name}</li>
          <li><strong>Idény:</strong> ${seasonLabel}</li>
          <li><strong>Időszak:</strong> ${periodLabel}</li>
          <li><strong>Összeg:</strong> ${amount.toLocaleString("hu-HU")} Ft</li>
        </ul>
        
        <p>Kérjük, hogy a tagdíjat a megadott határidőig egyenlítse ki.</p>
        <p>Az aktuális tagdíj állapotát a <a href="${Deno.env.get(
          "SITE_URL"
        )}/membership-payments">Tagdíjak</a> oldalon tudja megtekinteni.</p>
        
        <p>Üdvözlettel,<br>
        ${hunter_society_name}</p>
      `,
    });

    console.log("Email sikeresen elküldve:", emailResponse);

    // Create in-app notification
    const { error: notifError } = await supabaseClient
      .from("notifications")
      .insert({
        user_id: user.id,
        type: "membership_fee",
        title: "Új tagdíj fizetési értesítés",
        message: `Új ${periodLabel} tagdíj került kiküldésre a ${seasonLabel} idényre. Összeg: ${amount.toLocaleString(
          "hu-HU"
        )} Ft`,
        link: "/membership-payments",
      });

    if (notifError) {
      console.error("Értesítés létrehozási hiba:", notifError);
    }

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Hiba a tagdíj értesítés küldésében:", error);
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
