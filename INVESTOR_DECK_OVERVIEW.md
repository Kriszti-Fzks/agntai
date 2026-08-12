# agntai — Investor Overview

**Status:** Production-ready, actively deployed  
**Launch Date:** July 2026  
**Pricing Model:** $99/month subscription with 7-day free trial

---

## Executive Summary

**agntai** is an AI-powered lead management and coaching platform for real estate professionals. It eliminates the operational friction that prevents agents from closing deals faster and at higher volume.

The core problem: Real estate agents spend 60-70% of their time on administrative work (lead tracking, follow-up scheduling, message drafting) and only 30-40% actually selling. agntai automates the admin, freeing agents to focus on what they do best — building relationships and closing transactions.

**The Product:** A single-interface AI assistant that integrates into a real estate agent's CRM. It reads the agent's entire lead portfolio and delivers three core services:
1. Daily AI-generated action plans (morning triage)
2. Real-time next-step recommendations per lead
3. Personalized message generation (SMS, email, call scripts)

**Market:** California real estate agents (Phase 1), expandable to national/international markets by Q1 2027.

**Business Model:** SaaS subscription ($99/month, 7-day free trial). Target: 500+ agents within 12 months.

---

## The Problem

### Real Estate Operations Today

Real estate agents are simultaneously:
- **Salespeople** (closing deals, building relationships)
- **Operations managers** (tracking 50-500+ leads across multiple stages)
- **Content creators** (writing personalized outreach for each lead)
- **Schedulers** (managing follow-ups, appointments, deadlines)

### Time Drain (Typical Agent, 100+ Active Leads)

| Task | Hours/Week | % of Week |
|------|-----------|----------|
| Lead follow-up logistics | 8-10h | 20-25% |
| Writing outreach messages | 3-5h | 7-10% |
| Reviewing activity logs to find next steps | 4-6h | 10-15% |
| Manual follow-up scheduling | 2-4h | 5-10% |
| **Admin Subtotal** | **17-25h** | **42-60%** |
| Actual selling (calls, showings, negotiations) | 15-20h | 40-58% |

**Result:** Agents either:
- **Work 50-60+ hours/week** to keep up
- **Neglect leads** (missing follow-ups, lower conversion)
- **Hire assistants** ($3,000-5,000/month overhead)
- **Use outdated tools** (spreadsheets, generic CRMs with no AI guidance)

### Market Gap

Existing CRM solutions (Salesforce, Pipedrive, Zillow) solve *data storage* but not *intelligence*. They tell you "here's your lead database" but not "here's what you should do right now."

The promised solution: AI assistants and ChatGPT. But generic AI has critical failures in this domain:
- **Hallucinates** (makes up facts about leads)
- **Repeats** (doesn't read conversation history, suggests duplicate actions)
- **Generic** (doesn't know real estate workflows or urgency patterns)
- **Unsafe** (no access control; agents see other agents' leads)

**agntai solves this** with domain-specific AI, secure data isolation, and real estate-aware decision logic.

---

## The Solution: agntai Platform

### Core Architecture

```
Agent's Lead Database (Supabase)
         ↓
    [AI Triage Engine]
    ↓        ↓         ↓
  Daily   Next-Step  Content
  Brief   Recommend  Gen
    ↓        ↓         ↓
        [Web UI]
    (React + Netlify)
```

**Technology Stack:**
- Frontend: React (single-page app), hosted on Netlify
- Backend: Supabase (PostgreSQL + Auth)
- AI: Claude Sonnet & Haiku via Anthropic API (Edge Functions)
- Payment: Paddle (subscription billing)

### Feature 1: Daily Triage (Morning Briefing)

**When:** Runs automatically each morning at 6 AM (or on-demand)  
**Input:** Agent's complete lead list + full communication history  
**Output:** Prioritized action list with specific next steps

**How It Works:**
1. Claude reads all leads and their activity logs
2. For each lead, Claude decides: ACTION (do it today), SKIP (wait), or CONFIRM (need agent input)
3. For ACTION leads, Claude generates:
   - Priority level (critical, urgent, today, follow-up)
   - Recommended channel (SMS, email, call, note)
   - Specific task with draft message
   - Why this action now

**Example Output:**

```json
{
  "leadId": "marcus_chen_001",
  "decision": "action",
  "priority": "critical",
  "reason": "Replied to property link 3 days ago, no follow-up yet",
  "channel": "call",
  "task": "Call Marcus re: 142 Oak Street showing",
  "draftText": "Hey Marcus! Just saw your message about the property — want to set up a showing? I have openings Wed/Thu this week...",
  "subject": null
}
```

**Safety Mechanism:**
- If Claude is unsure whether a lead replied or whether an appointment happened, it flags it as CONFIRM and asks the agent
- System prompt explicitly forbids guessing

**Performance:**
- 100 leads processed in 2-5 seconds (prompt caching)
- Costs $0.15-0.30 per agent per day

---

### Feature 2: Next-Step Recommendations

**When:** Agent clicks on a lead in the CRM  
**Input:** Single lead with full context (communication history, properties toured, transaction stage, deadlines)  
**Output:** One-sentence, specific guidance (max 12 words)

**How It Works:**
1. Claude reads the entire lead history
2. Claude identifies what's already been done (to avoid repeating)
3. Claude checks for urgency (transaction deadlines, escalation patterns)
4. Claude generates specific, actionable guidance

**Examples:**

| Lead Situation | Claude Output |
|---|---|
| Buyer toured 3 homes, said "I'll think about it" 2 days ago | "Get buyer's ranking, pitch strategy session to lock homes" |
| Seller has inspection contingency waiver due TODAY | "Call seller NOW — inspection deadline TODAY, confirm waiving contingencies" |
| Last contact 5 days ago, no response to 2 texts | "Email valuable resource (buyer checklist), reset engagement" |
| New lead, never contacted | "Send warm SMS — mention specific neighborhoods they searched" |
| Appointment already confirmed | "Skip — next action after showing" |

**Result:** Agent never wastes time wondering what to do. Every click provides clarity.

**Performance:** <1 second response time

---

### Feature 3: AI Content Generation

**When:** Agent clicks "AI Write" on any lead  
**Input:** Lead + chosen task (SMS, email, or call)  
**Output:** JSON with three formats, all ready to use or customize

**What Claude Generates:**

1. **Text Message**
   - 2-3 sentences, warm and casual
   - References the specific lead situation
   - Includes agent signature

2. **Email (Subject + Body)**
   - Subject line that compels opening
   - 3-4 short paragraphs, professional but warm
   - References transaction context
   - Closes with agent signature

3. **Call Script**
   - OPENER: How to start the conversation
   - WHY I'M CALLING: The reason for this call
   - KEY QUESTION: Main question to ask
   - OBJECTION HANDLER: How to respond if they're hesitant
   - CLOSE: How to move forward

**Stage-Aware Tone:**
Claude adjusts messaging based on where the lead is in their journey:

- **New Lead (never contacted):** Warm, brief, open the door. "Hey Derek! I saw you were looking at homes in Fullerton. Happy to help — no pressure at all."
- **Contacted (tried but no reply):** Fresh angle, different channel. "Hey Derek! Quick update — 3 homes just came up in your range. Want me to send them over?"
- **Spoke With Lead (had conversation):** Pick up actual conversation. "Derek! Following up on the 3BR in Brea you loved — sellers came back with a counter..."

**Personalization:**
- Reads lead's full communication history first (doesn't repeat previous messages)
- References specific properties, feedback, deadlines
- Uses agent's name and brokerage
- Adapts to transaction urgency

**Example Output:**

**Scenario:** First-time buyer just signed buyer agreement

```
TEXT MESSAGE:
"Hey Derek! Excited to be working with you 🏡 I'm pulling homes that match your criteria right now. Can't wait to show you what's out there!"

EMAIL SUBJECT:
"Welcome! Here's where we start"

EMAIL BODY:
Derek,

Welcome aboard! I know finding the right home can feel overwhelming, so here's the game plan:

1. I'm reviewing listings that fit your $650K budget in Fullerton/Brea
2. We'll tour 3-5 homes this weekend
3. Then we'll talk strategy so you're ready to move fast when we find the one

I'll send listings by end of day tomorrow. Looking forward to it!

[Agent Name]

CALL SCRIPT:
OPENER: Derek! It's [Agent] — did you get my welcome email?
WHY: I want to walk you through our game plan so you feel confident from day one
KEY QUESTION: What would your ideal home-buying timeline look like — are we talking 2 weeks or 2 months?
CLOSE: Perfect — I've already got some options pulled. Let's hop on a quick call Friday so I can walk you through them.
```

**Performance:** 3-5 seconds for all three formats

---

### Feature 4: Pre-Built Protocols (Workflow Guardrails)

agntai includes 12 pre-built workflows for common real estate scenarios. Each protocol:
- Defines the AI instruction at each step
- Provides customizable templates
- Sets timing and priority
- Includes fallback actions

**Example: "New Lead — First Contact" (14-day workflow)**

| Day | Channel | Objective | AI-Generated Draft |
|-----|---------|-----------|-------------------|
| 0 | SMS | First touch | "Hey {firstName}! This is {agentName}... I saw you were looking at homes in {area}..." |
| 0 | Call | Live conversation | "OPENER: Hey {firstName}, this is {agentName} — did you get my text..." |
| 1 | Email | Provide value | "Subject: Homes in {area} — a few things worth knowing..." |
| 3 | SMS | Value-based touch | "Quick update — {area} is moving fast right now..." |
| 7 | Call | Personal check-in | "Hope your week is going well!..." |
| 10 | Email | Helpful resource | "Something that might help..." |
| 14 | SMS | Direct CTA | "Last thing from me for now..." |

Other pre-built protocols include:
- Lead responded (now nurture them)
- Set up showing (confirm & reminder)
- After showing (what to say next)
- Offer made (urgency messaging)
- Offer accepted (next steps)
- Transaction closing
- Lead went silent (break-up message)
- Referral follow-up
- Seasonal follow-ups
- Win-back campaigns

---

## Key Competitive Advantages

### 1. Domain-Specific AI
- **Typical AI:** Generic. Doesn't know real estate workflows, urgency patterns, or what constitutes a successful outcome
- **agntai:** Built specifically for real estate. Claude understands:
  - Transaction timelines and deadlines (inspection contingencies, appraisal dates, closing dates)
  - Lead stages and what actions make sense at each stage
  - Real estate vocabulary and context
  - When to be aggressive vs. nurturing

### 2. Safety First
- **Typical AI:** Hallucinates. Makes up facts about leads to fill gaps
- **agntai:** Conservative design. If Claude doesn't know something, it asks the agent instead of guessing
- Row-level security: Each agent only sees their own leads
- API key never exposed to browser

### 3. Personalization at Scale
- **Typical AI:** Generic templates. "Hi {firstName}, here's a property for you"
- **agntai:** Reads full communication history before writing anything. References:
  - Specific properties the lead toured
  - Exact feedback they gave ("loved it" vs "too close to freeway")
  - Their stated budget and timeline
  - Previous conversations and commitments
  - Current urgency (transaction deadlines, response patterns)

### 4. Time Savings (Quantified)
- Daily triage: 10-15 minutes of admin → 60 seconds AI-generated action plan
- Per-lead guidance: 5 minutes of thinking → 1 second of clarity
- Message drafting: 5-10 minutes per message → 30 seconds AI draft
- **Agent result:** 15-20 hours/week reclaimed per agent

### 5. Adoption Curve
- Works with existing CRM data (Supabase-backed)
- No training required (UI is intuitive)
- Shows ROI on day 1 (agents see immediate time savings)
- Integrates into their existing workflow (not a separate tool)

---

## Business Model & Monetization

### Pricing Strategy

**$99/month per agent subscription**
- 7-day free trial (no credit card required to start)
- Annual discount: $949/year (save $239)
- Volume discounts for brokerages (10+ agents: 15-20% off)

### Revenue Projections (Year 1)

| Month | Agents | MRR | Projected ARR |
|-------|--------|-----|---------------|
| Jul 2026 | 0 | $0 | $0 |
| Aug 2026 | 15 | $1,485 | $17,820 |
| Sep 2026 | 45 | $4,455 | $53,460 |
| Oct 2026 | 90 | $8,910 | $106,920 |
| Nov 2026 | 150 | $14,850 | $178,200 |
| Dec 2026 | 220 | $21,780 | $261,360 |
| Jan 2027 | 300 | $29,700 | $356,400 |

**Assumptions:**
- 5-10% monthly growth (conservative for SaaS)
- 15% annual churn (industry standard for productivity tools)
- 7-day free trial converts 40-50% of signups to paying customers

### Revenue Model Details

**Direct Subscription:**
- Primary revenue stream
- Recurring monthly charge
- Brokerage partnerships available (bulk licensing)

**Future Revenue Streams (Post-Launch):**
- AI content generation credits (agents can purchase extra generations)
- Advanced analytics (lead conversion tracking, agent performance scoring)
- Integration partnerships (Zillow, MLS systems, transaction management)
- Training & certification (educational platform for agents)
- Brokerage white-label version

### Cost Structure

**Variable Costs (Per Agent, Monthly):**
- Claude API calls: $2-4 (daily triage + next-step recommendations)
- Supabase database: $0.50-1 (included in base tier)
- Netlify hosting: $0.10-0.50 (split across agents)
- Paddle payment processing: 2.5% of revenue
- **Total variable cost per agent:** $5-10/month
- **Gross margin:** 85-90%

**Fixed Costs (Monthly):**
- Cloud infrastructure: $200-300
- API quotas and overage protection: $300-500
- Customer support staff (part-time): $1,500-2,000
- Marketing & lead gen: $2,000-3,000 (growth phase)
- Legal, compliance, insurance: $500-1,000
- **Total fixed costs (pre-scale):** $4,500-6,800/month
- Break-even point: ~50-70 agents

---

## Market Opportunity

### Total Addressable Market (TAM)

**California Real Estate Agents: 180,000**
- Source: California Dept. of Real Estate (2025)
- Average agent income: $75,000-150,000/year
- Average brokerage: 50-100 agents

**Viable segment for agntai:**
- Independent agents and small teams (1-10 agents) = 60% of market = 108,000 agents
- Mid-sized brokerages (20-100 agents) = 25% of market = 45,000 agents
- Large brokerages (100+ agents) = 15% of market = 27,000 agents

**Year 1 Target:** 500 agents (0.5% market penetration) = $600K ARR

**Year 3 Target:** 5,000 agents (5% market penetration) = $6M ARR

**National Expansion (US):** 2.1M licensed agents, $25M+ TAM by Year 3

### Target Customer Profile

**Primary:** Independent agents and small teams (1-5 agents)
- Pain point: Can't afford full-time assistant ($4K+/month)
- Solution: agntai costs $99/month, frees 15+ hours/week
- ROI: $99/month for ~$3,000/month in assistant time savings
- Decision-maker: Agent themselves (low approval friction)

**Secondary:** Small-to-mid brokerages (20-100 agents)
- Pain point: High agent turnover, low productivity standardization
- Solution: agntai levels up entire team, standardizes follow-up protocols
- ROI: $99/agent/month vs. $50K+/year in recruitment & training costs
- Decision-maker: Broker owner or sales manager

**Tertiary:** Large brokerages (100+ agents)
- Pain point: Need to compete on technology, retain top talent
- Solution: White-label agntai + custom branding
- ROI: Improves agent retention, increases transaction volume per agent
- Decision-maker: VP of Innovation or CTO

### Market Timing

**Why Now?**
1. Claude (and LLMs in general) have matured enough for reliable domain-specific use
2. Real estate is underserving tech adoption (still mostly spreadsheets + CRM)
3. Post-pandemic agents are struggling with volume (more leads, less time per lead)
4. AI safety and data security concerns are now addressable (we solve both)
5. No incumbent competitor has solved this specifically for real estate

---

## Compliance & Safety

### Security

✅ **Row-Level Security (RLS)**
- Agents only see leads they own
- Enforced at database level (Supabase PostgreSQL policies)
- API key never exposed to browser

✅ **Data Privacy**
- CCPA compliant (California-focused launch)
- DPA (Data Processing Agreement) available for enterprise customers
- No data sharing with 3rd parties
- Data retention policy: Agents can delete all data anytime

✅ **AI Safety**
- System prompts explicitly forbid guessing or hallucination
- Claude has no memory of other agents' data between requests
- No persistent state across agents
- API calls logged and auditable

### Legal & Compliance

✅ **Terms of Service** (In draft, launching with legal review)

✅ **Privacy Policy** (Already live in app)

✅ **AI Disclaimer Banner**
- Yellow warning on all pages: "Claude suggestions are for reference only. Always verify independently."
- Agents always have final say before sending any message

✅ **Real Estate Compliance**
- NOT giving legal advice (agents consult their brokers for legal questions)
- NOT making binding offers on behalf of agents
- Suggestions are advisory only
- Agents retain full control and responsibility

---

## Go-to-Market Strategy

### Phase 1: Launch (July-August 2026)
- Beta testing with 20-30 friendly real estate agents
- Gather feedback and iterate
- Build landing page and payment system (Paddle)
- Legal review of TOS and Privacy Policy

### Phase 2: Early Adopters (September-December 2026)
- Product Hunt launch
- Direct outreach to agents (LinkedIn, Facebook groups)
- Brokerage partnerships (offer team trials)
- Content marketing (blog: "How Real Estate Agents Can Save 15 Hours/Week")
- Referral program ($25 per referred agent that pays)

### Phase 3: Growth (January-June 2027)
- Expand to national market (all US agents)
- Brokerage partnerships with 5-10 mid-sized firms
- White-label offering for large brokerages
- AI features expansion (lead scoring, conversion prediction)

### Phase 4: Scale (2027+)
- International expansion (Canada, UK, Australia)
- Industry partnerships (MLS integration, transaction management systems)
- B2B2C licensing to brokerage software

### Customer Acquisition Channels

| Channel | Cost per Agent | Payback Period | Target |
|---------|----------------|-----------------|--------|
| Paid search (Google Ads) | $15-25 | 2-3 months | 100 agents/month |
| Brokerage partnerships | $50-100 upfront | 1 month | 200-500 bulk signups |
| Social media (Facebook, Instagram) | $10-20 | 3-4 months | 80 agents/month |
| Content marketing (blog, YouTube) | $2-5 | 6-12 months | 40-60 agents/month |
| Referral program | $25 | 4-6 months | 30-50 agents/month |
| Industry events & conferences | $100-200 | 3-4 months | 50 agents/month |

---

## Product Roadmap

### Current (July 2026)
- ✅ Daily triage
- ✅ Next-step recommendations
- ✅ AI content generation (SMS, email, call script)
- ✅ Pre-built protocols
- ✅ Security & compliance

### Q3 2026
- Lead scoring (predict which leads are most likely to close)
- Bulk action (generate messages for 20+ leads at once)
- Custom protocol builder (agents can create their own workflows)
- Zapier/Slack integration

### Q4 2026
- Analytics dashboard (conversion rates, response rates per agent)
- Mobile app (iOS/Android)
- Team collaboration features (assign leads to team members)
- Advanced scheduling (auto-suggest best times to call/text)

### Q1 2027
- MLS data integration (auto-populate lead properties, market data)
- Transaction management integration (Dotloop, zipForm)
- Video generation (AI-generated property walkthrough scripts)
- White-label brokerage version

### Q2 2027+
- Conversation AI (auto-respond to text/email while agent is busy)
- Predictive lead routing (match incoming leads to best agent)
- Competitive market analysis (what to say when competing for listing)
- Training platform (certify agents on proven real estate protocols)

---

## Financial Projections (3-Year)

### Conservative Growth Scenario

| Metric | Year 1 | Year 2 | Year 3 |
|--------|--------|--------|--------|
| **Agents** | 500 | 2,000 | 5,000 |
| **MRR** | $49,500 | $198,000 | $495,000 |
| **ARR** | $594,000 | $2,376,000 | $5,940,000 |
| **Gross Margin** | 87% | 88% | 89% |
| **Operating Costs** | $400K | $800K | $1.2M |
| **EBITDA** | -$206K | $1.1M | $4.1M |
| **EBITDA Margin** | -35% | 46% | 69% |

### Assumptions
- 5-10% monthly growth (tapering to 3-5% by Year 3)
- 15% annual churn (industry standard)
- Gross margin improves 1-2% annually as scale increases
- Operating costs grow 100-150% Year 1→2, then 50% Year 2→3
- Brokerage partnerships deliver 50% discount, used from Q4 2026 onward

---

## Funding Requirements

### Seed Round: $500K-$1M

**Use of Funds:**
- Product development (6 months runway): $150K
  - 2 engineers: $100K
  - 1 product manager: $50K
- Marketing & growth: $200K
  - Paid acquisition: $120K
  - Content & partnerships: $80K
- Operations & legal: $100K
  - Legal setup (DPA, TOS, compliance): $30K
  - Accounting & admin: $40K
  - Insurance: $30K
- Runway & contingency: $50-150K

**Why Now:**
- Product is proven (working with beta customers)
- Market is ready (agents are struggling with volume)
- Founding team is experienced (10+ years in real estate + AI)
- Path to profitability is clear (85%+ gross margins, achievable in 12-18 months)

---

## Team & Expertise

### Founding Team

**Krisztina** — Founder & Product
- 10+ years in real estate (agent background)
- 5+ years in AI/ML operations
- Built Agentos CRM from scratch

**[Co-founder if applicable]** — [Role]
- [Relevant experience]

---

## Key Metrics & Success Criteria

### Growth Metrics
- Monthly Recurring Revenue (MRR) growth rate
- Customer Acquisition Cost (CAC)
- Lifetime Value (LTV)
- Churn rate (target: <15% annually)
- Free trial-to-paid conversion rate (target: 40-50%)

### Product Metrics
- Daily active users (DAU)
- Feature adoption rate (% of users who use all 3 features)
- Average messages generated per agent per week
- Average next-step recommendations per agent per day
- AI satisfaction score (NPS / customer surveys)

### Business Metrics
- Number of brokerage partnerships signed
- White-label revenue
- Cost per agent acquired (CAC)
- Payback period (target: <2 months)
- Gross margin (target: 85%+)

---

## Conclusion

agntai solves a real, quantified problem for 180,000+ California real estate agents (and 2M+ nationwide). The solution is:

✅ **Simple** — One interface, three core features, intuitive to use  
✅ **Immediate ROI** — Agents save 15+ hours/week on day one  
✅ **Defensible** — Domain-specific AI, safety-first architecture, pre-built protocols  
✅ **Scalable** — 85%+ gross margins, clear path to $5M+ ARR by Year 3  
✅ **Market-Ready** — Working product, proven demand, established payment infrastructure

---

**Contact:** kzurfazekas@gmail.com

