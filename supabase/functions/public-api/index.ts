import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace("/functions/v1/public-api", "");
    const method = req.method;

    // Extract and verify API key or JWT token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized: Missing Authorization header",
          hint: "Use: Authorization: Bearer YOUR_JWT_TOKEN",
        }),
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    // Verify token and get user
    const userClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const userId = user.id;
    const adminClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    );

    // ───────────────────────────────────────────────────────
    // GET /leads - Fetch all leads for this user
    // ───────────────────────────────────────────────────────
    if (method === "GET" && path === "/leads") {
      const { data: leads, error } = await adminClient
        .from("leads")
        .select("*")
        .eq("agent_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: corsHeaders,
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          count: leads?.length || 0,
          data: leads || [],
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ───────────────────────────────────────────────────────
    // POST /leads/conversion - Log a deal closed
    // ───────────────────────────────────────────────────────
    if (method === "POST" && path === "/leads/conversion") {
      const body = await req.json();
      const { lead_id, conversion_value, conversion_source, conversion_notes } = body;

      if (!lead_id) {
        return new Response(
          JSON.stringify({ error: "Missing required field: lead_id" }),
          { status: 400, headers: corsHeaders }
        );
      }

      // Verify lead belongs to this user
      const { data: lead, error: leadError } = await adminClient
        .from("leads")
        .select("id")
        .eq("id", lead_id)
        .eq("agent_id", userId)
        .single();

      if (leadError || !lead) {
        return new Response(
          JSON.stringify({ error: "Lead not found or access denied" }),
          { status: 404, headers: corsHeaders }
        );
      }

      // Update lead with conversion data
      const { error: updateError } = await adminClient
        .from("leads")
        .update({
          stage: "closed",
          converted_at: new Date().toISOString(),
          conversion_value: conversion_value || null,
          conversion_source: conversion_source || null,
          conversion_notes: conversion_notes || null,
        })
        .eq("id", lead_id);

      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: corsHeaders,
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Lead ${lead_id} marked as converted`,
          data: { lead_id, converted_at: new Date().toISOString() },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ───────────────────────────────────────────────────────
    // GET /analytics - View conversion analytics
    // ───────────────────────────────────────────────────────
    if (method === "GET" && path === "/analytics") {
      const { data: leads, error } = await adminClient
        .from("leads")
        .select("*")
        .eq("agent_id", userId);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: corsHeaders,
        });
      }

      const allLeads = leads || [];
      const conversions = allLeads.filter((l: any) => l.stage === "closed");

      // Group by source
      const bySource: { [key: string]: any } = {};
      allLeads.forEach((lead: any) => {
        const source = lead.conversion_source || lead.source || "unknown";
        if (!bySource[source]) {
          bySource[source] = {
            source,
            total_leads: 0,
            conversions: 0,
            conversion_rate: 0,
            total_value: 0,
          };
        }
        bySource[source].total_leads += 1;
        if (lead.stage === "closed") {
          bySource[source].conversions += 1;
          bySource[source].total_value += lead.conversion_value || 0;
        }
      });

      // Calculate conversion rates
      Object.keys(bySource).forEach((source) => {
        const s = bySource[source];
        s.conversion_rate =
          s.total_leads > 0 ? ((s.conversions / s.total_leads) * 100).toFixed(1) : 0;
      });

      const analytics = {
        success: true,
        summary: {
          total_leads: allLeads.length,
          total_conversions: conversions.length,
          overall_conversion_rate:
            allLeads.length > 0
              ? ((conversions.length / allLeads.length) * 100).toFixed(1)
              : 0,
          total_conversion_value: conversions.reduce(
            (sum: number, l: any) => sum + (l.conversion_value || 0),
            0
          ),
        },
        by_source: Object.values(bySource),
      };

      return new Response(JSON.stringify(analytics), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ───────────────────────────────────────────────────────
    // GET /leads/:id - Fetch a single lead
    // ───────────────────────────────────────────────────────
    if (method === "GET" && path.startsWith("/leads/")) {
      const leadId = path.replace("/leads/", "");
      const { data: lead, error } = await adminClient
        .from("leads")
        .select("*")
        .eq("id", leadId)
        .eq("agent_id", userId)
        .single();

      if (error || !lead) {
        return new Response(
          JSON.stringify({ error: "Lead not found" }),
          { status: 404, headers: corsHeaders }
        );
      }

      return new Response(JSON.stringify({ success: true, data: lead }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default 404
    return new Response(
      JSON.stringify({
        error: "Endpoint not found",
        hint: `${method} ${path} does not exist. Try GET /leads, POST /leads/conversion, or GET /analytics`,
      }),
      { status: 404, headers: corsHeaders }
    );
  } catch (error) {
    console.error("API error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error: " + String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
