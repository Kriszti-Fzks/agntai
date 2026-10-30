# Google Ads Lead Capture Setup for AgntAI

Capture leads directly from your Google Ads campaigns and automatically add them to your agntai CRM—no manual data entry required.

## How It Works

1. **User clicks your ad** on Google Search
2. **Google Lead Form opens** (in Google, no redirect needed)
3. **User fills out name, email, phone, property details**
4. **Form submits to agntai webhook** automatically
5. **Lead appears in your CRM instantly** with a push notification

---

## Step 1: Generate Your Webhook URL

Inside agntai.app:

1. Go to **Settings** (profile icon in top right)
2. Scroll to **Integrations** section
3. Click **"Generate Google Ads Webhook"**
4. Copy the webhook URL (looks like: `https://agntai.app/webhook/lead/{your-id}/{secret-key}`)

✅ **Save this URL.** You'll paste it into Google Ads next.

---

## Step 2: Create a Lead Form in Google Ads

1. Go to your **Google Ads account**
2. Click **Ads & Extensions** → **Ad Extensions** → **+** → **Lead Form Extension**
3. Name it: `"AgntAI CRM Capture"`

### Configure the Form Fields

Add these fields to your lead form (in this order):

| Field | Google Column ID | Type | Required |
|-------|------------------|------|----------|
| First Name | FIRST_NAME | Text | Yes |
| Last Name | LAST_NAME | Text | Yes |
| Email | EMAIL | Email | Yes* |
| Phone | PHONE_NUMBER | Phone | Yes* |
| Property Address | PROPERTY_ADDRESS | Text | No |
| Property Type | PROPERTY_TYPE | Text | No |
| I'm a... | LEAD_TYPE | Dropdown | No |

*At least one of email OR phone is required.

**For "I'm a..." dropdown, add options:**
- Buyer
- Seller
- Investor
- Agent

### Enable Webhook Submission

1. Under **Form Settings**, find **"Lead destination"**
2. Select **"Use an HTTP POST webhook"**
3. Paste your agntai webhook URL from Step 1
4. **Do NOT check** "Require HTTP success response" (uncheck if present)
5. Save the form

---

## Step 3: Link the Form to Your Campaigns

1. Go to your campaign/ad group with the search ads you want to capture leads from
2. Click **Ad Extensions** tab
3. Find your new **"AgntAI CRM Capture"** Lead Form Extension
4. Set it to **Status: Enabled**
5. Save

---

## Step 4: Test It

1. Go to your website or search for your keywords in Google
2. Click your ad
3. A Google Lead Form should appear below the ad
4. **Fill it out with test data:**
   - First Name: "Test"
   - Last Name: "Lead"
   - Email: "test@example.com"
   - Phone: "555-0000"
   - Property Address: "123 Main St, Your City"
   - I'm a...: "Buyer"
5. Click **Submit**

### Check AgntAI for the Lead

1. Sign into agntai.app
2. Go to **CRM & Pipeline**
3. You should see "Test Lead" in your leads list
4. Click to view details → should show Google Ads as source, property address, type

✅ **It worked!** You're now capturing leads from Google Ads.

---

## What Happens When a Lead Submits

**When a Google Ads form is submitted:**

1. 🔄 **Lead appears in CRM instantly**
   - Stage: New
   - Source: Google Ads
   - All form data pre-filled
   - Tagged with campaign name

2. 📊 **Track in Analytics**
   - Go to Integrations → Public API → GET /analytics
   - See conversion rates and ROI by campaign

---

## What Each Lead Field Maps To

| Form Field | Maps To in AgntAI | Example |
|------------|-------------------|---------|
| First Name + Last Name | Lead Name | "John Smith" |
| Email | Lead Email | "john@example.com" |
| Phone | Lead Phone | "+15555551234" |
| Property Address | Notes | "123 Ocean Vista Dr, Irvine CA" |
| Property Type | Notes | "3 BR, 2 BA, Single Family" |
| I'm a... | Lead Type | "Buyer", "Seller", etc. |
| (Auto) Campaign ID | Conversion Source | "campaign_123456" |

---

## Troubleshooting

### "Lead not appearing in CRM"
- Check: Did you copy the webhook URL correctly?
- Check: Is the lead form status **Enabled** on your campaign?
- Check: Did the test form submission show an error message?
- Solution: Regenerate your webhook URL and re-paste in Google Ads

### "Getting error: 'Invalid webhook URL'"
- Make sure you used the **full** URL from agntai Settings
- URL should start with: `https://ivjdhgyaqbufqtjbqlnu.supabase.co`
- Copy-paste, don't type

### "Lead form button not showing on my ads"
- Lead Form Extensions are only available for Search campaigns
- Extensions take 1-4 hours to show after enabling
- Make sure ad group/campaign status is "Enabled"

---

## Advanced: Multiple Lead Forms

You can create **different lead forms** for different campaigns:

Example:
- Form 1: "Buyers Interested in Irvine Homes" → webhook captures "buyer_irvine"
- Form 2: "Sellers Ready to List" → webhook captures "seller_list"

Both webhook URLs are the same (they go to your agntai account), but agntai tags each lead with the campaign ID for tracking.

---

## Security

Your webhook URL contains:
- ✅ Your user ID (unique to you)
- ✅ A secret key (changes each time you regenerate)

**Google Ads** verifies the webhook by sending an authenticated HTTPS POST.

**Never share** your webhook URL publicly. If compromised, regenerate it in agntai Settings.

---

## FAQ

**Q: Can I use this with other ad platforms (Facebook, LinkedIn)?**
A: Not yet. Google Ads Lead Forms are the primary integration. Zapier support coming soon.

**Q: What happens to my leads if I delete the lead form in Google Ads?**
A: Existing leads stay in agntai. New submissions won't arrive. Re-enable the form to resume capturing.

**Q: Can I see the cost per acquisition (CPA)?**
A: Use agntai's **Analytics** dashboard. See conversion rate and total value by campaign.

**Q: What if a lead submits multiple times?**
A: Each submission creates a new lead record (agntai doesn't dedupe). Review in CRM and merge if needed.

---

## Next Steps

1. ✅ Generate webhook in agntai
2. ✅ Create lead form in Google Ads
3. ✅ Enable on your campaigns
4. ✅ Test with a submission
5. ✅ Monitor agntai CRM for incoming leads

**Questions?** Click the 💬 feedback button in agntai or email support@agntai.app
