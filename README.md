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

## Local travel recommendation models

The destination finder and itinerary ranker build TF-IDF text models from the
bundled destination catalog. The budget estimator trains a regularized
regression model from the catalog's per-destination daily cost estimates.
These models run in the app without an external ML service; their estimates
are based on curated catalog data, not historical user bookings, and are not
live travel prices.
