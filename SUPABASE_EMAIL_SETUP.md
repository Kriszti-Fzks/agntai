# Custom Confirmation Email Setup

## Overview
This guide walks you through setting up the custom confirmation email template in Supabase.

## Template Features
✅ **Professional branding** — Agntai logo, colors, and tone  
✅ **Personalized greeting** — "Welcome, [Name]!"  
✅ **High-level value prop** — Focus on the benefit, not the technical details  
✅ **Clear CTA** — One prominent "Confirm Your Email" button  
✅ **Helpful footer** — Fallback link, account sign-in, privacy link  
✅ **Security note** — Explains link expiration and safety  

## How to Set It Up

### Step 1: Go to Supabase Dashboard
1. Log in to [supabase.com](https://supabase.com)
2. Select your agntai project
3. Go to **Settings → Authentication**
4. Find **Email Templates**

### Step 2: Customize Confirmation Email
1. Click **Email Confirmation** (or similar)
2. You'll see the default template from the screenshot
3. Replace it with the template below

### Step 3: Copy the Template
Open the file `supabase/email_template_signup.html` and copy the **entire HTML content**.

Then paste it into Supabase's email template editor.

### Available Variables
When you paste, Supabase will automatically fill in these placeholders:

| Variable | What it is | Example |
|----------|-----------|---------|
| `{{ user_name }}` | User's full name (if available) | "Krisztina" |
| `{{ confirmation_url }}` | The link they click to confirm | `https://agntai.app/auth/confirm?token=...` |
| `{{ email }}` | Their email address | "test@example.com" |

### Step 4: Test It
1. Click **Save** in Supabase
2. Sign up for a test account on agntai.app
3. You'll receive the new email
4. Verify it looks good and the link works

## What Changed vs. Default
| Aspect | Default | New |
|--------|---------|-----|
| **Greeting** | "Confirm your signup" | "Welcome, [Name]! 👋" |
| **Tone** | Generic, technical | Professional, friendly, benefits-focused |
| **Branding** | Generic Supabase | Custom Agntai colors & logo |
| **Call-to-action** | Plain text link | Large green button + fallback link |
| **Context** | Why they're getting it | What they'll get access to + security note |
| **Footer** | Opt-out link | Privacy link + sign-in link + explain why they got it |

## Troubleshooting

**The variables don't show the user's name**
- Make sure the user's name is captured during signup (check your index.html form)
- If not collected, you can remove `{{ user_name }}` and just use "Welcome!"

**Link doesn't work**
- Supabase auto-generates `{{ confirmation_url }}`
- Don't edit this variable — keep it exactly as is

**Email looks broken in some clients**
- The template is tested for Gmail, Outlook, Apple Mail
- If it looks off in a specific client, let me know and we can adjust

## Next Steps
1. Set up the template in Supabase (5 min)
2. Test with a new signup (1 min)
3. Share the confirmation email on social media to show professionalism

Ready to go live with social campaign! 🚀
