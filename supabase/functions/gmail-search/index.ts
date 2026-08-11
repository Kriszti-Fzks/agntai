import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const gmailClientId = Deno.env.get("GMAIL_CLIENT_ID");
const gmailClientSecret = Deno.env.get("GMAIL_CLIENT_SECRET");

if (!supabaseUrl || !supabaseServiceKey || !gmailClientId || !gmailClientSecret) {
  throw new Error("Missing required environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface SearchEmailsRequest {
  query: string; // e.g., "from:marcus@gmail.com" or "subject:property"
  limit?: number;
}

interface EmailResult {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  preview: string;
  receivedAt: string;
}

// Refresh Gmail OAuth token if expired
async function refreshGmailToken(integration: any) {
  if (!integration.token_expires_at || new Date(integration.token_expires_at) > new Date()) {
    return integration.access_token;
  }

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: gmailClientId!,
        client_secret: gmailClientSecret!,
        refresh_token: integration.refresh_token,
        grant_type: "refresh_token",
      }).toString(),
    });

    const data = await response.json();

    // Update token in database
    await supabase
      .from("gmail_integrations")
      .update({
        access_token: data.access_token,
        token_expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", integration.id);

    return data.access_token;
  } catch (error) {
    throw new Error(`Failed to refresh Gmail token: ${error.message}`);
  }
}

// Search Gmail for emails matching query
async function searchGmail(accessToken: string, query: string, limit: number = 10) {
  try {
    // First, get message IDs matching the query
    const searchResponse = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(
        query
      )}&maxResults=${limit}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const searchData = await searchResponse.json();

    if (!searchData.messages || searchData.messages.length === 0) {
      return [];
    }

    // Fetch full message details for each result
    const emails: EmailResult[] = [];
    for (const messageRef of searchData.messages) {
      const msgResponse = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${messageRef.id}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const msg = await msgResponse.json();

      // Extract headers
      const headers = msg.payload.headers || [];
      const getHeader = (name: string) =>
        headers.find((h: any) => h.name === name)?.value || "";

      emails.push({
        id: msg.id,
        threadId: msg.threadId,
        from: getHeader("From"),
        subject: getHeader("Subject"),
        preview: msg.snippet || "",
        receivedAt: new Date(parseInt(msg.internalDate)).toISOString(),
      });
    }

    return emails;
  } catch (error) {
    throw new Error(`Gmail search failed: ${error.message}`);
  }
}

// Cache search results in Supabase
async function cacheEmails(userId: string, query: string, emails: EmailResult[]) {
  const cacheRecords = emails.map((email) => ({
    user_id: userId,
    gmail_message_id: email.id,
    from_email: email.from.split("<")[1]?.replace(">", "") || email.from,
    from_name: email.from.split("<")[0]?.trim() || "",
    subject: email.subject,
    body_preview: email.preview,
    thread_id: email.threadId,
    search_query: query,
    received_at: email.receivedAt,
  }));

  await supabase.from("gmail_email_cache").upsert(cacheRecords);
}

// Log sync operation
async function logSync(
  userId: string,
  syncType: string,
  query: string,
  emailCount: number,
  status: string,
  errorMessage?: string
) {
  await supabase.from("gmail_sync_log").insert({
    user_id: userId,
    sync_type: syncType,
    query,
    email_count: emailCount,
    status,
    error_message: errorMessage,
  });
}

Deno.serve(async (req) => {
  // Only allow POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
    });
  }

  try {
    // Get authenticated user from Supabase
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    const token = authHeader.slice(7);
    const { data: authData, error: authError } = await supabase.auth.getUser(token);

    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
      });
    }

    const userId = authData.user.id;

    // Parse request body
    const body: SearchEmailsRequest = await req.json();
    const { query, limit = 10 } = body;

    if (!query) {
      return new Response(JSON.stringify({ error: "Missing 'query' parameter" }), {
        status: 400,
      });
    }

    // Get user's Gmail integration
    const { data: integration, error: integrationError } = await supabase
      .from("gmail_integrations")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (integrationError || !integration) {
      return new Response(
        JSON.stringify({ error: "Gmail not connected. Please connect your Gmail account." }),
        { status: 400 }
      );
    }

    // Check if token is still valid and refresh if needed
    let accessToken = integration.access_token;
    if (integration.token_expires_at && new Date(integration.token_expires_at) <= new Date()) {
      accessToken = await refreshGmailToken(integration);
    }

    // Search Gmail
    const emails = await searchGmail(accessToken, query, limit);

    // Cache results
    if (emails.length > 0) {
      await cacheEmails(userId, query, emails);
    }

    // Log the sync
    await logSync(userId, "search", query, emails.length, "success");

    return new Response(
      JSON.stringify({
        success: true,
        count: emails.length,
        emails,
        from: integration.gmail_address,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const errorMsg = error.message || "Unknown error";
    console.error("Gmail search error:", error);
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
