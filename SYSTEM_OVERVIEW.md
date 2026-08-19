# agntai.app — System Overview for AI Understanding

## What agntai Is

**agntai** is an AI-powered real estate CRM that helps agents manage leads and get personalized daily recommendations. Instead of agents manually reviewing 20+ leads each morning, Claude AI triages them automatically and surfaces the 3-5 leads that actually need action today.

**Key insight:** agntai is not a traditional CRM. It's a decision-support system where AI does the thinking about "what matters today" and humans do the actual relationship work.

---

## Core Features

### 1. **Leads Management**
- Store unlimited leads with: name, email, phone, status, custom notes
- View leads in a list with quick filters
- Edit lead details inline
- Track communication history

### 2. **Daily Triage** ⭐ Core Feature
- Every morning, Claude AI reviews ALL leads and decides:
  - **"Action"** — there's something to do today (e.g., follow up on their question, send property listing, schedule callback)
  - **"Skip"** — nothing needed (e.g., already scheduled a callback for Tuesday, waiting on their response)
  - **"Confirm"** — needs human input (e.g., "I don't know if they're still interested, should I reach out?")
- For each action, Claude provides: priority, channel (email/call), what to say, and why
- Users can re-run triage anytime (button click, or once daily auto-run)

### 3. **Email-to-Lead** 
- Agents forward emails to their unique agntai email address
- System auto-captures the email and creates/updates the associated lead
- Email is stored for Claude to read when triaging

### 4. **Recommendations**
- When agents click a lead, Claude suggests the next best action
- Considers: stage, notes, last communication, any deadlines
- Generates draft messages or talking points agents can use

### 5. **Settings & Configuration**
- Agent name, email, company
- Email address for incoming email capture
- Email handler preference (Gmail web or system default)

---

## Technology Stack

### Frontend
- **Framework:** React 18 (loaded via CDN, no build step)
- **Hosting:** Netlify (auto-deploys from GitHub main branch)
- **File:** Single `index.html` (~9000 lines of inline JavaScript)
- **Styling:** CSS-in-JS (inline styles in React.createElement)
- **Auth:** Supabase auth (email/password, passwordless links, Google OAuth)

### Backend
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **API:** Supabase Edge Functions (Deno + TypeScript)
- **API Key Storage:** Edge Functions environment variables (never exposed to browser)

### AI
- **Model:** Claude (Haiku 4.5 for fast triage, Sonnet 4.6 for detailed reasoning)
- **Integration:** Called via Supabase Edge Function
- **Context:** Claude reads lead data, communication history, notes, and email content
- **Token Budget:** Designed for fast inference (Haiku) at scale

---

## Data Model

### Core Tables

**leads**
```
- id (UUID)
- user_id (FK → auth.users)
- name, email, phone
- status (e.g., 'new', 'qualified', 'contacted', 'proposal', 'closed')
- notes (rich text)
- custom_fields (JSON)
- created_at, updated_at
```

**communications**
```
- id (UUID)
- lead_id (FK)
- type ('email' | 'call' | 'message')
- direction ('inbound' | 'outbound')
- subject, body, from, to
- timestamp
```

**triage_decisions** (cached)
```
- id (UUID)
- lead_id (FK)
- user_id (FK)
- decision ('action' | 'skip' | 'confirm')
- priority, channel, task, draft_message, reasoning
- decided_at
- expires_at (24 hours, then re-triage)
```

**gmail_integrations** (unused after OAuth was disabled)
```
- user_id (FK)
- access_token, refresh_token
- gmail_address
- sync_status
```

---

## Key Workflows

### Daily Morning Routine (Triage)
1. User opens agntai.app
2. Clicks "Re-think today" (or auto-runs at 8am)
3. App fetches all user's leads + recent communications
4. Edge Function sends to Claude with system prompt:
   ```
   "You are an AI assistant for a real estate agent. Review these leads. 
   For each one, decide: Action, Skip, or Confirm needed."
   ```
5. Claude returns structured JSON with decisions
6. UI displays top 3-5 action items
7. User acts on them (email, call, etc.)

### Email-to-Lead (Incoming Email Capture)
1. Agent forwards an email to their unique address: `[user-id]@agntai-mail.example.com`
2. Email arrives at Supabase function
3. Function parses sender, subject, body
4. Finds or creates lead for sender's email
5. Stores email in communications table
6. Next triage run sees this new email and factors it in

### Lead Recommendation (User Clicks a Lead)
1. User opens a lead detail view
2. App sends lead data + communication history to Claude
3. Claude returns: "Based on last email, they asked about financing. Send them: [draft email]"
4. User can accept, edit, and send the draft

---

## How Claude Is Integrated

### System Prompt (for Triage)
```
You are an experienced real estate agent's AI assistant. 
Your job is to review the agent's leads and help them focus on what matters today.

For each lead, output one of three decisions:
1. "action" — there's something to do today
2. "skip" — nothing needed right now
3. "confirm" — needs the agent's input

For action items, also provide:
- priority (1-5)
- channel (email, call, message)
- task (what to do)
- draft_message (if email)
- why (reasoning)
```

### API Flow
```
Frontend → (HTTPS) → Supabase Edge Function
  ↓
  Reads CLAUDE_API_KEY from env
  Builds context from lead data
  Calls Claude API
  ↓
  Returns decision JSON
  ↓
Frontend renders decision in UI
```

**Why this architecture?**
- API key never leaves server (stays in Edge Function environment)
- Frontend can't see or steal the key
- Fast response (Haiku for triage, Sonnet for deep reasoning)
- Cost-effective (Haiku is 1/10th the price of Sonnet)

---

## File Structure

```
/
├── index.html                          (entire frontend app)
├── README.md                           (basic project info)
├── SYSTEM_OVERVIEW.md                  (this file)
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql      (leads, users, auth)
│   │   ├── 002_communications.sql      (email/call history)
│   │   ├── 003_triage_decisions.sql    (cached triage results)
│   │   └── gmail_integration.sql       (email tokens — now disabled)
│   └── functions/
│       ├── claude-triage/index.ts      (daily triage orchestrator)
│       ├── claude-recommendation/index.ts (next-step suggestion)
│       ├── process-incoming-email/index.ts (email-to-lead)
│       └── gmail-oauth-callback/index.ts  (disabled)
├── .github/
│   └── workflows/                      (CI/CD, Netlify deploys)
└── .gitignore                          (environment variables)
```

---

## Configuration & Secrets

Required environment variables (Supabase Edge Functions):

```env
SUPABASE_URL=https://[project].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[service role key]
CLAUDE_API_KEY=[Anthropic API key]
APP_URL=https://agntai.app
```

---

## How to Understand the Codebase

### For a Quick Overview
1. Read this file (SYSTEM_OVERVIEW.md)
2. Skim README.md
3. Open index.html and search for: `function runDailyTriage` — this is the core logic

### For Feature Understanding
- **Leads:** Search for `function renderLeadsList`
- **Triage:** Search for `async function runDailyTriage`
- **Email:** Search for `process-incoming-email`
- **Auth:** Search for `handleGoogleAuth`

### For Architecture Deep Dive
1. Read index.html (it's one file — ~9000 lines)
2. Read each function in /supabase/functions/
3. Read migrations in /supabase/migrations/

---

## Why This Design?

**Why single HTML file?**
- No build step = fast iteration
- Easier to deploy (just one file)
- All code visible in one place
- Fast for small apps (agntai is ~5000 users, not millions)

**Why Supabase?**
- Postgres (relational data is natural for leads + history)
- Auth built-in
- Edge Functions for API key security
- Real-time capabilities (could add live updates later)

**Why Claude API?**
- Best at reading context (long emails, notes, history)
- Structured output (decisions in JSON)
- Fast with Haiku, powerful with Sonnet
- Easy to iterate prompts

**Why "triage as the core"?**
- Agents waste time reviewing leads they don't need to call today
- One AI decision saves 30 minutes of manual triage
- High ROI (cheap to run, high value to agent)

---

## Usage Example: A Day in the Life

**8:00 AM** — Agent logs into agntai.app  
**8:01 AM** — Clicks "Re-think today"  
Claude reviews 42 leads:
- 3 need action today (Marcus asked about financing, Sarah wants to see a listing, Tom missed his callback)
- 38 can wait

**8:02 AM** — Agent sees:
```
Priority 1: Call Marcus (ask about financing)
  Draft: "Hey Marcus, wanted to circle back on your question about financing options..."

Priority 2: Email Sarah (send property listing)
  Draft: "Hi Sarah, found a property that matches what you're looking for..."

Priority 3: Follow up with Tom (reschedule callback)
  Draft: "Hi Tom, I tried to reach you yesterday. Would Tuesday at 2pm work better?"
```

**8:15 AM** — Agent has called Marcus and emailed Sarah. Tom's callback gets scheduled.

**Result:** What would have taken 30 minutes of manual review took 2 minutes with AI, and the agent made 3 meaningful connections instead of reviewing 42 irrelevant leads.

---

## Quick Start for Developers

To understand how agntai works:

1. **Clone the repo**
2. **Open index.html in a browser** (no build needed)
3. **Look for these functions:**
   - `runDailyTriage()` — orchestrates the triage flow
   - `async function fetchTriageFromAI()` — calls Claude
   - `renderSettingsPanel()` — shows the UI
4. **Read the database schema:** `/supabase/migrations/`
5. **Check Supabase functions:** `/supabase/functions/`

---

## Questions to Ask (if sharing with an AI)

When sharing agntai with Claude or another AI:

1. "How would you improve the triage decision logic?"
2. "What edge cases should agntai handle?"
3. "How could we make the recommendation generation better?"
4. "What database optimizations would help scale this?"
5. "What security vulnerabilities do you see?"
6. "How would you add [feature]?"

---

**Built by:** Krisztina  
**Status:** Production (June 2026)  
**Users:** ~100 beta agents testing  
**Next:** Email-to-Lead Phase 2 (two-way communication threads)
