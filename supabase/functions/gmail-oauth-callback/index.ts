const appUrl = Deno.env.get("APP_URL") || "https://agntai.app";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  // If Google returned an error, show it
  if (error) {
    const msg = url.searchParams.get("error_description") || error;
    return new Response(
      `<html><body style="font-family: sans-serif; margin: 40px; background: #f8f7f5;"><div style="max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px;"><h1 style="color: #dc2626;">Connection Failed</h1><p style="color: #666;">${msg}</p><a href="${appUrl}" style="display: inline-block; background: #1a6b4a; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; margin-top: 20px;">Back to agntai</a></div></body></html>`,
      { status: 400, headers: { "Content-Type": "text/html" } }
    );
  }

  // Success - Gmail authorized
  return new Response(
    `<html><body style="font-family: sans-serif; margin: 40px; background: #f8f7f5;"><div style="max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px;"><h1 style="color: #1a6b4a;">✅ Gmail Connected!</h1><p style="color: #666;">Your Gmail account is now authorized. Claude can read your emails.</p><a href="${appUrl}" style="display: inline-block; background: #1a6b4a; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; margin-top: 20px;">Back to agntai</a></div></body></html>`,
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
});
