# WanderCompanion

Travel discovery and trip planning app built with React, TanStack Start, and
Supabase.

## Run locally

Install Node.js, then from the project directory run:

```sh
npm install
npm run dev
```

## Environment

Set the Supabase project URL and publishable key in the root `.env` file:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

For AI chat, set the server-only gateway key:

```env
TRAVEL_AI_API_KEY=your_ai_gateway_key
```

Do not prefix server-only keys with `VITE_` or commit `.env`. Restart the dev
server after changing environment variables.
