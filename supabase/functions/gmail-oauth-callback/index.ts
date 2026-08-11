const gmailClientId = Deno.env.get("GMAIL_CLIENT_ID");
const gmailClientSecret = Deno.env.get("GMAIL_CLIENT_SECRET");
const appUrl = Deno.env.get("APP_URL") || "https://agntai.app";

Deno.serve(async (req) => {
  try {
    // Parse URL parameters
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state"); // Contains user_id
    const error = url.searchParams.get("error");

    // Handle OAuth errors
    if (error) {
      const errorMessage = url.searchParams.get("error_description") || error;
      return new Response(
        `
        <html>
          <body style="font-family: sans-serif; margin: 40px; background: #f8f7f5;">
            <div style="max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px;">
              <h1 style="color: #dc2626;">Gmail Connection Failed</h1>
              <p style="color: #666; margin: 20px 0;">Error: ${errorMessage}</p>
              <p>Please try connecting again.</p>
              <a href="${appUrl}" style="display: inline-block; background: #1a6b4a; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; margin-top: 20px;">Back to agntai</a>
            </div>
          </body>
        </html>
        `,
        {
          status: 400,
          headers: { "Content-Type": "text/html" },
        }
      );
    }

    // Validate we have code and state
    if (!code || !state) {
      return new Response(JSON.stringify({ error: "Missing code or state" }), {
        status: 400,
      });
    }

    // Exchange code for tokens with Google
    try {
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: gmailClientId!,
          client_secret: gmailClientSecret!,
          code,
          grant_type: "authorization_code",
          redirect_uri: `https://ivjdhgyaqbufqtjbqlnu.supabase.co/functions/v1/gmail-oauth-callback`,
        }).toString(),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        throw new Error(`Token exchange failed: ${error}`);
      }

      // Redirect back to app with success
      return new Response(
        `
        <html>
          <body style="font-family: sans-serif; margin: 40px; background: #f8f7f5;">
            <div style="max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px;">
              <h1 style="color: #1a6b4a;">✅ Gmail Connected!</h1>
              <p style="color: #666; margin: 20px 0;">Your Gmail account is now connected to agntai.</p>
              <p>Redirecting you back...</p>
              <script>setTimeout(() => window.location.href = "${appUrl}", 2000);</script>
            </div>
          </body>
        </html>
        `,
        {
          status: 200,
          headers: { "Content-Type": "text/html" },
        }
      );
    } catch (tokenError) {
      console.error('Token error:', tokenError);
      throw tokenError;
    }
  } catch (error) {
    console.error("OAuth callback error:", error);
    return new Response(
      `
      <html>
        <body style="font-family: sans-serif; margin: 40px; background: #f8f7f5;">
          <div style="max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px;">
            <h1 style="color: #dc2626;">Connection Error</h1>
            <p style="color: #666; margin: 20px 0;">${error.message}</p>
            <a href="${appUrl}" style="display: inline-block; background: #1a6b4a; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; margin-top: 20px;">Back to agntai</a>
          </div>
        </body>
      </html>
      `,
      {
        status: 500,
        headers: { "Content-Type": "text/html" },
      }
    );
  }
});
