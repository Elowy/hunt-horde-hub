import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ProposalNotificationRequest {
  proposalId: string;
  type: 'new_proposal' | 'proposal_accepted';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { proposalId, type }: ProposalNotificationRequest = await req.json();
    
    console.log("Processing notification for proposal:", proposalId, "type:", type);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch proposal details with buyer and hunter society info
    const { data: proposal, error: proposalError } = await supabase
      .from("buyer_price_proposals")
      .select(`
        *,
        buyers!inner (
          company_name,
          contact_email,
          user_id
        ),
        profiles!buyer_price_proposals_hunter_society_id_fkey (
          company_name,
          contact_email,
          id
        )
      `)
      .eq("id", proposalId)
      .single();

    if (proposalError || !proposal) {
      console.error("Error fetching proposal:", proposalError);
      throw new Error("Proposal not found");
    }

    if (type === 'new_proposal') {
      // Get all admin emails for the hunter society
      const { data: admins, error: adminsError } = await supabase
        .from("user_roles")
        .select(`
          user_id,
          profiles!inner (
            contact_email,
            contact_name
          )
        `)
        .eq("role", "admin");

      if (adminsError) {
        console.error("Error fetching admins:", adminsError);
        throw new Error("Failed to fetch admins");
      }

      // Filter admins for the specific hunter society
      const societyAdmins = admins?.filter(admin => {
        return admin.user_id === proposal.hunter_society_id;
      });

      if (!societyAdmins || societyAdmins.length === 0) {
        console.log("No admins found for hunter society");
        return new Response(
          JSON.stringify({ message: "No admins to notify" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Send email to each admin
      for (const admin of societyAdmins) {
        const adminEmail = admin.profiles.contact_email;
        if (!adminEmail) continue;

        const emailResponse = await resend.emails.send({
          from: "Vadgondnok <onboarding@resend.dev>",
          to: [adminEmail],
          subject: "Új árjavaslat érkezett",
          html: `
            <h1>Új árjavaslat érkezett</h1>
            <p>Tisztelt ${admin.profiles.contact_name || 'Admin'}!</p>
            <p><strong>${proposal.buyers.company_name}</strong> árjavaslat küldött Önöknek:</p>
            <ul>
              <li><strong>Faj:</strong> ${proposal.species}</li>
              <li><strong>Osztály:</strong> ${proposal.class}</li>
              <li><strong>Ár:</strong> ${proposal.price_per_kg} Ft/kg</li>
              ${proposal.notes ? `<li><strong>Megjegyzés:</strong> ${proposal.notes}</li>` : ''}
            </ul>
            <p>Kérjük, jelentkezzen be a rendszerbe az árjavaslat áttekintéséhez és elfogadásához.</p>
            <p>Üdvözlettel,<br>Vadgondnok Csapat</p>
          `,
        });

        console.log("Email sent to admin:", adminEmail, emailResponse);
      }
    } else if (type === 'proposal_accepted') {
      // Send email to buyer
      const buyerEmail = proposal.buyers.contact_email;
      
      if (!buyerEmail) {
        console.log("No buyer email found");
        return new Response(
          JSON.stringify({ message: "No buyer email to notify" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const emailResponse = await resend.emails.send({
        from: "Vadgondnok <onboarding@resend.dev>",
        to: [buyerEmail],
        subject: "Árjavaslat elfogadva",
        html: `
          <h1>Árjavaslat elfogadva</h1>
          <p>Tisztelt ${proposal.buyers.company_name}!</p>
          <p><strong>${proposal.profiles.company_name}</strong> elfogadta az alábbi árjavaslatot:</p>
          <ul>
            <li><strong>Faj:</strong> ${proposal.species}</li>
            <li><strong>Osztály:</strong> ${proposal.class}</li>
            <li><strong>Ár:</strong> ${proposal.price_per_kg} Ft/kg</li>
          </ul>
          <p>Gratulálunk! Az árjavaslat aktív és érvényes.</p>
          <p>Üdvözlettel,<br>Vadgondnok Csapat</p>
        `,
      });

      console.log("Email sent to buyer:", buyerEmail, emailResponse);
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-price-proposal-notification function:", error);
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