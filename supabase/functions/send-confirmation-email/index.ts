import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req: Request) => {
  try {
    const body = await req.json();
    const email = body.email;
    const userName = body.user_name || "there";
    const confirmUrl = body.confirmation_url;

    const apiKey = Deno.env.get("MAILGUN_API_KEY");
    const domain = Deno.env.get("MAILGUN_DOMAIN");

    if (!apiKey || !domain) {
      return new Response(JSON.stringify({ success: false }), { status: 400 });
    }

    const form = new FormData();
    form.append("from", `Agntai <noreply@${domain}>`);
    form.append("to", email);
    form.append("subject", "Confirm your Agntai signup");
    form.append("html", `<html><body><h2>Welcome ${userName}</h2><p><a href="${confirmUrl}">Confirm Email</a></p></body></html>`);

    const auth = btoa(`api:${apiKey}`);
    const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
      },
      body: form,
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ success: false }), { status: 500 });
  }
});
