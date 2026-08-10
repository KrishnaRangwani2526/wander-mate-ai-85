import { createFileRoute } from "@tanstack/react-router";

type ChatMessage = { role?: string; content?: string };

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_PROMPT = `You are WanderCompanion, a real-time AI travel copilot for Indian travelers.

Rules:
- Answer the user's exact question first. Do not switch to unrelated prefilled destinations.
- Use Google Search grounding when available for current facts, famous places, weather/season notes, routes, live travel context, and recent prices.
- If live flight offers are provided, use only those exact airlines, flight numbers, prices, dates, stops, and durations. If they are missing, say live offers were not available and give the next best search strategy.
- For destination discovery, include famous places plus places that match budget, duration, interests, crowd preference, and season.
- For flights, rank cheapest-first but explain tradeoffs: price 50%, duration 20%, stops 20%, airline/service 10%.
- For itineraries, provide labeled day-by-day plans, budget split, optimizer tips, and cheaper alternatives.
- Format in concise Markdown with tables when useful. Prices in ₹ INR. End with one practical next step.`;

const CITY_TO_IATA: Record<string, string> = {
  delhi: "DEL",
  "new delhi": "DEL",
  mumbai: "BOM",
  bombay: "BOM",
  bangalore: "BLR",
  bengaluru: "BLR",
  goa: "GOI",
  chennai: "MAA",
  kolkata: "CCU",
  calcutta: "CCU",
  kochi: "COK",
  cochin: "COK",
  hyderabad: "HYD",
  jaipur: "JAI",
  udaipur: "UDR",
  chandigarh: "IXC",
  amritsar: "ATQ",
  ludhiana: "LUH",
  jalandhar: "AIP",
  leh: "IXL",
  srinagar: "SXR",
  pune: "PNQ",
  ahmedabad: "AMD",
  lucknow: "LKO",
  patna: "PAT",
  varanasi: "VNS",
  bhubaneswar: "BBI",
  indore: "IDR",
  bhopal: "BHO",
  nagpur: "NAG",
  dehradun: "DED",
  bali: "DPS",
  dubai: "DXB",
  singapore: "SIN",
  london: "LHR",
  bangkok: "BKK",
  paris: "CDG",
  tokyo: "NRT",
  "new york": "JFK",
};

function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}

function toGeminiRole(role?: string) {
  return role === "assistant" || role === "model" ? "model" : "user";
}

function extractRoute(text: string) {
  const iata = text.match(/\b([A-Z]{3})\s*(?:to|->|→|-)\s*([A-Z]{3})\b/i);
  if (iata) return { origin: iata[1].toUpperCase(), destination: iata[2].toUpperCase() };

  const clean = text.toLowerCase().replace(/[^a-z\s>-]/g, " ").replace(/\s+/g, " ").trim();
  const fromTo = clean.match(/\bfrom\s+([a-z ]{2,35}?)\s+(?:to|->)\s+([a-z ]{2,35}?)(?:\s|$)/i);
  if (fromTo) {
    const originName = pickKnownCity(fromTo[1]);
    const destinationName = pickKnownCity(fromTo[2]);
    const origin = originName ? CITY_TO_IATA[originName] : undefined;
    const destination = destinationName ? CITY_TO_IATA[destinationName] : undefined;
    return origin && destination ? { origin, destination } : null;
  }

  const simpleTo = clean.match(/\b([a-z ]{2,35}?)\s+(?:to|->)\s+([a-z ]{2,35}?)(?:\s|$)/i);
  if (!simpleTo) return null;
  const originName = pickKnownCity(simpleTo[1]);
  const destinationName = pickKnownCity(simpleTo[2]);
  const origin = originName ? CITY_TO_IATA[originName] : undefined;
  const destination = destinationName ? CITY_TO_IATA[destinationName] : undefined;
  return origin && destination ? { origin, destination } : null;
}

function pickKnownCity(fragment: string) {
  const words = fragment.toLowerCase().replace(/\s+/g, " ").trim();
  const cities = Object.keys(CITY_TO_IATA).sort((a, b) => b.length - a.length);
  return cities.find((city) => new RegExp(`(^|\\s)${city.replace(/ /g, "\\\\s+")}(\\s|$)`, "i").test(words));
}

function extractDate(text: string) {
  const iso = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso) return iso[1];
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().slice(0, 10);
}

function parseDuration(duration?: string) {
  if (!duration) return 0;
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  return (Number(match?.[1] || 0) * 60) + Number(match?.[2] || 0);
}

function toInr(amount?: string, currency?: string) {
  const value = Number(amount || 0);
  const rates: Record<string, number> = { INR: 1, USD: 84, EUR: 90, GBP: 105, AED: 23 };
  return Math.round(value * (rates[(currency || "USD").toUpperCase()] || 84));
}

async function getLiveFlights(text: string) {
  const route = extractRoute(text);
  if (!route) return [];
  if (!/\b(flight|flights|fly|ticket|airfare|fare|cheapest|low price|offer)\b/i.test(text)) return [];
  const duffelKey = process.env.DUFFEL_API_KEY;
  if (!duffelKey) return [];
  const date = extractDate(text);
  try {
    const res = await fetch("https://api.duffel.com/air/offer_requests?return_offers=true", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${duffelKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "Duffel-Version": "v2",
      },
      body: JSON.stringify({
        data: {
          slices: [{ origin: route.origin, destination: route.destination, departure_date: date, cabin_class: "economy" }],
          passengers: [{ type: "adult" }],
          cabin_class: "economy",
        },
      }),
    });
    if (!res.ok) return [];
    const payload = await res.json();
    const offers = payload?.data?.offers || [];
    return offers.slice(0, 8).map((offer: any) => {
      const slice = offer.slices?.[0] || {};
      const segments = slice.segments || [];
      const first = segments[0] || {};
      const last = segments[segments.length - 1] || first;
      const carrier = first.operating_carrier || first.marketing_carrier || {};
      return {
        airline: carrier.name || "Unknown airline",
        code: carrier.iata_code || "",
        flight_number: first.operating_carrier_flight_number || first.marketing_carrier_flight_number || "",
        from: first.origin?.iata_code || route.origin,
        to: last.destination?.iata_code || route.destination,
        depart: first.departing_at || "",
        arrive: last.arriving_at || "",
        duration_min: parseDuration(slice.duration),
        stops: Math.max(0, segments.length - 1),
        price_inr: toInr(offer.total_amount, offer.total_currency),
        price_raw: `${offer.total_amount} ${offer.total_currency}`,
        source: "duffel_live",
      };
    }).sort((a: any, b: any) => a.price_inr - b.price_inr);
  } catch {
    return [];
  }
}

async function askGemini(apiKey: string, messages: ChatMessage[], liveFlights: unknown[], useSearch: boolean) {
  const latest = messages[messages.length - 1]?.content || "";
  const contents = messages.slice(-10).map((message) => ({
    role: toGeminiRole(message.role),
    parts: [{ text: message.content || "" }],
  }));
  const liveContext = liveFlights.length
    ? `\n\nLIVE FLIGHT OFFERS JSON (ground your flight answer only in this data):\n${JSON.stringify(liveFlights).slice(0, 5000)}`
    : "";
  contents.push({
    role: "user",
    parts: [{ text: `Answer this as a real-time travel copilot, not from a canned dataset: ${latest}${liveContext}` }],
  });

  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents,
    generationConfig: { temperature: 0.45, maxOutputTokens: 1800 },
  };
  if (useSearch) body.tools = [{ google_search: {} }];

  const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload?.error?.message || `Gemini returned ${res.status}`);
  const text = payload?.candidates?.[0]?.content?.parts?.map((part: any) => part.text || "").join("\n").trim();
  if (!text) throw new Error("Gemini returned an empty response");
  return text;
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const geminiKey = process.env.GEMINI_API_KEY;
        if (!geminiKey) {
          return json({ text: "GEMINI_API_KEY is missing from the server environment." }, { status: 503 });
        }

        const body = await request.json().catch(() => ({}));
        const messages = Array.isArray(body.messages) ? body.messages as ChatMessage[] : [];
        if (!messages.length) return json({ text: "Ask me a travel question to start." });

        const latest = messages[messages.length - 1]?.content || "";
        const liveFlights = await getLiveFlights(latest);
        try {
          const text = await askGemini(geminiKey, messages, liveFlights, true);
          return json({ text, live_flights: liveFlights, source: "gemini_google_search" });
        } catch (firstError) {
          try {
            const text = await askGemini(geminiKey, messages, liveFlights, false);
            return json({ text, live_flights: liveFlights, source: "gemini" });
          } catch (secondError) {
            const detail = secondError instanceof Error ? secondError.message : String(secondError);
            const first = firstError instanceof Error ? firstError.message : String(firstError);
            return json({ text: `Gemini API error: ${detail || first}` }, { status: 502 });
          }
        }
      },
    },
  },
});