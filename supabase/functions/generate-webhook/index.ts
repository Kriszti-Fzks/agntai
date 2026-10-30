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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    // Verify user token by checking auth
    const tempClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: tokenData, error: tokenVerifyError } = await tempClient.auth.admin.getUserById(token.split('.')[0]);

    if (tokenVerifyError) {
      // Token format might not work with admin, try direct verification
      const userClient = createClient(supabaseUrl, supabaseServiceKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: { user }, error: userError } = await userClient.auth.getUser();

      if (userError || !user) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401,
          headers: corsHeaders,
        });
      }
    }

    // Extract user ID from token
    const parts = token.split('.');
    if (parts.length !== 3) {
      return new Response(JSON.stringify({ error: "Invalid token format" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    // Decode JWT payload
    const payload = JSON.parse(atob(parts[1]));
    const userId = payload.sub;

    if (!userId) {
      return new Response(JSON.stringify({ error: "Invalid token: no user ID" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Generate secure webhook secret (32 random chars)
    const webhookSecret = generateSecureToken(32);

    // Update or create webhook secret in profiles
    const { data: profile, error: checkError } = await adminClient
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single();

    if (checkError) {
      console.error("Profile error:", checkError);
    }

    if (profile) {
      // Update existing profile
      const { error: updateError } = await adminClient
        .from("profiles")
        .update({
          webhook_secret: webhookSecret,
          webhook_enabled: true,
        })
        .eq("id", userId);

      if (updateError) {
        console.error("Update error:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to generate webhook: " + updateError.message }),
          { status: 500, headers: corsHeaders }
        );
      }
    } else {
      // Create new profile with webhook
      const { error: insertError } = await adminClient.from("profiles").insert({
        id: userId,
        webhook_secret: webhookSecret,
        webhook_enabled: true,
      });

      if (insertError) {
        console.error("Insert error:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to create webhook: " + insertError.message }),
          { status: 500, headers: corsHeaders }
        );
      }
    }

    const webhookUrl = `https://ivjdhgyaqbufqtjbqlnu.supabase.co/functions/v1/google-ads-webhook/lead/${userId}/${webhookSecret}`;

    return new Response(
      JSON.stringify({
        success: true,
        webhook_url: webhookUrl,
        webhook_secret: webhookSecret,
        instructions:
          "Copy this URL and paste it into your Google Ads Lead Form settings. Your leads will be automatically added to agntai.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal error: " + String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

function generateSecureToken(length: number): string {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += charset[randomValues[i] % charset.length];
  }
  return result;
}
