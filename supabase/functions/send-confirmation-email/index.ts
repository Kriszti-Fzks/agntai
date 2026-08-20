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

    const apiKey = Deno.env.get("MAILGUN_API_KEY");
    const domain = Deno.env.get("MAILGUN_DOMAIN");

    if (!apiKey || !domain || !email) {
      return new Response(JSON.stringify({ success: false }), { status: 400 });
    }

    const form = new FormData();
    form.append("from", `Agntai <noreply@${domain}>`);
    form.append("to", email);
    form.append("subject", "Confirm your Agntai signup");
    form.append("html", `<html><body><h2>Welcome ${userName}</h2><p><a href="${confirmUrl}">Confirm Email</a></p></body></html>`);

    const auth = btoa(`api:${apiKey}`);
    await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
      method: "POST",
      headers: { "Authorization": `Basic ${auth}` },
      body: form,
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ success: false }), { status: 200 });
  }
});
