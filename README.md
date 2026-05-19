# agntai.app

AI assistant inside a real-estate CRM. Organizes leads and recommends the
next best step for each one.

## Stack

- **Frontend:** React (loaded via CDN, no build step) — single `index.html` file
- **Backend:** Supabase (database + auth)
- **AI:** Anthropic Claude (Haiku 4.5 + Sonnet 4.6), called through a
  Supabase Edge Function so the API key stays server-side
- **Hosting:** Netlify, auto-deployed from this repo's `main` branch

## Development

This is a static site — open `index.html` in a browser or use any local
file server. Pushes to `main` deploy automatically to https://agntai.app.

## Repository

Private. Built and maintained by Krisztina.
