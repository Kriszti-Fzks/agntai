# Gmail Integration Setup Guide

This guide will help you set up Gmail integration for agntai. This allows Claude AI to search your Gmail emails when giving recommendations.

## What You'll Get

- Agents can connect their Gmail accounts
- Claude reads email history when recommending next steps
- Automatic caching of recent emails (reduces API calls)
- Secure token storage (encrypted at rest in Supabase)

## Setup Steps

### Step 1: Get Gmail OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing): `agntai-gmail`
3. Enable these APIs:
   - **Gmail API** (Search → click Enable)
   
4. Create OAuth 2.0 credentials:
   - Go to **Credentials** (left sidebar)
   - Click **Create Credentials** → **OAuth Client ID**
   - If prompted, set up OAuth Consent Screen first:
     - User Type: **External**
     - App name: `agntai`
     - User support email: `kzurfazekas@gmail.com`
     - Developer contact: `kzurfazekas@gmail.com`
     - Scopes: Add `https://www.googleapis.com/auth/gmail.readonly`
   
   - Back to Credentials → **Create OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Name: `agntai-oauth`
   - Authorized JavaScript origins:
     - `https://agntai.app`
     - `https://app.supabase.com` (for testing)
     - `http://localhost:3000` (for local dev)
   
   - Authorized redirect URIs:
     - `https://ivjdhgyaqbufqtjbqlnu.supabase.co/functions/v1/gmail-oauth-callback`
     - `http://localhost:54321/functions/v1/gmail-oauth-callback` (for local dev)

5. Copy your **Client ID** and **Client Secret**

### Step 2: Set Up Database Tables

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Navigate to your project: **ivjdhgyaqbufqtjbqlnu**
3. Go to **SQL Editor**
4. Click **New Query**
5. Copy & paste the contents of `supabase/migrations/gmail_integration.sql`
6. Click **Run** to create the tables

### Step 3: Set Environment Variables

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Click your project → **Settings** (bottom left)
3. Go to **Functions** tab
4. Add these environment variables:
   - `GMAIL_CLIENT_ID` = (from Step 1)
   - `GMAIL_CLIENT_SECRET` = (from Step 1)
   - `APP_URL` = `https://agntai.app`

### Step 4: Deploy Edge Functions

The functions are already created in your repo. Deploy them:

```bash
# Navigate to your project
cd "/Users/krisztina/Documents/real estate platform/Agentos"

# Deploy the functions
supabase functions deploy gmail-search
supabase functions deploy gmail-oauth-callback
```

If you don't have the Supabase CLI:
```bash
npm install -g supabase
supabase login  # Use your Supabase account
```

### Step 5: Add Frontend Code

You need to add a few things to `index.html`:

#### A. Add Gmail connection button to settings/onboarding

```javascript
// Add this function to handle Gmail connect
function initGmailConnect() {
  const gmailConnectBtn = document.getElementById('gmail-connect-btn');
  if (!gmailConnectBtn) return;

  gmailConnectBtn.addEventListener('click', () => {
    connectGmail();
  });
}

async function connectGmail() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    alert('Please log in first');
    return;
  }

  const clientId = 'YOUR_GMAIL_CLIENT_ID'; // Replace with actual ID
  const redirectUri = `${window.location.origin}/functions/v1/gmail-oauth-callback`;
  const scope = 'https://www.googleapis.com/auth/gmail.readonly';
  
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authParams.searchParams.append('scope', scope);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('state', session.user.id); // Store user_id in state

  window.location.href = authUrl.toString();
}

// Call this on app init
initGmailConnect();
```

#### B. Add tool definition for Claude

In your Claude API calls, add this tool to the `tools` array:

```javascript
{
  name: "search_user_emails",
  description: "Search user's Gmail for emails from a specific lead or about a topic. Use queries like 'from:marcus@gmail.com' or 'subject:property'",
  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Gmail search query (e.g., 'from:lead@email.com' or 'subject:listing')"
      },
      limit: {
        type: "number",
        description: "Max emails to return (default 10, max 50)",
        default: 10
      }
    },
    required: ["query"]
  }
}
```

#### C. Handle tool calls

When Claude calls the `search_user_emails` tool, execute it:

```javascript
if (toolCall.name === "search_user_emails") {
  const result = await callGmailSearch(toolCall.input.query, toolCall.input.limit);
  // Send result back to Claude
}

async function callGmailSearch(query, limit = 10) {
  const { data: { session } } = await db.auth.getSession();
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/gmail-search`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': SUPABASE_KEY,
      },
      body: JSON.stringify({ query, limit })
    }
  );
  return response.json();
}
```

### Step 6: Test It Out

1. Go to your app settings
2. Click **Connect Gmail**
3. You'll be redirected to Google's login
4. Grant permission to agntai
5. You'll be redirected back to agntai
6. Look for a success message in the database: `gmail_integrations` table should have your entry

---

## Troubleshooting

### "Gmail not connected" error when Claude tries to search

**Problem:** User hasn't connected their Gmail yet  
**Solution:** Show a UI message directing them to settings → Connect Gmail

### "Invalid redirect URI" error during OAuth

**Problem:** The redirect URI doesn't match what Google has on file  
**Solution:** 
1. Go back to Google Cloud Console
2. Edit the OAuth client
3. Make sure your exact Supabase URL is listed in "Authorized redirect URIs"
4. Test with the exact URL you're using

### Edge function returns 401 Unauthorized

**Problem:** Gmail token is invalid or expired  
**Solution:** The function should auto-refresh tokens. If still failing:
1. Check `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET` are set correctly
2. Go to Settings → Connected Apps and have user reconnect Gmail

### Emails aren't being returned

**Problem:** Gmail search query is malformed or Gmail API isn't returning results  
**Solution:**
1. Check the query format: `from:email@gmail.com` or `subject:keyword`
2. Check Supabase logs (Functions → gmail-search → Logs)
3. Verify the token isn't revoked

---

## How It Works (For Your Understanding)

**Flow:**
1. Agent clicks "Connect Gmail" in settings
2. Redirected to Google's OAuth login
3. Google sends user back to your Edge Function with an auth code
4. Edge Function exchanges code for access token + refresh token
5. Tokens are stored (encrypted) in Supabase
6. When Claude needs to search emails:
   - Frontend calls `gmail-search` Edge Function
   - Function uses the stored token to call Gmail API
   - Results are cached in `gmail_email_cache`
   - Results returned to Claude
7. Claude includes email context in its reasoning

**Security:**
- API keys never exposed to browser
- Tokens stored encrypted at rest in Supabase
- Row-level security ensures users only see their own data
- Tokens auto-refresh when expired

---

## Next Steps

1. **Run the database migration** (Step 2)
2. **Get Gmail OAuth credentials** (Step 1)
3. **Set environment variables** in Supabase (Step 3)
4. **Deploy Edge Functions** (Step 4)
5. **Add frontend code** (Step 5)
6. **Test** (Step 6)

Once this is working, you can:
- Use email context in daily triage recommendations
- Show agents "Recent emails from this lead" in the next-steps UI
- Build email threading features
- Add email-to-lead auto-capture

---

**Questions?** Check your Supabase function logs for detailed error messages.
