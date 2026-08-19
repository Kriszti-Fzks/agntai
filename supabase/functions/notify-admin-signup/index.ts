import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { user } = await req.json();

    // Send email to admin
    const { error } = await supabaseClient.auth.admin.sendEmail(
      "kzurfazekas@gmail.com",
      "email",
      {
        subject: "New Sign up at Agntai",
        html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; color: #1a1916; }
    .container { max-width: 600px; margin: 0 auto; background: #f5f2ec; padding: 20px; }
    .card { background: white; border: 1px solid #e8e6e2; border-radius: 12px; padding: 32px; }
    .header { border-bottom: 2px solid #1a6b4a; padding-bottom: 16px; margin-bottom: 24px; }
    .title { font-size: 24px; font-weight: 600; color: #1a6b4a; margin: 0; }
    .user-info { background: #f0faf5; border-left: 4px solid #1a6b4a; padding: 16px; border-radius: 8px; margin-bottom: 24px; }
    .info-row { margin-bottom: 12px; }
    .label { font-weight: 600; color: #1a1916; }
    .value { color: #6b6760; }
    .timestamp { font-size: 12px; color: #a09d98; margin-top: 20px; border-top: 1px solid #e8e6e2; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <h1 class="title">🎉 New Sign Up</h1>
      </div>

      <div class="user-info">
        <div class="info-row">
          <span class="label">Email:</span> <span class="value">${user.email}</span>
        </div>
        <div class="info-row">
          <span class="label">User ID:</span> <span class="value">${user.id}</span>
        </div>
        <div class="info-row">
          <span class="label">Status:</span> <span class="value">Pending email confirmation</span>
        </div>
      </div>

      <p style="color: #6b6760; line-height: 1.6;">
        Someone just signed up for Agntai beta. They'll need to confirm their email before they can access the app.
      </p>

      <div class="timestamp">
        Signed up at: ${new Date().toLocaleString()}<br>
        <a href="https://supabase.com/dashboard/project/ivjdhgyaqbufqtjbqlnu/auth/users" style="color: #1a6b4a; text-decoration: none;">View in Supabase →</a>
      </div>
    </div>
  </div>
</body>
</html>`,
      },
    );

    if (error) {
      console.error("Email send error:", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
