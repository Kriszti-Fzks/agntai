import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts";

const MAILGUN_API_KEY = Deno.env.get("MAILGUN_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

interface MailgunEvent {
  "message-id": string;
  recipient: string;
  domain: string;
  "message-headers": Array<[string, string]>;
  from: string;
  subject: string;
  "body-plain"?: string;
  "body-html"?: string;
  timestamp: string;
  token: string;
  signature: string;
}

function verifyMailgunSignature(
  token: string,
  timestamp: string,
  signature: string,
  apiKey: string
): boolean {
  const data = `${timestamp}${token}`;
  const encoder = new TextEncoder();
  const msgUint8 = encoder.encode(data);
  const keyUint8 = encoder.encode(apiKey);

  // Use SubtleCrypto for HMAC-SHA256
  return crypto.subtle
    .sign("HMAC", { hash: "SHA-256", key: keyUint8 }, msgUint8)
    .then((sig: ArrayBuffer) => {
      const hashArray = Array.from(new Uint8Array(sig));
      const hashHex = hashArray.map((b: number) => b.toString(16).padStart(2, "0")).join("");
      return hashHex === signature;
    })
    .catch(() => false);
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
    });
  }

  try {
    const formData = await req.formData();
    const token = formData.get("token") as string;
    const timestamp = formData.get("timestamp") as string;
    const signature = formData.get("signature") as string;

    // Verify Mailgun signature
    const isValid = await verifyMailgunSignature(
      token,
      timestamp,
      signature,
      MAILGUN_API_KEY || ""
    );

    if (!isValid) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
      });
    }

    const recipient = formData.get("recipient") as string;
    const from = formData.get("from") as string;
    const subject = formData.get("subject") as string;
    const bodyPlain = formData.get("body-plain") as string;
    const bodyHtml = formData.get("body-html") as string;

    if (!recipient || !from) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
      });
    }

    // Initialize Supabase with service role key (has full DB access)
    const supabase = createClient(SUPABASE_URL || "", SUPABASE_SERVICE_KEY || "");

    // Find user by their unique_email
    const { data: users } = await supabase.auth.admin.listUsers();
    let agentId: string | null = null;

    for (const user of users) {
      if (user.user_metadata?.unique_email === recipient) {
        agentId = user.id;
        break;
      }
    }

    if (!agentId) {
      console.log(`No user found for email ${recipient}`);
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
      });
    }

    // Parse sender info
    const [senderEmail] = from.match(/[^\s<]+@[^\s>]+/) || [from];
    const senderName = from.replace(/<[^>]*>/, "").trim() || senderEmail;

    // Create new lead from email
    const { error: insertError } = await supabase.from("leads").insert({
      agent_id: agentId,
      first_name: senderName.split(" ")[0] || "Unknown",
      last_name: senderName.split(" ").slice(1).join(" ") || "",
      email: senderEmail,
      phone: "",
      status: "initial_contact",
      notes: `Email subject: ${subject}\n\n${bodyPlain || bodyHtml || ""}`,
      source: "email_capture",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error("Error creating lead:", insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: "Lead created" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
