import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const agentId = pathParts[pathParts.length - 2]; // /webhook/lead/{agent_id}/{secret}
    const secretKey = pathParts[pathParts.length - 1];

    if (!agentId || !secretKey) {
      return new Response(
        JSON.stringify({ error: "Invalid webhook URL format" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const body = await req.json();
    console.log(`Google Ads webhook received for agent ${agentId}`, body);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase environment variables");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseKey);

    // Verify the webhook secret key matches
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("webhook_secret, email, phone")
      .eq("id", agentId)
      .single();

    if (profileError || !profile) {
      console.error("Agent not found:", agentId);
      return new Response(JSON.stringify({ error: "Agent not found" }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    // Verify secret key
    if (profile.webhook_secret !== secretKey) {
      console.error("Invalid webhook secret for agent:", agentId);
      return new Response(JSON.stringify({ error: "Invalid webhook secret" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    // Parse Google Ads Lead Form payload
    // Google sends: { lead_id, form_id, campaign_id, google_key, user_column_data: [...] }
    const googleKey = body.google_key;
    const campaignId = body.campaign_id || "google_ads";
    const userColumns = body.user_column_data || [];

    // Extract lead data from user_column_data array
    const leadData: { [key: string]: string } = {};
    userColumns.forEach((col: any) => {
      const columnId = col.column_id; // e.g., "FIRST_NAME", "EMAIL", "PHONE_NUMBER"
      const value = col.string_value || "";

      if (columnId === "FIRST_NAME") leadData.firstName = value;
      if (columnId === "LAST_NAME") leadData.lastName = value;
      if (columnId === "EMAIL") leadData.email = value;
      if (columnId === "PHONE_NUMBER") leadData.phone = value;
      if (columnId === "PROPERTY_ADDRESS") leadData.propertyAddress = value;
      if (columnId === "PROPERTY_TYPE") leadData.propertyType = value;
      if (columnId === "LEAD_TYPE") leadData.leadType = value; // e.g., "Buyer", "Seller"
    });

    // Validate required fields
    if (!leadData.email && !leadData.phone) {
      return new Response(
        JSON.stringify({
          error: "Lead must have at least email or phone number",
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    const name = `${leadData.firstName || ""} ${leadData.lastName || ""}`.trim() || "Unknown Lead";

    // Create lead in database
    const leadId = crypto.randomUUID();
    const { error: leadError } = await adminClient.from("leads").insert({
      id: leadId,
      agent_id: agentId,
      name: name,
      email: leadData.email || null,
      phone: leadData.phone || null,
      source: "Google Ads",
      type: leadData.leadType || "Buyer",
      stage: "New",
      notes: `Property: ${leadData.propertyAddress || "Not specified"} | Type: ${leadData.propertyType || "Not specified"} | Campaign: ${campaignId}`,
      tags: ["Google Ads", `campaign_${campaignId}`],
      conversion_source: "google_ads",
      last_contact: new Date().toISOString().split("T")[0],
    });

    if (leadError) {
      console.error("Error creating lead:", leadError);
      return new Response(
        JSON.stringify({ error: "Failed to create lead: " + leadError.message }),
        { status: 500, headers: corsHeaders }
      );
    }

    console.log(`Lead created successfully: ${leadId}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Lead captured and stored",
        lead_id: leadId,
        agent_id: agentId,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: "Webhook processing failed: " + String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
