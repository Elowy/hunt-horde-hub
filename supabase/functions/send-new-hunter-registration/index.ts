import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NewHunterNotificationRequest {
  hunterId: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("[NEW-HUNTER-REGISTRATION] Function invoked");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { hunterId }: NewHunterNotificationRequest = await req.json();

    console.log("[NEW-HUNTER-REGISTRATION] Processing hunter:", hunterId);

    // Fetch hunter details
    const { data: hunter, error: hunterError } = await supabaseClient
      .from("profiles")
      .select("id, contact_name, contact_email, hunter_license_number, hunter_society_id, created_at")
      .eq("id", hunterId)
      .single();

    if (hunterError || !hunter) {
      console.error("[NEW-HUNTER-REGISTRATION] Hunter not found:", hunterError);
      throw new Error("Hunter not found");
    }

    console.log("[NEW-HUNTER-REGISTRATION] Hunter found, society:", hunter.hunter_society_id);

    // Get admins and editors for this hunter society
    const { data: adminRoles, error: rolesError } = await supabaseClient
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["admin", "editor"]);

    if (rolesError) {
      console.error("[NEW-HUNTER-REGISTRATION] Error fetching roles:", rolesError);
      throw new Error("Failed to fetch admin roles");
    }

    if (!adminRoles || adminRoles.length === 0) {
      console.log("[NEW-HUNTER-REGISTRATION] No admins/editors found");
      return new Response(
        JSON.stringify({ success: true, message: "No admins to notify" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Filter admins/editors who belong to the hunter's society
    const { data: adminProfiles } = await supabaseClient
      .from("profiles")
      .select(`
        id,
        contact_email,
        contact_name,
        notification_settings (
          notify_on_new_hunter_registration
        )
      `)
      .in("id", adminRoles.map(r => r.user_id))
      .eq("id", hunter.hunter_society_id);

    if (!adminProfiles || adminProfiles.length === 0) {
      console.log("[NEW-HUNTER-REGISTRATION] No admins for this society");
      return new Response(
        JSON.stringify({ success: true, message: "No admins for society" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("[NEW-HUNTER-REGISTRATION] Found", adminProfiles.length, "admin(s)");

    // Send emails to admins who have notifications enabled
    let emailsSent = 0;
    
    for (const admin of adminProfiles) {
      // Check notification settings
      const notifyEnabled = admin.notification_settings?.[0]?.notify_on_new_hunter_registration !== false;
      
      if (!notifyEnabled) {
        console.log(`[NEW-HUNTER-REGISTRATION] Admin ${admin.id} has notifications disabled`);
        continue;
      }

      // Get admin's auth email
      const { data: { user: adminUser } } = await supabaseClient.auth.admin.getUserById(admin.id);
      if (!adminUser?.email) {
        console.log(`[NEW-HUNTER-REGISTRATION] No email for admin ${admin.id}`);
        continue;
      }

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2d5016;">Új vadász regisztráció</h2>
          <p>Tisztelt ${admin.contact_name || "Adminisztrátor"}!</p>
          <p>Új vadász regisztrált a rendszerben és jóváhagyásra vár:</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #2d5016;">Regisztráció részletei:</h3>
            <p><strong>Név:</strong> ${hunter.contact_name || "N/A"}</p>
            <p><strong>Email:</strong> ${hunter.contact_email || "N/A"}</p>
            <p><strong>Vadászjegy szám:</strong> ${hunter.hunter_license_number || "N/A"}</p>
            <p><strong>Regisztráció időpontja:</strong> ${new Date(hunter.created_at).toLocaleString("hu-HU")}</p>
          </div>

          <p>Kérjük, lépjen be az alkalmazásba a regisztráció jóváhagyásához vagy elutasításához.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${req.headers.get("origin") || "https://vadgondnok.lovable.app"}/users" 
               style="background-color: #2d5016; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              Felhasználók kezelése
            </a>
          </div>
          
          <p>Üdvözlettel,<br>Vadgondnok Csapat</p>
        </div>
      `;

      try {
        const emailResponse = await resend.emails.send({
          from: "Vadgondnok <onboarding@resend.dev>",
          to: [adminUser.email],
          subject: "Új vadász regisztráció jóváhagyásra vár",
          html: htmlContent,
        });

        console.log(`[NEW-HUNTER-REGISTRATION] Email sent to ${adminUser.email}:`, emailResponse.data?.id);
        emailsSent++;
      } catch (emailError) {
        console.error(`[NEW-HUNTER-REGISTRATION] Failed to send email to ${adminUser.email}:`, emailError);
      }
    }

    console.log(`[NEW-HUNTER-REGISTRATION] Total emails sent: ${emailsSent}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsSent,
        totalAdmins: adminProfiles.length 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("[NEW-HUNTER-REGISTRATION] Error:", error);
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
