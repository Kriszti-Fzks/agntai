const appUrl = Deno.env.get("APP_URL") || "https://agntai.app";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const error = url.searchParams.get("error");

  if (error) {
    const msg = url.searchParams.get("error_description") || error;
    return new Response(`<html><body style="font-family: sans-serif; margin: 40px;"><h1>Error: ${msg}</h1><a href="${appUrl}">Back to agntai</a></body></html>`, {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  // Success - Gmail authorized
  return new Response(`<html><body style="font-family: sans-serif; margin: 40px; background: #f8f7f5;"><div style="max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px;"><h1 style="color: #1a6b4a;">✅ Gmail Connected!</h1><p style="color: #666;">Your Gmail is now connected. Redirecting...</p><script>setTimeout(() => window.location.href = "${appUrl}", 2000);</script></div></body></html>`, {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
});
