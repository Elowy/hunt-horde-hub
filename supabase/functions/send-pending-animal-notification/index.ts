import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PendingAnimalNotificationRequest {
  pendingAnimalId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pendingAnimalId }: PendingAnimalNotificationRequest = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Fetch pending animal details
    const { data: pendingAnimal, error: animalError } = await supabaseAdmin
      .from('pending_animals')
      .select(`
        *,
        storage_locations (
          name
        ),
        security_zones (
          name
        )
      `)
      .eq('id', pendingAnimalId)
      .single();

    if (animalError || !pendingAnimal) {
      console.error('Error fetching pending animal:', animalError);
      return new Response(
        JSON.stringify({ error: 'Pending animal not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get hunter society details
    const { data: hunterSociety, error: societyError } = await supabaseAdmin
      .from('profiles')
      .select('company_name')
      .eq('id', pendingAnimal.hunter_society_id)
      .single();

    if (societyError) {
      console.error('Error fetching hunter society:', societyError);
    }

    const hunterSocietyName = hunterSociety?.company_name || 'Vadásztársaság';

    // Get all admins and editors who should receive notifications
    const { data: recipients, error: recipientsError } = await supabaseAdmin
      .from('user_roles')
      .select(`
        user_id,
        profiles!inner (
          id,
          contact_email,
          company_name
        )
      `)
      .eq('profiles.id', pendingAnimal.hunter_society_id)
      .in('role', ['admin', 'editor']);

    if (recipientsError) {
      console.error('Error fetching recipients:', recipientsError);
      return new Response(
        JSON.stringify({ error: 'Error fetching recipients' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check notification settings for each recipient
    const emailPromises = [];
    
    for (const recipient of recipients || []) {
      // Check if user has email notifications enabled
      const { data: settings } = await supabaseAdmin
        .from('notification_settings')
        .select('notify_on_pending_animal')
        .eq('user_id', recipient.user_id)
        .single();

      // Skip if notifications are disabled (default is true if not set)
      if (settings && settings.notify_on_pending_animal === false) {
        continue;
      }

      const email = recipient.profiles?.contact_email;
      if (!email) continue;

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c5530;">🦌 Új állat jóváhagyásra vár</h2>
          
          <p>Üdvözöljük!</p>
          
          <p>Új állat került regisztrációra QR kód segítségével a következő adatokkal:</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Vadfaj:</strong> ${pendingAnimal.species || 'Nincs megadva'}</p>
            ${pendingAnimal.animal_id ? `<p><strong>Állat azonosító:</strong> ${pendingAnimal.animal_id}</p>` : ''}
            ${pendingAnimal.gender ? `<p><strong>Nem:</strong> ${pendingAnimal.gender}</p>` : ''}
            ${pendingAnimal.weight ? `<p><strong>Súly:</strong> ${pendingAnimal.weight} kg</p>` : ''}
            ${pendingAnimal.class ? `<p><strong>Osztály:</strong> ${pendingAnimal.class}</p>` : ''}
            ${pendingAnimal.age ? `<p><strong>Kor:</strong> ${pendingAnimal.age}</p>` : ''}
            ${pendingAnimal.hunter_name ? `<p><strong>Vadász neve:</strong> ${pendingAnimal.hunter_name}</p>` : ''}
            <p><strong>Hűtő:</strong> ${pendingAnimal.storage_locations?.name || 'Nincs megadva'}</p>
            ${pendingAnimal.security_zones?.name ? `<p><strong>Védőkörzet:</strong> ${pendingAnimal.security_zones.name}</p>` : ''}
            ${pendingAnimal.shooting_date ? `<p><strong>Kilövés dátuma:</strong> ${new Date(pendingAnimal.shooting_date).toLocaleDateString('hu-HU')}</p>` : ''}
            <p><strong>Beküldve:</strong> ${new Date(pendingAnimal.submitted_at).toLocaleString('hu-HU')}</p>
          </div>
          
          ${pendingAnimal.notes ? `
            <div style="background-color: #fff9e6; padding: 15px; border-left: 4px solid #ffcc00; margin: 20px 0;">
              <p><strong>Megjegyzések:</strong></p>
              <p>${pendingAnimal.notes}</p>
            </div>
          ` : ''}
          
          <p>Kérjük, lépjen be a rendszerbe az állat jóváhagyásához vagy elutasításához.</p>
          
          <div style="margin: 30px 0;">
            <a href="${Deno.env.get('SUPABASE_URL')?.replace('https://supabase.co', '')}/pending-animals" 
               style="background-color: #2c5530; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Jóváhagyásra váró állatok megtekintése
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #666; font-size: 12px;">
            Ez egy automatikus értesítés a ${hunterSocietyName} vadásztársaság rendszeréből.
            <br>
            Az értesítések testreszabhatók a Beállítások > Értesítések menüpontban.
          </p>
        </div>
      `;

      emailPromises.push(
        resend.emails.send({
          from: "Vadászat Kezelő <onboarding@resend.dev>",
          to: [email],
          subject: `🦌 Új állat jóváhagyásra vár - ${pendingAnimal.species || 'Állat'}`,
          html: emailHtml,
        })
      );
    }

    // Send all emails
    const results = await Promise.allSettled(emailPromises);
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failCount = results.filter(r => r.status === 'rejected').length;

    console.log(`Pending animal notification emails sent: ${successCount} successful, ${failCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true,
        sent: successCount,
        failed: failCount
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
    console.error("Error in send-pending-animal-notification function:", error);
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