import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const formData = await req.formData();
    const recipient = formData.get("recipient") as string;
    const from = formData.get("from") as string;
    const bodyPlain = formData.get("body-plain") as string;

    console.log("Received email from:", from, "to:", recipient);

    if (!recipient || !from) {
      return new Response("Missing fields", { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    const { data: users } = await supabase.auth.admin.listUsers();
    let agentId = null;

    for (const user of users) {
      if (user.user_metadata?.unique_email === recipient) {
        agentId = user.id;
        break;
      }
    }

    if (!agentId) {
      console.log("No agent found for email:", recipient);
      return new Response("User not found", { status: 404 });
    }

    const senderEmail = from.split("<")[0].trim() || from;
    const senderName = from.replace(/<[^>]*>/, "").trim() || senderEmail;
    const leadId = crypto.randomUUID();

    const { error } = await supabase.from("leads").insert({
      id: leadId,
      agent_id: agentId,
      name: senderName,
      email: senderEmail,
      phone: "",
      type: "Buyer",
      stage: "New",
      last_contact: new Date().toISOString(),
    });

    if (error) {
      console.error("Error creating lead:", error);
      return new Response("Error: " + error.message, { status: 500 });
    }

    console.log("Lead created successfully:", leadId);
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Error:", error);
    return new Response("Error", { status: 500 });
  }
});
