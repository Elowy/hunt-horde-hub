import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  notification_type: 'transport' | 'storage_full' | 'animal_add' | 'animal_update' | 'animal_delete' | 'registration_approved' | 'registration_rejected';
  data: any;
  ip_address?: string;
}

const escapeHtml = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[&<>"']/g, (m) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m] || m
  ));
};
const e = escapeHtml;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Authentication failed");

    const user = userData.user;
    const { notification_type, data, ip_address }: NotificationRequest = await req.json();

    // Ellenőrizzük, hogy a felhasználó kért-e értesítést erről
    const { data: settings } = await supabaseClient
      .from("notification_settings")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!settings) {
      return new Response(JSON.stringify({ message: "No notification settings found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ellenőrizzük a beállításokat
    const shouldNotify = {
      transport: settings.notify_on_transport,
      storage_full: settings.notify_on_storage_full,
      animal_add: settings.notify_on_animal_add,
      animal_update: settings.notify_on_animal_update,
      animal_delete: settings.notify_on_animal_delete,
      registration_approved: settings.notify_on_registration_approved,
      registration_rejected: settings.notify_on_registration_rejected,
    }[notification_type];

    if (!shouldNotify) {
      return new Response(JSON.stringify({ message: "User disabled this notification" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Email profil lekérése
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("contact_email, company_name")
      .eq("id", user.id)
      .single();

    const userEmail = profile?.contact_email || user.email;
    if (!userEmail) throw new Error("No email found for user");

    // Email tartalom összeállítása
    const emailSubject = {
      transport: "Új elszállítás történt",
      storage_full: "Hűtő telítettség figyelmeztetés",
      animal_add: "Új vad hozzáadva",
      animal_update: "Vad módosítva",
      animal_delete: "Vad törölve",
      registration_approved: "Beiratkozás jóváhagyva",
      registration_rejected: "Beiratkozás elutasítva",
    }[notification_type];

    const emailBody = generateEmailBody(notification_type, data, ip_address);

    // Email küldése
    const emailResponse = await resend.emails.send({
      from: "Vadászati Hűtés Kezelő <onboarding@resend.dev>",
      to: [userEmail],
      subject: emailSubject,
      html: emailBody,
    });

    // Napló mentése
    await supabaseClient.from("notification_logs").insert({
      user_id: user.id,
      notification_type,
      email_sent: true,
      email_data: data,
      ip_address,
    });

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[INTERNAL] Error sending notification:", error);
    return new Response(JSON.stringify({ error: "Az értesítés küldése nem sikerült." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

function generateEmailBody(type: string, data: any, ip: string = "Ismeretlen"): string {
  let content = "";

  switch (type) {
    case "transport":
      content = `
        <h2>Elszállítás történt</h2>
        <p><strong>Szállító:</strong> ${e(data.transporter_name || "Ismeretlen")}</p>
        <p><strong>Dokumentumszám:</strong> ${e(data.document_number)}</p>
        <p><strong>Dátum:</strong> ${e(new Date(data.transport_date).toLocaleDateString('hu-HU'))}</p>
        <p><strong>Állatok száma:</strong> ${e(data.animal_count)}</p>
        <p><strong>Össz súly:</strong> ${e(data.total_weight)} kg</p>
        <p><strong>Össz ár:</strong> ${e(Number(data.total_price).toLocaleString('hu-HU'))} Ft</p>
      `;
      break;
    case "storage_full":
      content = `
        <h2>Hűtő telítettség figyelmeztetés</h2>
        <p><strong>Helyszín:</strong> ${e(data.location_name)}</p>
        <p><strong>Telítettség:</strong> ${e(data.usage_percentage)}%</p>
        <p><strong>Kapacitás:</strong> ${e(data.capacity)}</p>
        <p><strong>Jelenlegi állatok:</strong> ${e(data.current_count)}</p>
      `;
      break;
    case "animal_add":
      content = `
        <h2>Új vad hozzáadva</h2>
        <p><strong>Állat ID:</strong> ${e(data.animal_id)}</p>
        <p><strong>Faj:</strong> ${e(data.species)}</p>
        <p><strong>Súly:</strong> ${e(data.weight || "-")} kg</p>
        <p><strong>Osztály:</strong> ${e(data.class || "-")}</p>
        <p><strong>Hűtési helyszín:</strong> ${e(data.location_name)}</p>
      `;
      break;
    case "animal_update":
      content = `
        <h2>Vad módosítva</h2>
        <p><strong>Állat ID:</strong> ${e(data.animal_id)}</p>
        <p><strong>Faj:</strong> ${e(data.species)}</p>
        <p><strong>Módosított mezők:</strong></p>
        <ul>
          ${Object.keys(data.changes || {}).map(key => 
            `<li><strong>${e(key)}:</strong> ${e(data.changes[key].old)} → ${e(data.changes[key].new)}</li>`
          ).join('')}
        </ul>
      `;
      break;
    case "animal_delete":
      content = `
        <h2>Vad törölve</h2>
        <p><strong>Állat ID:</strong> ${e(data.animal_id)}</p>
        <p><strong>Faj:</strong> ${e(data.species)}</p>
        <p><strong>Súly:</strong> ${e(data.weight || "-")} kg</p>
        <p><strong>Hűtési helyszín:</strong> ${e(data.location_name)}</p>
      `;
      break;
    case "registration_approved":
      content = `
        <h2>Beiratkozás jóváhagyva</h2>
        <p>Örömmel értesítjük, hogy a vadászati beiratkozási kérelme <strong>jóváhagyásra került</strong>.</p>
        <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
          <h3 style="margin-top: 0;">Beiratkozás részletei:</h3>
          <p><strong>Vadászterület:</strong> ${e(data.security_zone_name || 'N/A')}</p>
          ${data.hunting_location_name ? `<p><strong>Helyszín:</strong> ${e(data.hunting_location_name)}</p>` : ''}
          <p><strong>Kezdés:</strong> ${e(data.start_time ? new Date(data.start_time).toLocaleString('hu-HU') : 'N/A')}</p>
          <p><strong>Befejezés:</strong> ${e(data.end_time ? new Date(data.end_time).toLocaleString('hu-HU') : 'N/A')}</p>
          ${data.admin_note ? `<p><strong>Admin megjegyzés:</strong> ${e(data.admin_note)}</p>` : ''}
        </div>
        <p>A beiratkozás részleteit az alkalmazásban is megtekintheti.</p>
        <p>Kellemes vadászatot kívánunk!</p>
      `;
      break;
    case "registration_rejected":
      content = `
        <h2>Beiratkozás elutasítva</h2>
        <p>Sajnálattal értesítjük, hogy a vadászati beiratkozási kérelmét <strong>elutasították</strong>.</p>
        <div style="background: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
          <h3 style="margin-top: 0;">Beiratkozás részletei:</h3>
          <p><strong>Vadászterület:</strong> ${e(data.security_zone_name || 'N/A')}</p>
          ${data.hunting_location_name ? `<p><strong>Helyszín:</strong> ${e(data.hunting_location_name)}</p>` : ''}
          <p><strong>Kért kezdés:</strong> ${e(data.start_time ? new Date(data.start_time).toLocaleString('hu-HU') : 'N/A')}</p>
          <p><strong>Kért befejezés:</strong> ${e(data.end_time ? new Date(data.end_time).toLocaleString('hu-HU') : 'N/A')}</p>
          ${data.admin_note ? `<p><strong>Elutasítás oka:</strong> ${e(data.admin_note)}</p>` : ''}
        </div>
        <p>További információkért kérjük, vegye fel a kapcsolatot az adminisztrátorral.</p>
      `;
      break;
  }

  const safeIp = e(ip);
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          h2 { color: #2d5016; }
          .info { background: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 0.9em; color: #666; }
        </style>
      </head>
      <body>
        <div class="info">
          ${content}
        </div>
        <div class="footer">
          <p><strong>IP cím:</strong> ${safeIp}</p>
          <p><strong>Időpont:</strong> ${new Date().toLocaleString('hu-HU')}</p>
          <hr>
          <p>Ez egy automatikus értesítés a Vadászati Hűtés Kezelő rendszerből.</p>
          <p>Az értesítési beállításokat a Beállítások menüpontban módosíthatja.</p>
        </div>
      </body>
    </html>
  `;
}

serve(handler);
