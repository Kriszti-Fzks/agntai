import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const gmailClientId = Deno.env.get("GMAIL_CLIENT_ID");
const gmailClientSecret = Deno.env.get("GMAIL_CLIENT_SECRET");
const appUrl = Deno.env.get("APP_URL") || "https://agntai.app";

const supabase = createClient(supabaseUrl || "", supabaseServiceKey || "");

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    const msg = url.searchParams.get("error_description") || error;
    return new Response(null, {
      status: 302,
      headers: {
        "Location": `${appUrl}?gmail_error=${encodeURIComponent(msg)}`,
      },
    });
  }

  if (!code || !state) {
    return new Response(
      `<html><body style="font-family: sans-serif; margin: 40px;"><h1>Missing code or state</h1><a href="${appUrl}">Back</a></body></html>`,
      { status: 400, headers: { "Content-Type": "text/html" } }
    );
  }

  try {
    // Exchange code for tokens
    const redirectUri = `${supabaseUrl}/functions/v1/gmail-oauth-callback`;
    console.log("Token exchange attempt:", {
      client_id: gmailClientId,
      redirect_uri: redirectUri,
      code: code?.substring(0, 20) + "...",
    });

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: gmailClientId!,
        client_secret: gmailClientSecret!,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", {
        status: tokenResponse.status,
        error: errorText,
      });
      throw new Error(`Token exchange failed: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();

    // Save tokens to database
    await supabase.from("gmail_integrations").upsert({
      user_id: state,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || null,
      token_expires_at: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString(),
      gmail_address: "Connected via OAuth",
      sync_status: "active",
      last_sync_at: new Date().toISOString(),
    });

    // Success - redirect back to app
    return new Response(null, {
      status: 302,
      headers: {
        "Location": `${appUrl}?gmail_connected=true`,
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(null, {
      status: 302,
      headers: {
        "Location": `${appUrl}?gmail_error=${encodeURIComponent(error.message || "Unknown error")}`,
      },
    });
  }
});
