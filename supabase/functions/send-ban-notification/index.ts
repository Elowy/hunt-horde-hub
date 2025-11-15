import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { Resend } from 'npm:resend@2.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BanNotificationRequest {
  userId: string;
  userEmail: string;
  action: 'ban' | 'unban';
  bannedUntil?: string | null;
  banReason?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Ban notification request received');

    const { userId, userEmail, action, bannedUntil, banReason }: BanNotificationRequest = await req.json();

    if (!userId || !userEmail || !action) {
      return new Response(
        JSON.stringify({ error: 'Hiányzó adatok' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending ${action} notification to:`, userEmail);

    // Get admin info who performed the action
    const authHeader = req.headers.get('authorization');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader! },
        },
      }
    );

    const { data: { user: adminUser } } = await supabaseClient.auth.getUser();
    
    let adminEmail = 'A rendszer adminisztrátora';
    if (adminUser) {
      const { data: adminProfile } = await supabaseClient
        .from('profiles')
        .select('contact_email, contact_name, company_name')
        .eq('id', adminUser.id)
        .single();
      
      if (adminProfile) {
        adminEmail = adminProfile.contact_name || adminProfile.company_name || adminProfile.contact_email || adminEmail;
      }
    }

    let subject: string;
    let htmlContent: string;

    if (action === 'ban') {
      const isPermanent = bannedUntil && new Date(bannedUntil).getFullYear() >= 2100;
      const banUntilDate = bannedUntil ? new Date(bannedUntil).toLocaleDateString('hu-HU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }) : '';

      subject = 'Fiókja ideiglenesen felfüggesztésre került - Vadgondok';
      htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #2d5016 0%, #4a7c2c 100%);
                color: white;
                padding: 30px;
                text-align: center;
                border-radius: 8px 8px 0 0;
              }
              .content {
                background: #f9f9f9;
                padding: 30px;
                border: 1px solid #ddd;
                border-top: none;
              }
              .alert-box {
                background: #fee;
                border-left: 4px solid #c00;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
              }
              .info-box {
                background: #e8f4f8;
                border-left: 4px solid #0066cc;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
              }
              .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #ddd;
                color: #666;
                font-size: 14px;
              }
              strong {
                color: #2d5016;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 style="margin: 0;">🚫 Fiók felfüggesztés</h1>
            </div>
            <div class="content">
              <p>Tisztelt Felhasználó!</p>
              
              <div class="alert-box">
                <strong>⚠️ A Vadgondok rendszerben lévő fiókja felfüggesztésre került.</strong>
              </div>

              <p><strong>Felfüggesztés időtartama:</strong></p>
              <p style="font-size: 18px; color: #c00;">
                ${isPermanent ? '🔒 Végleges felfüggesztés' : `📅 ${banUntilDate}-ig`}
              </p>

              ${banReason ? `
                <div class="info-box">
                  <p><strong>Indoklás:</strong></p>
                  <p>${banReason}</p>
                </div>
              ` : ''}

              <p>A felfüggesztés időtartama alatt nem tud belépni a rendszerbe.</p>

              <p><strong>Mit tegyen?</strong></p>
              <ul>
                <li>Ha úgy érzi, hogy a felfüggesztés nem indokolt, kérjük, vegye fel a kapcsolatot adminisztrátorunkkal</li>
                <li>Kérdés esetén válaszoljon erre az emailre vagy keressen minket az elérhetőségeinken</li>
              </ul>

              <p style="margin-top: 30px;">
                <em>Ezt a felfüggesztést végrehajtotta: ${adminEmail}</em>
              </p>

              <div class="footer">
                <p><strong>Vadgondok</strong><br>
                Vadászati Adminisztrációs Rendszer</p>
                <p style="font-size: 12px; color: #999;">
                  Ez egy automatikus értesítés, kérjük ne válaszoljon közvetlenül erre az emailre.
                </p>
              </div>
            </div>
          </body>
        </html>
      `;
    } else {
      // unban
      subject = 'Fiókja aktiválásra került - Vadgondok';
      htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #2d5016 0%, #4a7c2c 100%);
                color: white;
                padding: 30px;
                text-align: center;
                border-radius: 8px 8px 0 0;
              }
              .content {
                background: #f9f9f9;
                padding: 30px;
                border: 1px solid #ddd;
                border-top: none;
              }
              .success-box {
                background: #e8f5e9;
                border-left: 4px solid #4caf50;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
              }
              .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #ddd;
                color: #666;
                font-size: 14px;
              }
              .btn {
                display: inline-block;
                padding: 12px 30px;
                background: #4a7c2c;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                margin: 20px 0;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 style="margin: 0;">✅ Fiók aktiválva</h1>
            </div>
            <div class="content">
              <p>Tisztelt Felhasználó!</p>
              
              <div class="success-box">
                <strong>🎉 Örömmel értesítjük, hogy a Vadgondok rendszerben lévő fiókja újra aktiválásra került!</strong>
              </div>

              <p>Ismét teljes körűen használhatja a rendszer összes funkcióját.</p>

              <p style="text-align: center;">
                <a href="${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovableproject.com') || 'https://vadgondok.hu'}" class="btn">
                  Bejelentkezés a rendszerbe
                </a>
              </p>

              <p><strong>Mit tehet most?</strong></p>
              <ul>
                <li>Jelentkezzen be a megszokott email címével és jelszavával</li>
                <li>Folytassa a vadászati adminisztráció kezelését</li>
                <li>Vegye fel a kapcsolatot az adminisztrátorral, ha további kérdése van</li>
              </ul>

              <p style="margin-top: 30px;">
                <em>A fiókot újra aktiválta: ${adminEmail}</em>
              </p>

              <div class="footer">
                <p><strong>Vadgondok</strong><br>
                Vadászati Adminisztrációs Rendszer</p>
                <p style="font-size: 12px; color: #999;">
                  Ez egy automatikus értesítés, kérjük ne válaszoljon közvetlenül erre az emailre.
                </p>
              </div>
            </div>
          </body>
        </html>
      `;
    }

    // Send email using Resend
    const emailResponse = await resend.emails.send({
      from: 'Vadgondok <onboarding@resend.dev>',
      to: [userEmail],
      subject: subject,
      html: htmlContent,
    });

    console.log('Email sent successfully:', emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in send-ban-notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
