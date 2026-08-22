import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  try {
    const body = await req.json();
    const email = body.email || body.record?.email;
    const userName = body.user_name || body.record?.user_metadata?.name || "there";
    const confirmUrl = body.confirmation_url;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey || !email || !confirmUrl) {
      return new Response(JSON.stringify({ success: false, error: "Missing required fields" }), { status: 400 });
    }

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #1a1916; background: #f5f2ec; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e8e6e2; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #1a6b4a 0%, #134a34 100%); padding: 40px 32px; text-align: center; }
    .logo { display: inline-flex; align-items: center; gap: 12px; color: white; text-decoration: none; margin-bottom: 16px; }
    .logo-text { font-size: 24px; font-weight: 600; letter-spacing: -0.5px; }
    .content { padding: 40px 32px; }
    .greeting { font-size: 20px; font-weight: 600; color: #1a1916; margin-bottom: 12px; letter-spacing: -0.3px; }
    .subheading { font-size: 15px; color: #6b6760; margin-bottom: 28px; line-height: 1.6; }
    .value-prop { background: #f0faf5; border-left: 4px solid #1a6b4a; padding: 16px; border-radius: 8px; margin-bottom: 28px; font-size: 14px; color: #134a34; }
    .cta-section { text-align: center; margin-bottom: 32px; }
    .cta-button { display: inline-block; background: #1a6b4a; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; letter-spacing: -0.2px; box-shadow: 0 6px 20px rgba(26,107,74,0.18); }
    .cta-button:hover { background: #155c3e; }
    .note { font-size: 12px; color: #a09d98; text-align: center; margin-top: 20px; line-height: 1.5; }
    .divider { border: none; border-top: 1px solid #e8e6e2; margin: 32px 0; }
    .footer-content { color: #6b6760; font-size: 13px; line-height: 1.6; }
    .footer-text { margin-bottom: 12px; }
    .footer-cta { color: #1a6b4a; text-decoration: none; font-weight: 500; }
    .footer-cta:hover { text-decoration: underline; }
    .footer-legal { font-size: 12px; color: #a09d98; line-height: 1.5; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">
        <div class="logo-text">Agntai</div>
      </div>
    </div>
    <div class="content">
      <div class="greeting">Welcome, ${userName}! 👋</div>
      <div class="subheading">
        We're excited to have you join the beta. Let's confirm your email to get started.
      </div>
      <div class="value-prop">
        <strong>You're about to get access to:</strong><br>
        A daily plan that shows you exactly what to do to close more deals — no more guessing.
      </div>
      <div class="cta-section">
        <a href="${confirmUrl}" class="cta-button">Confirm Your Email</a>
        <div class="note">
          This link expires in 24 hours.
        </div>
      </div>
      <hr class="divider">
      <div class="footer-content">
        <div class="footer-text">
          <strong>Can't click the button?</strong> Copy and paste this link into your browser:
        </div>
        <div class="footer-text" style="word-break: break-all; font-family: monospace; font-size: 12px; color: #3d3a35; background: #f8f7f5; padding: 12px; border-radius: 6px; margin-bottom: 20px;">
          ${confirmUrl}
        </div>
        <div class="footer-text">
          <strong>Already confirmed?</strong> <a href="https://agntai.app" class="footer-cta">Sign in to your account</a>
        </div>
        <div class="footer-text">
          <a href="https://agntai.app/dpa.html" class="footer-cta">How we protect your data →</a>
        </div>
        <hr style="border: none; border-top: 1px solid #e8e6e2; margin: 28px 0;">
        <div class="footer-legal">
          <strong>Why are you getting this email?</strong><br>
          You signed up for Agntai using this email address. If this wasn't you, you can safely ignore this email — your account won't be created unless you confirm.
        </div>
        <div class="footer-legal" style="margin-top: 16px; border-top: 1px solid #e8e6e2; padding-top: 16px;">
          © 2026 Agntai · Built with care in California<br>
          <a href="https://agntai.app/dpa.html" class="footer-cta">Privacy & Data</a>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "noreply@agntai.app",
        to: email,
        subject: "Confirm your Agntai signup",
        html: htmlContent,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Resend error:", error);
      return new Response(JSON.stringify({ success: false, error }), { status: 200 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ success: false, error: String(err) }), { status: 200 });
  }
});
