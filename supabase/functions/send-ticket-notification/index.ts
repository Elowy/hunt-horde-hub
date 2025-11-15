import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TicketNotificationRequest {
  ticketId: string;
  type: "comment" | "status_change";
  newStatus?: string;
  commentText?: string;
  commenterName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("[TICKET-NOTIFICATION] Function invoked");

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

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[TICKET-NOTIFICATION] No authorization header");
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      console.error("[TICKET-NOTIFICATION] Authentication error:", userError);
      throw new Error("Authentication failed");
    }

    console.log("[TICKET-NOTIFICATION] User authenticated:", userData.user.id);

    const { ticketId, type, newStatus, commentText, commenterName }: TicketNotificationRequest = await req.json();

    console.log("[TICKET-NOTIFICATION] Request data:", { ticketId, type, newStatus });

    // Fetch ticket details
    const { data: ticket, error: ticketError } = await supabaseClient
      .from("tickets")
      .select("*, user_id")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      console.error("[TICKET-NOTIFICATION] Ticket not found:", ticketError);
      throw new Error("Ticket not found");
    }

    console.log("[TICKET-NOTIFICATION] Ticket found:", ticket.id);

    // Get ticket owner's email from auth.users
    const { data: { user: ticketOwner }, error: ownerError } = await supabaseClient.auth.admin.getUserById(
      ticket.user_id
    );

    if (ownerError || !ticketOwner?.email) {
      console.error("[TICKET-NOTIFICATION] Ticket owner not found:", ownerError);
      throw new Error("Ticket owner email not found");
    }

    console.log("[TICKET-NOTIFICATION] Ticket owner email:", ticketOwner.email);

    // Get ticket owner's profile for name
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("contact_name, company_name")
      .eq("id", ticket.user_id)
      .single();

    const userName = profile?.contact_name || profile?.company_name || "Felhasználó";

    let subject = "";
    let htmlContent = "";

    if (type === "comment") {
      subject = `Új válasz érkezett a támogatási jegyére: ${ticket.subject}`;
      htmlContent = `
        <h2>Új válasz érkezett a támogatási jegyére</h2>
        <p>Kedves ${userName}!</p>
        <p>Új válasz érkezett a következő támogatási jegyére:</p>
        <h3>${ticket.subject}</h3>
        <p><strong>Kategória:</strong> ${ticket.category}</p>
        <p><strong>Válasz ${commenterName ? `(${commenterName})` : ""}:</strong></p>
        <blockquote style="background: #f5f5f5; padding: 15px; border-left: 4px solid #0066cc; margin: 20px 0;">
          ${commentText || ""}
        </blockquote>
        <p>Válaszolhat a jegyre az alábbi linken keresztül az alkalmazásban.</p>
        <p>Üdvözlettel,<br>Támogatási Csapat</p>
      `;
    } else if (type === "status_change") {
      const statusText = {
        open: "Nyitott",
        in_progress: "Folyamatban",
        closed: "Lezárva"
      }[newStatus || ""] || newStatus;

      subject = `Támogatási jegy státusza megváltozott: ${ticket.subject}`;
      htmlContent = `
        <h2>Támogatási jegy státusza megváltozott</h2>
        <p>Kedves ${userName}!</p>
        <p>A következő támogatási jegyének státusza megváltozott:</p>
        <h3>${ticket.subject}</h3>
        <p><strong>Kategória:</strong> ${ticket.category}</p>
        <p><strong>Új státusz:</strong> <span style="background: #0066cc; color: white; padding: 4px 12px; border-radius: 4px;">${statusText}</span></p>
        ${newStatus === "closed" ? "<p>A jegy lezárásra került. Ha továbbra is segítségre van szüksége, kérjük nyisson új támogatási jegyet.</p>" : "<p>A támogatási csapatunk dolgozik a problémán.</p>"}
        <p>Üdvözlettel,<br>Támogatási Csapat</p>
      `;
    }

    console.log("[TICKET-NOTIFICATION] Sending email to:", ticketOwner.email);

    // Send email
    const emailResponse = await resend.emails.send({
      from: "Támogatás <onboarding@resend.dev>",
      to: [ticketOwner.email],
      subject: subject,
      html: htmlContent,
    });

    console.log("[TICKET-NOTIFICATION] Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("[TICKET-NOTIFICATION] Error:", error);
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
