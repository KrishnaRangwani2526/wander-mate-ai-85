import { createFileRoute } from "@tanstack/react-router";

type ChatMessage = { role?: string; content?: string };

const MODEL = "google/gemini-3.6-flash";
const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM_PROMPT = `You are WanderCompanion — a warm, chatty AI travel companion for people travelling in and out of India.

HOW TO TALK
- Talk like a well-travelled friend on WhatsApp, not like a brochure or a database dump.
- Open with one short human line that reacts to what they said ("Manali in December is gorgeous — proper snow season.").
- Then answer in short labelled sections with plain headings, e.g.
  "Places you shouldn't miss", "What to eat", "Best time to go", "Roughly what it costs", "How many days".
- Use short bullets (max ~12 words each). Bold the name, then a half-line of why it's worth it.
- Prices always in ₹ with a realistic range, never a single fake exact number.
- Never invent flight numbers, train numbers, hotel bookings or live prices. Say what's typical, and point to the Book tab for live options (IRCTC for trains, RedBus for buses, flight sites for flights).
- Close with ONE friendly question or next step ("Want me to turn this into a day-by-day plan?").
- Keep it under ~350 words unless the user asks for a full itinerary.
- If a question is vague, still give a useful answer first, then ask the one thing you need.

ITINERARIES
- Day by day, with rough times (morning / 9am / afternoon / evening), travel time between stops, and a food stop each day.
- Order stops so the day makes geographic sense — no zig-zagging across the city.
- Give a small budget split (stay / food / travel / entries) and one cheaper swap.

Never mention that you are a language model, and never mention API keys or backends.`;

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
  kochi: "COK",
  hyderabad: "HYD",
  jaipur: "JAI",
  udaipur: "UDR",
  chandigarh: "IXC",
  amritsar: "ATQ",
  leh: "IXL",
  srinagar: "SXR",
  pune: "PNQ",
  ahmedabad: "AMD",
  lucknow: "LKO",
  varanasi: "VNS",
  indore: "IDR",
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

function pickKnownCity(fragment: string) {
  const words = fragment.toLowerCase().replace(/\s+/g, " ").trim();
  const cities = Object.keys(CITY_TO_IATA).sort((a, b) => b.length - a.length);
  return cities.find((city) => words.includes(city));
}

function extractRoute(text: string) {
  const iata = text.match(/\b([A-Z]{3})\s*(?:to|->|→|-)\s*([A-Z]{3})\b/);
  if (iata) return { origin: iata[1].toUpperCase(), destination: iata[2].toUpperCase() };
  const clean = text.toLowerCase().replace(/[^a-z\s>-]/g, " ").replace(/\s+/g, " ").trim();
  const match =
    clean.match(/\bfrom\s+([a-z ]{2,35}?)\s+(?:to|->)\s+([a-z ]{2,35}?)(?:\s|$)/) ||
    clean.match(/\b([a-z ]{2,35}?)\s+(?:to|->)\s+([a-z ]{2,35}?)(?:\s|$)/);
  if (!match) return null;
  const originName = pickKnownCity(match[1] || "");
  const destinationName = pickKnownCity(match[2] || "");
  const origin = originName ? CITY_TO_IATA[originName] : undefined;
  const destination = destinationName ? CITY_TO_IATA[destinationName] : undefined;
  return origin && destination ? { origin, destination } : null;
}

/** Free, keyless live-ish context: current date + (optional) weather for the destination. */
async function fetchFast(url: string, ms = 2500) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(id);
  }
}

async function getLiveContext(text: string) {
  const bits: string[] = [];
  const now = new Date();
  bits.push(`Today's date is ${now.toISOString().slice(0, 10)} (IST timezone traveler).`);

  const route = extractRoute(text);
  if (route) bits.push(`Detected route: ${route.origin} → ${route.destination}.`);

  const place = text.match(/\b(?:in|to|at|for)\s+([A-Z][a-zA-Z]{2,20})/)?.[1];
  if (place) {
    try {
      const geo = await fetchFast(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place)}&count=1`,
      );
      const geoJson: any = geo?.ok ? await geo.json() : null;
      const hit = geoJson?.results?.[0];
      if (hit) {
        const wx = await fetchFast(
          `https://api.open-meteo.com/v1/forecast?latitude=${hit.latitude}&longitude=${hit.longitude}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&forecast_days=5&timezone=auto`,
        );
        const wxJson: any = wx?.ok ? await wx.json() : null;
        if (wxJson?.current) {
          bits.push(
            `Live weather for ${hit.name}, ${hit.country ?? ""}: now ${wxJson.current.temperature_2m}°C; next days max ${(
              wxJson.daily?.temperature_2m_max ?? []
            )
              .slice(0, 5)
              .join("/")}°C, min ${(wxJson.daily?.temperature_2m_min ?? []).slice(0, 5).join("/")}°C, rain ${(
              wxJson.daily?.precipitation_sum ?? []
            )
              .slice(0, 5)
              .join("/")}mm.`,
          );
        }
      }
    } catch {
      /* weather is best-effort */
    }
  }
  return bits.join("\n");
}

async function askLovableAi(apiKey: string, messages: ChatMessage[], liveContext: string) {
  const history = messages.slice(-12).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content || "",
  }));

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.6,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...(liveContext
          ? [{ role: "system", content: `Real-time context you may rely on:\n${liveContext}` }]
          : []),
        ...history,
      ],
    }),
  });

  const payload: any = await res.json().catch(() => ({}));
  if (res.status === 429) throw new Error("I'm getting a lot of questions right now — try again in a moment.");
  if (res.status === 402) throw new Error("The AI usage limit for this workspace has run out.");
  if (!res.ok) throw new Error(payload?.error?.message || `AI service returned ${res.status}`);
  const text = payload?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("The AI returned an empty reply — please rephrase.");
  return text as string;
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return json({ text: "AI is not configured for this project yet." }, { status: 503 });

        const body: any = await request.json().catch(() => ({}));
        const messages: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];
        if (!messages.length) return json({ text: "Ask me anything about your trip to get started." });

        const latest = messages[messages.length - 1]?.content || "";
        const liveContext = await getLiveContext(latest);

        try {
          const text = await askLovableAi(apiKey, messages, liveContext);
          return json({ text, source: "lovable_ai" });
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error);
          return json({ text: `⚠️ ${detail}` }, { status: 502 });
        }
      },
    },
  },
});
