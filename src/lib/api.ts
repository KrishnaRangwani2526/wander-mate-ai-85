/**
 * Local Python backend client with instant in-app fallbacks.
 * Run the engine separately:
 *   cd backend && uvicorn main:app --reload --port 8000
 *
 * No Supabase, no cloud. Local/dev mode always tries the Python backend first
 * so Dream/Plan/Book/Analyze use live Gemini + travel APIs instead of mock data.
 */
import { DESTINATIONS } from "@/data/destinations";
import { analyzeText } from "@/lib/engines/analyze";
import { searchBuses, searchFlights, searchHotels, searchTrains } from "@/lib/engines/booking";
import { estimateCost } from "@/lib/engines/cost";
import { generateItineraryOptions } from "@/lib/engines/itinerary";
import { compareAndRank } from "@/lib/engines/rank";
import { recommendDestinations } from "@/lib/engines/recommendation";
import { optimizeRoute } from "@/lib/engines/route";

const configuredApiBase =
  typeof import.meta !== "undefined" ? ((import.meta as any).env?.VITE_API_BASE as string | undefined) : undefined;

const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
const isHostedPreview = /(^|\.)lovable\.app$/.test(host) || host.includes("lovableproject.com");
const isLocalHost = host === "localhost" || host === "127.0.0.1";
const isSandboxPreview =
  typeof window !== "undefined" && isLocalHost && window.location.port === "8080";
const runningStandaloneFrontend =
  typeof window !== "undefined" && isLocalHost && ["5173", "5174", "3000"].includes(window.location.port);
const defaultApiBase =
  typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : "http://localhost:8000";

export const API_BASE = configuredApiBase || defaultApiBase;
export const SHOULD_TRY_BACKEND = Boolean(configuredApiBase) || isLocalHost || runningStandaloneFrontend || (!isHostedPreview && !isSandboxPreview);

const REQUEST_TIMEOUT_MS = 8_000;

export class BackendOfflineError extends Error {
  constructor() {
    super("Local engine is offline. Start it with: cd backend && uvicorn main:app --reload --port 8000");
    this.name = "BackendOfflineError";
  }
}

function timeoutSignal(ms: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, done: () => clearTimeout(id) };
}

async function call<T>(path: string, init?: RequestInit, fallback?: () => T | Promise<T>): Promise<T> {
  if (!SHOULD_TRY_BACKEND && fallback) return fallback();

  let res: Response;
  const timeout = timeoutSignal(REQUEST_TIMEOUT_MS);
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
      signal: init?.signal ?? timeout.signal,
    });
  } catch {
    timeout.done();
    if (fallback) return fallback();
    throw new BackendOfflineError();
  }
  timeout.done();
  if (!res.ok) {
    if (fallback) return fallback();
    throw new Error(`${path} → ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as T;
}

// Same-origin call — for TanStack Start server routes under /api/*
async function sameOrigin<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return (await res.json()) as T;
}

function destinationCards() {
  return DESTINATIONS.map((d) => ({
    id: d.id, name: d.name, state: d.state, tagline: d.tagline,
    hero_image: d.hero_image, interests: d.interests, best_seasons: d.best_seasons,
  }));
}

function localDream(body: any) {
  const matches = recommendDestinations(body, 60);
  const days = body.duration_days ?? 5;
  const travelers = body.travelers ?? 2;
  const style = body.style ?? "mid";
  const enriched = matches.map((match) => {
    const cost = estimateCost({ destination_id: match.destination.id, duration_days: days, travelers, style, include_flight: true });
    const [dmin, dmax] = match.destination.ideal_duration_days;
    const duration_fit = days >= dmin && days <= dmax ? 1 : Math.max(0, 1 - Math.abs(days - (dmin + dmax) / 2) / 10);
    return { match, cost, duration_fit };
  });
  const ranked = compareAndRank(
    enriched.map(({ match, cost, duration_fit }) => ({
      id: match.destination.id, name: match.destination.name,
      cost_inr: cost.grand_total_inr, match_score: match.score, duration_fit,
      crowd_factor: match.destination.crowd_factor,
      season_match: body.seasons ? match.destination.best_seasons.some((s) => body.seasons.includes(s)) : undefined,
    })),
    { cost: body.max_budget_per_day_inr ? 0.35 : 0.2, match: 0.35, duration_fit: 0.15, uniqueness: body.avoid_crowds ? 0.2 : 0.1, season: 0.1 },
  );
  return {
    results: ranked.map((r) => {
      const f = enriched.find(({ match }) => match.destination.id === r.id)!;
      const d = f.match.destination;
      return {
        id: d.id, name: d.name, state: d.state, tagline: d.tagline, hero_image: d.hero_image,
        highlights: d.highlights, interests: d.interests, best_seasons: d.best_seasons,
        score: f.match.score, reasons: f.match.reasons,
        estimated_cost_inr: f.cost.grand_total_inr, per_person_per_day_inr: f.cost.per_person_per_day, ranked: r,
      };
    }),
    query: body,
  };
}

function localPlan(body: any) {
  const dest = DESTINATIONS.find((d) => d.id === body.destination_id) ?? DESTINATIONS[0];
  const options = generateItineraryOptions({ ...body, destination_id: dest.id });
  const ranked = compareAndRank(
    options.map((o) => {
      const [dmin, dmax] = dest.ideal_duration_days;
      const duration_fit = o.duration_days >= dmin && o.duration_days <= dmax ? 1 : Math.max(0, 1 - Math.abs(o.duration_days - (dmin + dmax) / 2) / 10);
      const budgetMatch = body.budget_inr != null ? Math.max(0, Math.min(1, 1 - Math.max(0, o.cost_inr - body.budget_inr) / body.budget_inr)) : 0.6;
      return { id: o.variant, name: o.label, cost_inr: o.cost_inr, match_score: budgetMatch, duration_fit, crowd_factor: dest.crowd_factor };
    }),
    { cost: body.budget_inr ? 0.4 : 0.25, match: 0.25, duration_fit: 0.25, uniqueness: 0.1, season: 0 },
  );
  const merged = options.map((o) => ({ ...o, ranked: ranked.find((r) => r.id === o.variant)! })).sort((a, b) => a.ranked.rank - b.ranked.rank);
  return {
    destination: { id: dest.id, name: dest.name, state: dest.state, hero_image: dest.hero_image, tagline: dest.tagline },
    options: merged, query: body,
  };
}

function localBook(body: any) {
  const flights = searchFlights(body.destination_id, body.travelers ?? 2, body.origin ?? "DEL");
  const trains = searchTrains(body.destination_id, body.travelers ?? 2);
  const hotels = searchHotels(body.destination_id, body.nights ?? 3);
  const buses = searchBuses(body.destination_id, body.travelers ?? 2, body.origin_city ?? "Delhi");
  const transit = trains[0] && (!flights[0] || trains[0].price_inr < flights[0].price_inr) ? trains[0] : flights[0];
  const hotel = hotels[1] ?? hotels[0] ?? null;
  return { flights, trains, hotels, buses, best_combo: { transit, hotel, total_inr: (transit?.price_inr ?? 0) + (hotel?.price_per_night_inr ?? 0) * (body.nights ?? 3) } };
}

function localRoute(body: any) {
  const stops = (body.stops ?? []).map((s: any, i: number) => ({ ...s, id: s.id ?? s.name ?? String(i) }));
  const start = stops[body.start_idx ?? 0]?.id;
  const plan = optimizeRoute({ stops, start_id: start });
  return { ...plan, ordered: plan.order.map((id) => stops.find((s: any) => s.id === id)).filter(Boolean), nearby_pings: [] };
}

export const api = {
  health: () => call<{ ok: boolean; destinations: number }>("/health", undefined, () => ({ ok: true, destinations: DESTINATIONS.length })),
  destinations: () => call<any[]>("/destinations", undefined, destinationCards),
  dream: (body: any) => call<any>("/dream", { method: "POST", body: JSON.stringify(body) }, () => localDream(body)),
  cost: (body: any) => call<any>("/cost", { method: "POST", body: JSON.stringify(body) }, () => estimateCost(body)),
  rank: (body: any) => call<any>("/rank", { method: "POST", body: JSON.stringify(body) }, () => compareAndRank(body.items ?? [], body.weights)),
  analyze: (body: { text?: string; url?: string; pdf_base64?: string }) =>
    call<any>("/analyze", { method: "POST", body: JSON.stringify(body) }, () =>
      analyzeText({ text: body.text || body.url || "", source_label: body.url ? "url" : "text" })),
  flexSearch: (body: { origin: string; destination: string; date: string; flex_days?: number; travelers?: number }) =>
    call<any>("/book/flex-search", { method: "POST", body: JSON.stringify(body) }, () => ({ results: [], best: null, savings_inr: 0, hint: "Live flex search needs the backend." })),
  plan: (body: any) => call<any>("/plan", { method: "POST", body: JSON.stringify(body) }, () => localPlan(body)),
  optimize: (body: any) => call<any>("/optimize", { method: "POST", body: JSON.stringify(body) }, () => localPlan(body)),
  sightsee: (id: string) => call<any>(`/sightsee/${id}`, undefined, () => DESTINATIONS.find((d) => d.id === id) ?? null),
  book: (body: any) => call<any>("/book/search", { method: "POST", body: JSON.stringify(body) }, () => localBook(body)),
  route: (body: any) => call<any>("/travel/route", { method: "POST", body: JSON.stringify(body) }, () => localRoute(body)),
  feedback: (body: { target_id: string; score: number; note?: string }) =>
    call<any>("/feedback", { method: "POST", body: JSON.stringify(body) }, () => ({ ok: true, offline: true })),
  // Same-origin TanStack server routes
  places: (body: { lat: number; lng: number; radius?: number; categories?: string[] }) =>
    sameOrigin<{ items: any[]; radius: number; center: { lat: number; lng: number } }>("/api/places", { method: "POST", body: JSON.stringify(body) }),
  trains: (body: { origin: string; destination: string; travelers?: number }) =>
    sameOrigin<{ results: any[]; live_seat_data: boolean; note: string }>("/api/trains", { method: "POST", body: JSON.stringify(body) }),
  ai: {
    dreamEnhance: (body: { name: string; interests: string[] }) =>
      call<{ text: string }>("/ai/dream-enhance", { method: "POST", body: JSON.stringify(body) }, () => ({
        text: `${body.name} is a strong fit for ${body.interests.slice(0, 3).join(", ") || "your travel mood"}. It balances signature sights with practical travel costs.`,
      })),
    planEnhance: (body: { destination: string }) =>
      call<{ text: string }>("/ai/plan-enhance", { method: "POST", body: JSON.stringify(body) }, () => ({
        text: `For ${body.destination}, keep the first day light, start major sights early, reserve one flexible evening for food, and confirm airport or rail transfers before you lock hotels.`,
      })),
  },
};
