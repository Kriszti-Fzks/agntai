import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseKey || !supabaseAnonKey) {
      console.error("Missing Supabase environment variables");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    // Create client with service role for admin operations
    const adminClient = createClient(supabaseUrl, supabaseKey);

    // Verify user token
    const {
      data: { user },
      error: authError,
    } = await adminClient.auth.admin.getUserById(token.split(".")[0]);

    if (authError) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Invalid authentication token" }),
        {
          status: 401,
          headers: corsHeaders,
        }
      );
    }

    // Try using user client to verify token
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const {
      data: { user: tokenUser },
      error: tokenError,
    } = await userClient.auth.getUser();

    if (tokenError || !tokenUser) {
      console.error("Token verification error:", tokenError);
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const userId = tokenUser.id;
    console.log(`Starting data export for user: ${userId}`);

    // Fetch leads for this user
    const { data: leads, error: leadsError } = await adminClient
      .from("leads")
      .select("*")
      .eq("agent_id", userId);

    if (leadsError) {
      console.error("Error fetching leads:", leadsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch leads: " + leadsError.message }),
        { status: 500, headers: corsHeaders }
      );
    }

    const leadIds = leads?.map((l: any) => l.id) || [];
    console.log(`Found ${leadIds.length} leads for user ${userId}`);

    // Fetch communications for these leads
    const { data: communications, error: commsError } = await adminClient
      .from("communications")
      .select("*")
      .in("lead_id", leadIds.length > 0 ? leadIds : ["null"]);

    if (commsError && leadIds.length > 0) {
      console.error("Error fetching communications:", commsError);
    }

    // Fetch documents for these leads
    const { data: documents, error: docsError } = await adminClient
      .from("documents")
      .select("*")
      .in("lead_id", leadIds.length > 0 ? leadIds : ["null"]);

    if (docsError && leadIds.length > 0) {
      console.error("Error fetching documents:", docsError);
    }

    // Build export data structure
    const exportData = {
      exportDate: new Date().toISOString(),
      userId: userId,
      summary: {
        totalLeads: leads?.length || 0,
        totalCommunications: communications?.length || 0,
        totalDocuments: documents?.length || 0,
      },
      leads: (leads || []).map((lead: any) => ({
        ...lead,
        communications: (communications || []).filter(
          (c: any) => c.lead_id === lead.id
        ),
        documents: (documents || []).filter((d: any) => d.lead_id === lead.id),
      })),
    };

    // Convert to JSON string
    const jsonContent = JSON.stringify(exportData, null, 2);

    // Create filename with timestamp
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `agntai-export-${timestamp}.json`;

    // Store in Supabase Storage (create bucket if it doesn't exist)
    try {
      // Try to upload to exports bucket
      const { error: uploadError } = await adminClient.storage
        .from("exports")
        .upload(`${userId}/${filename}`, new TextEncoder().encode(jsonContent), {
          contentType: "application/json",
          upsert: true,
        });

      if (uploadError && uploadError.message.includes("Bucket not found")) {
        // If bucket doesn't exist, try to create it
        console.log("Creating exports bucket...");
        const { error: createError } = await adminClient.storage.createBucket("exports", {
          public: false,
          allowedMimeTypes: ["application/json"],
        });

        if (createError && !createError.message.includes("already exists")) {
          throw new Error("Failed to create exports bucket: " + createError.message);
        }

        // Retry upload
        const { error: retryError } = await adminClient.storage
          .from("exports")
          .upload(`${userId}/${filename}`, new TextEncoder().encode(jsonContent), {
            contentType: "application/json",
            upsert: true,
          });

        if (retryError) {
          throw new Error("Failed to upload after bucket creation: " + retryError.message);
        }
      } else if (uploadError) {
        throw new Error("Failed to upload export: " + uploadError.message);
      }
    } catch (err) {
      console.error("Storage error:", err);
      return new Response(
        JSON.stringify({ error: "Failed to create export: " + String(err) }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Generate signed download URL (valid for 24 hours)
    const { data: signedUrl, error: signError } = await adminClient.storage
      .from("exports")
      .createSignedUrl(`${userId}/${filename}`, 86400); // 24 hours

    if (signError) {
      console.error("Error creating signed URL:", signError);
      return new Response(
        JSON.stringify({ error: "Failed to generate download link: " + signError.message }),
        { status: 500, headers: corsHeaders }
      );
    }

    console.log(`Export completed for user ${userId}: ${leadIds.length} leads`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Export ready: ${leads?.length || 0} leads with ${
          communications?.length || 0
        } interactions and ${documents?.length || 0} documents`,
        downloadUrl: signedUrl.signedUrl,
        filename: filename,
        expiresIn: "24 hours",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Export failed: " + String(error) }),
      { status: 500, headers: corsHeaders }
    );
  }
});
