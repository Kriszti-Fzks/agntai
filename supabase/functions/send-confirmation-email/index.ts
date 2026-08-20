import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  try {
    const { email, user_name, confirmation_url } = await req.json();

    const mailgunApiKey = Deno.env.get("MAILGUN_API_KEY");
    const mailgunDomain = Deno.env.get("MAILGUN_DOMAIN");

    if (!mailgunApiKey || !mailgunDomain) {
      console.error("Missing Mailgun credentials");
      return new Response(
        JSON.stringify({ success: false, error: "Missing Mailgun credentials" }),
        { status: 400 }
      );
    }

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: system-ui; color: #1a1916; background: #f5f2ec; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #e8e6e2; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #1a6b4a, #134a34); padding: 40px; text-align: center; }
    .logo { height: 60px; }
    .content { padding: 40px; }
    .greeting { font-size: 20px; font-weight: 600; margin: 0 0 12px; }
    .cta-button { display: inline-block; background: #1a6b4a; color: #fff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img class="logo" src="https://agntai.app/supabase/logo.png" alt="Agntai">
    </div>
    <div class="content">
      <div class="greeting">Welcome, ${user_name || "there"}! 👋</div>
      <p>We're excited to have you join the beta. Let's confirm your email to get started.</p>

      <div style="background: #f0faf5; border-left: 4px solid #1a6b4a; padding: 16px; margin: 20px 0; border-radius: 8px;">
        <strong>You're about to get access to:</strong><br>
        A daily plan that shows you exactly what to do to close more deals — no more guessing.
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${confirmation_url}" class="cta-button">Confirm Your Email</a>
        <div style="font-size: 12px; color: #a09d98; margin-top: 15px;">This link expires in 24 hours</div>
      </div>

      <hr style="border: none; border-top: 1px solid #e8e6e2; margin: 30px 0;">

      <p style="font-size: 13px; color: #6b6760;">
        <strong>Can't click the button?</strong><br>
        <a href="${confirmation_url}" style="color: #1a6b4a; word-break: break-all;">${confirmation_url}</a>
      </p>

      <p style="font-size: 12px; color: #a09d98; margin-top: 20px;">
        <strong>Why this email?</strong> You signed up for Agntai using this email address. If this wasn't you, you can safely ignore this email — your account won't be created unless you confirm.
      </p>

      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e8e6e2; font-size: 12px; color: #a09d98;">
        © 2026 Agntai · Built in California<br>
        <a href="https://agntai.app/dpa.html" style="color: #1a6b4a;">Privacy & Data</a>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    // Send via Mailgun API
    const formData = new FormData();
    formData.append("from", `Agntai <noreply@${mailgunDomain}>`);
    formData.append("to", email);
    formData.append("subject", "Confirm your Agntai signup");
    formData.append("html", htmlBody);

    const response = await fetch(
      `https://api.mailgun.net/v3/${mailgunDomain}/messages`,
      {
        method: "POST",
        auth: `api:${mailgunApiKey}`,
        body: formData,
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error("Mailgun error:", result);
      return new Response(
        JSON.stringify({ success: false, error: result.message }),
        { status: response.status }
      );
    }

    console.log("Email sent successfully:", result.id);
    return new Response(JSON.stringify({ success: true, id: result.id }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500 }
    );
  }
});
