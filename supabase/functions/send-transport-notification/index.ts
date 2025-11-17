import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TransportNotificationRequest {
  transportDocumentId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transportDocumentId }: TransportNotificationRequest = await req.json();
    
    console.log("Processing transport notification for:", transportDocumentId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch transport document details with buyer info
    const { data: transportDoc, error: transportError } = await supabase
      .from("transport_documents")
      .select(`
        *,
        buyers!inner (
          company_name,
          contact_email,
          user_id
        )
      `)
      .eq("id", transportDocumentId)
      .single();

    if (transportError || !transportDoc || !transportDoc.buyer_id) {
      console.error("Error fetching transport document or no buyer:", transportError);
      return new Response(
        JSON.stringify({ message: "No buyer to notify" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get hunter society info
    const { data: hunterSociety, error: societyError } = await supabase
      .from("profiles")
      .select("company_name")
      .eq("id", transportDoc.user_id)
      .single();

    if (societyError) {
      console.error("Error fetching hunter society:", societyError);
      throw new Error("Failed to fetch hunter society info");
    }

    const buyerEmail = transportDoc.buyers.contact_email;
    
    if (!buyerEmail) {
      console.log("No buyer email found");
      return new Response(
        JSON.stringify({ message: "No buyer email to notify" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send email to buyer
    const emailResponse = await resend.emails.send({
      from: "Vadgondnok <onboarding@resend.dev>",
      to: [buyerEmail],
      subject: "Új elszállító dokumentum",
      html: `
        <h1>Új elszállító dokumentum készült</h1>
        <p>Tisztelt ${transportDoc.buyers.company_name}!</p>
        <p><strong>${hunterSociety.company_name}</strong> új elszállító dokumentumot készített:</p>
        <ul>
          <li><strong>Bizonylat szám:</strong> ${transportDoc.document_number}</li>
          <li><strong>Dátum:</strong> ${new Date(transportDoc.transport_date).toLocaleDateString('hu-HU')}</li>
          <li><strong>Állatok száma:</strong> ${transportDoc.animal_count} db</li>
          <li><strong>Összes súly:</strong> ${transportDoc.total_weight.toFixed(2)} kg</li>
          <li><strong>Összérték:</strong> ${Math.round(transportDoc.total_price).toLocaleString('hu-HU')} Ft</li>
        </ul>
        <p>Kérjük, jelentkezzen be a rendszerbe az elszállító megtekintéséhez.</p>
        <p>Üdvözlettel,<br>Vadgondnok Csapat</p>
      `,
    });

    console.log("Email sent to buyer:", buyerEmail, emailResponse);

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
    console.error("Error in send-transport-notification function:", error);
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
