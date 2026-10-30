# AgntAI Public API

The AgntAI Public API allows third-party applications, Claude agents, and measurement tools to:
- Query your leads and pipeline data
- Log conversions and track deal closures
- Analyze ROI by lead source (Google Ads, Facebook, organic, etc.)
- Integrate with measurement and automation platforms

## Base URL

```
https://agntai.app/api/v1
```

or directly via Supabase Edge Function:

```
https://ivjdhgyaqbufqtjbqlnu.supabase.co/functions/v1/public-api
```

## Authentication

All requests require a Bearer token (your AgntAI session JWT):

```
Authorization: Bearer YOUR_JWT_TOKEN
```

**To get your token:**
1. Sign in to agntai.app
2. Open Developer Tools → Application → Local Storage
3. Find `supabase.auth.token` or use the browser's auth session

**For developers:** Get the token programmatically:
```javascript
const { data } = await supabase.auth.getSession();
const token = data.session.access_token;
```

## Rate Limiting

- **Free tier**: 100 requests per hour per user
- **Paid tier** (coming soon): Unlimited

## Endpoints

### 1. GET /leads
Fetch all your leads and pipeline data.

**Request:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://ivjdhgyaqbufqtjbqlnu.supabase.co/functions/v1/public-api/leads
```

**Response:**
```json
{
  "success": true,
  "count": 42,
  "data": [
    {
      "id": "lead-123",
      "name": "John Smith",
      "email": "john@example.com",
      "phone": "555-1234",
      "stage": "contacted",
      "source": "Google Ads",
      "conversion_source": null,
      "converted_at": null,
      "conversion_value": null,
      "notes": "Interested in 3BR in Mission Viejo"
    }
  ]
}
```

**Query Parameters:**
- `stage=closed` - Filter by stage (open, contacted, under-contract, closed)
- `source=google_ads` - Filter by lead source
- `limit=10` - Limit results (default: all)

---

### 2. POST /leads/conversion
Log a conversion (deal closed) for a lead.

**Request:**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lead_id": "lead-123",
    "conversion_value": 450000,
    "conversion_source": "google_ads",
    "conversion_notes": "Closed 3BR in Mission Viejo, commission $13,500"
  }' \
  https://ivjdhgyaqbufqtjbqlnu.supabase.co/functions/v1/public-api/leads/conversion
```

**Request Body:**
```json
{
  "lead_id": "required-uuid",
  "conversion_value": 450000,
  "conversion_source": "google_ads",
  "conversion_notes": "Optional notes about the conversion"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Lead lead-123 marked as converted",
  "data": {
    "lead_id": "lead-123",
    "converted_at": "2026-10-29T14:32:00Z"
  }
}
```

---

### 3. GET /analytics
Get conversion analytics grouped by lead source (Google Ads, Facebook, organic, etc.).

**Request:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://ivjdhgyaqbufqtjbqlnu.supabase.co/functions/v1/public-api/analytics
```

**Response:**
```json
{
  "success": true,
  "summary": {
    "total_leads": 42,
    "total_conversions": 8,
    "overall_conversion_rate": "19.0%",
    "total_conversion_value": 3600000
  },
  "by_source": [
    {
      "source": "google_ads",
      "total_leads": 15,
      "conversions": 4,
      "conversion_rate": "26.7%",
      "total_value": 1800000
    },
    {
      "source": "facebook",
      "total_leads": 12,
      "conversions": 2,
      "conversion_rate": "16.7%",
      "total_value": 900000
    },
    {
      "source": "organic",
      "total_leads": 8,
      "conversions": 2,
      "conversion_rate": "25.0%",
      "total_value": 900000
    }
  ]
}
```

---

### 4. GET /leads/{id}
Fetch a single lead by ID.

**Request:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://ivjdhgyaqbufqtjbqlnu.supabase.co/functions/v1/public-api/leads/lead-123
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "lead-123",
    "name": "John Smith",
    "email": "john@example.com",
    "phone": "555-1234",
    "stage": "closed",
    "source": "Google Ads",
    "conversion_source": "google_ads",
    "converted_at": "2026-10-29T14:32:00Z",
    "conversion_value": 450000,
    "notes": "..."
  }
}
```

---

## Use Cases

### 1. Track Google Ads ROI
When someone fills out a Google Ads form → lead enters agntai → when they close, call POST /leads/conversion → GET /analytics shows ROI by campaign.

```javascript
// When deal closes in agntai
await fetch('https://ivjdhgyaqbufqtjbqlnu.supabase.co/functions/v1/public-api/leads/conversion', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    lead_id: 'lead-123',
    conversion_value: 450000,
    conversion_source: 'google_ads_bedroom_3_mission_viejo'
  })
});
```

### 2. Build a Claude Agent
Create a custom Claude agent that queries your agntai data:

```javascript
// Custom Claude agent can call this
const leads = await fetch(
  'https://ivjdhgyaqbufqtjbqlnu.supabase.co/functions/v1/public-api/leads',
  { headers: { 'Authorization': `Bearer ${token}` } }
).then(r => r.json());

// Agent can now answer: "How many leads are in my pipeline?"
// Or: "Which sources have the best ROI?"
```

### 3. Sync to Google Sheets
Pull your agntai leads into a Google Sheet via Zapier or Make.com:

```
Trigger: POST /leads/conversion called
→ Send to Google Sheets: New row with conversion data
→ Also send to Google Ads for conversion tracking
```

---

## Error Responses

**401 Unauthorized:**
```json
{ "error": "Invalid or expired token" }
```

**404 Not Found:**
```json
{ "error": "Lead not found or access denied" }
```

**400 Bad Request:**
```json
{ "error": "Missing required field: lead_id" }
```

---

## SDK Examples

### JavaScript/Node.js
```javascript
const agntaiApi = {
  async getLeads(token) {
    const res = await fetch(
      'https://ivjdhgyaqbufqtjbqlnu.supabase.co/functions/v1/public-api/leads',
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    return res.json();
  },

  async logConversion(token, leadId, value, source) {
    const res = await fetch(
      'https://ivjdhgyaqbufqtjbqlnu.supabase.co/functions/v1/public-api/leads/conversion',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lead_id: leadId,
          conversion_value: value,
          conversion_source: source
        })
      }
    );
    return res.json();
  },

  async getAnalytics(token) {
    const res = await fetch(
      'https://ivjdhgyaqbufqtjbqlnu.supabase.co/functions/v1/public-api/analytics',
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    return res.json();
  }
};
```

### Python
```python
import requests

def get_leads(token):
    headers = {'Authorization': f'Bearer {token}'}
    r = requests.get(
        'https://ivjdhgyaqbufqtjbqlnu.supabase.co/functions/v1/public-api/leads',
        headers=headers
    )
    return r.json()

def log_conversion(token, lead_id, value, source):
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    r = requests.post(
        'https://ivjdhgyaqbufqtjbqlnu.supabase.co/functions/v1/public-api/leads/conversion',
        headers=headers,
        json={'lead_id': lead_id, 'conversion_value': value, 'conversion_source': source}
    )
    return r.json()
```

---

## Status

- ✅ **GA (General Availability):** Public beta
- 🔄 **Planned:** Rate limiting tiers, webhooks, CSV export, more endpoints
- 📅 **Coming:** OAuth for third-party apps, Zapier integration templates

---

## Questions?

Email: support@agntai.app or click the 💬 feedback button in the app.
