import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await req.json();
    const { open_house_id, name, phone, email, has_agent } = body;

    if (!open_house_id || !name || !phone || !email) {
      return new Response("Missing required fields", { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    // Fetch open house details
    const { data: openHouse, error: ohError } = await supabase
      .from("open_houses")
      .select("*")
      .eq("id", open_house_id)
      .single();

    if (ohError || !openHouse) {
      console.error("Open house not found:", open_house_id);
      return new Response("Open house not found", { status: 404 });
    }

    // Build lead notes from open house details
    const leadNotes = `Open House: ${openHouse.address}
Date: ${openHouse.date}${openHouse.time ? " " + openHouse.time : ""}
Bedrooms: ${openHouse.bedrooms || "Not specified"}
Bathrooms: ${openHouse.bathrooms || "Not specified"}
Size: ${openHouse.size_sqft ? openHouse.size_sqft + " sq ft" : "Not specified"}
Price: ${openHouse.price || "Not specified"}
Has Agent: ${has_agent ? "Yes" : "No"}${openHouse.notes ? "\nNotes: " + openHouse.notes : ""}`;

    // Create lead in database
    const leadId = crypto.randomUUID();
    const { error: leadError } = await supabase.from("leads").insert({
      id: leadId,
      agent_id: openHouse.agent_id,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      source: "Open House",
      type: "Buyer",
      stage: "New",
      notes: leadNotes,
      tags: ["Open House Visitor"],
      last_contact: new Date().toISOString().split("T")[0],
    });

    if (leadError) {
      console.error("Error creating lead:", leadError);
      return new Response("Error creating lead: " + leadError.message, { status: 500 });
    }

    console.log("Lead created from open house:", leadId);
    return new Response(JSON.stringify({ success: true, lead_id: leadId }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response("Error: " + String(error), { status: 500 });
  }
});
