# Admin Signup Notification Setup

## What This Does
Sends you an email at **kzurfazekas@gmail.com** whenever someone signs up for agntai.app.

Email subject: **"New Sign up at Agntai"**

## What You'll See
```
🎉 New Sign Up

Email: person@example.com
User ID: abc123...
Status: Pending email confirmation

View in Supabase →
```

---

## Setup Steps

### Step 1: Deploy the Edge Function

1. Go to your Supabase project
2. Click **Edge Functions** (left sidebar)
3. Click **Create a new function**
4. Name it: `notify-admin-signup`
5. Copy the code from `supabase/functions/notify-admin-signup/index.ts`
6. Paste it into the Supabase editor
7. Click **Deploy**

### Step 2: Set Up Auth Hook

Now connect this function to trigger on signup:

1. Go to **Authentication → Auth Hooks** (in left sidebar, under CONFIGURATION)
2. Click **Create a new hook**
3. Select trigger: **postgrest:insert** on **auth.users**
4. Hook name: `notify-admin-on-signup`
5. Replace the template code with this:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const event = await req.json();

  try {
    const user = event.record;

    // Call your notification function
    await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/notify-admin-signup`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
        },
        body: JSON.stringify({ user }),
      }
    );

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
    });
  } catch (error) {
    console.error("Hook error:", error);
    return new Response(JSON.stringify({ success: false }), {
      status: 500,
    });
  }
});
```

6. Click **Create hook**

### Step 3: Test It

1. Sign up for a new account at agntai.app
2. Check your email (kzurfazekas@gmail.com) for the notification
3. You should see "New Sign up at Agntai" email with the user's details

---

## What Happens Next

Every time someone signs up:
- ✅ They get the confirmation email (with your branded template)
- ✅ You get a notification email with their details
- ✅ Link to view them in Supabase included

---

## Troubleshooting

**Not receiving emails?**
- Check spam folder
- Verify the function deployed without errors (check Function Logs)
- Make sure the Auth Hook is enabled

**Want to change the email address?**
- Edit `supabase/functions/notify-admin-signup/index.ts`
- Change `kzurfazekas@gmail.com` to a different email
- Redeploy the function

**Want different email content?**
- Edit the HTML in the function
- Redeploy

---

## Files Created
- `supabase/functions/notify-admin-signup/index.ts` — The notification function

You can customize the email subject, content, and styling anytime by editing the HTML in the function.
