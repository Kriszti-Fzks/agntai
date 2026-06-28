import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@1";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const formData = await req.formData();

    // Verify Mailgun signature
    const timestamp = formData.get("timestamp") as string;
    const token = formData.get("token") as string;
    const signature = formData.get("signature") as string;
    const mailgunApiKey = Deno.env.get("MAILGUN_API_KEY");

    if (!timestamp || !token || !signature || !mailgunApiKey) {
      console.error("Missing Mailgun signature fields");
      return new Response("Unauthorized", { status: 401 });
    }

    // Create HMAC-SHA256 of timestamp + token using API key
    const encoder = new TextEncoder();
    const keyData = encoder.encode(mailgunApiKey);
    const messageData = encoder.encode(timestamp + token);
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, messageData);
    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    if (computedSignature !== signature) {
      console.error("Invalid Mailgun signature");
      return new Response("Unauthorized", { status: 401 });
    }

    const recipient = formData.get("recipient") as string;
    const subject = formData.get("subject") as string;
    const bodyPlain = formData.get("body-plain") as string;

    console.log("Received email from:", recipient, "Subject:", subject);

    if (!recipient) {
      return new Response("Missing recipient", { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    // Find agent by inbound email
    const { data: addressData, error: addressError } = await supabase
      .from("agent_inbound_addresses")
      .select("agent_id")
      .eq("email", recipient)
      .single();

    if (addressError || !addressData) {
      console.log("No agent found for email:", recipient);
      return new Response("User not found", { status: 404 });
    }

    const agentId = addressData.agent_id;

    // Use Claude to extract lead information from email
    const anthropic = new Anthropic({
      apiKey: Deno.env.get("ANTHROPIC_API_KEY"),
    });

    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Extract lead information from this email. Return ONLY valid JSON (no markdown, no explanation) with these fields:
- name: lead person's name
- email: lead's email address
- phone: lead's phone number (if available, null otherwise)
- property_type: type of property (house, apartment, etc.)
- location: property location
- details: other relevant property or lead details
- budget: price range if mentioned (null otherwise)

If any field is not mentioned in the email, use null. Return only the JSON object.

Email Subject: ${subject}
Email Body: ${bodyPlain}`,
        }
      ]
    });

    let leadData: any = {
      name: "Unknown Lead",
      email: "unknown@example.com",
      phone: "",
      property_type: "",
      location: "",
      details: "",
      budget: ""
    };

    try {
      const responseText = message.content[0].type === "text" ? message.content[0].text : "";
      // Clean up JSON if it has markdown formatting
      const cleanJson = responseText.replace(/```json\n?|\n?```/g, "").trim();
      leadData = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error("Error parsing Claude response:", parseError);
      // Fall back to basic extraction
      leadData.details = bodyPlain || "";
    }

    // Create lead in database
    const leadId = crypto.randomUUID();
    const leadName = leadData.name || "Unknown Lead";
    const leadEmail = leadData.email || "unknown@example.com";
    const leadPhone = leadData.phone || "";
    const leadNotes = `Property Type: ${leadData.property_type || "Not specified"}
Location: ${leadData.location || "Not specified"}
Budget: ${leadData.budget || "Not specified"}
Details: ${leadData.details || ""}`;

    console.log("Creating lead from AI extraction:", { leadId, leadName, leadEmail });

    const { error } = await supabase.from("leads").insert({
      id: leadId,
      agent_id: agentId,
      name: leadName,
      email: leadEmail,
      phone: leadPhone,
      notes: leadNotes,
      type: "Buyer",
      stage: "New",
      last_contact: new Date().toISOString(),
    });

    if (error) {
      console.error("Error creating lead:", error);
      return new Response("Error: " + error.message, { status: 500 });
    }

    console.log("Lead created successfully:", leadId, "with AI-extracted data");
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Caught error:", error);
    return new Response("Error: " + String(error), { status: 500 });
  }
});
