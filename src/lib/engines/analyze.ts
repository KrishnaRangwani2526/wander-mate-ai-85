// Analyze engine — extracts known destinations + travel intent from raw text.
// Fully offline: pattern matching against the curated DESTINATIONS dataset.

import { DESTINATIONS, type Destination, type Interest, type Season } from "@/data/destinations";

export interface AnalyzeInput {
  text: string;
  source_label?: string; // "url" | "pdf" | "reel" | "text"
}

export interface AnalyzeResult {
  source_label: string;
  matched_destinations: { destination: Destination; mentions: number }[];
  detected_days?: number;
  detected_travelers?: number;
  detected_budget_inr?: number;
  detected_seasons: Season[];
  detected_interests: Interest[];
  estimated_total_cost_inr: number;
  estimated_best_season: Season | null;
  warnings: string[];
  suggestions: string[];
  must_add: { destination: Destination; reason: string }[];
}

const SEASON_KEYWORDS: Record<Season, string[]> = {
  winter: ["winter", "december", "january", "february", "november", "dec", "jan", "feb", "nov"],
  spring: ["spring", "march", "april", "mar", "apr"],
  summer: ["summer", "may", "june", "jun"],
  monsoon: ["monsoon", "rain", "rainy", "july", "august", "september", "jul", "aug", "sep"],
  autumn: ["autumn", "fall", "october", "oct"],
};

const INTEREST_KEYWORDS: Record<Interest, string[]> = {
  mountains: ["mountain", "himalaya", "trek", "snow", "peak", "hill"],
  beach: ["beach", "shore", "coast", "sand", "sea"],
  heritage: ["heritage", "fort", "palace", "temple", "ruins", "monument", "unesco"],
  spiritual: ["spiritual", "temple", "ashram", "ghats", "monastery", "meditat", "yoga"],
  wildlife: ["wildlife", "safari", "tiger", "national park", "forest", "sanctuary"],
  adventure: ["adventure", "trek", "raft", "paraglid", "scuba", "diving", "bungee"],
  desert: ["desert", "dune", "thar", "camel"],
  food: ["food", "cuisine", "street food", "thali", "biryani", "curry"],
  nightlife: ["nightlife", "club", "party", "bar", "rave"],
  backwaters: ["backwater", "houseboat", "lagoon", "kettuvallam"],
};

function clean(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s₹$.,\-]/g, " ").replace(/\s+/g, " ");
}

export function analyzeText(input: AnalyzeInput): AnalyzeResult {
  const text = clean(input.text || "");
  const warnings: string[] = [];
  const suggestions: string[] = [];

  if (text.length < 20) warnings.push("Input is very short — analysis may miss intent.");

  // Match destinations by name + state mentions
  const matched: { destination: Destination; mentions: number }[] = [];
  for (const d of DESTINATIONS) {
    const nameRe = new RegExp(`\\b${d.name.toLowerCase()}\\b`, "g");
    const stateRe = new RegExp(`\\b${d.state.toLowerCase()}\\b`, "g");
    const n = (text.match(nameRe) || []).length + 0.5 * (text.match(stateRe) || []).length;
    if (n > 0) matched.push({ destination: d, mentions: n });
  }
  matched.sort((a, b) => b.mentions - a.mentions);

  // Days
  let detected_days: number | undefined;
  const dMatch =
    text.match(/(\d{1,2})\s*(?:days?|d\b|nights?|n\b)/) ||
    text.match(/(\d{1,2})\s*(?:day|night)\s*(?:trip|tour|itinerary)/);
  if (dMatch) detected_days = Math.max(1, Math.min(40, parseInt(dMatch[1], 10)));

  // Travelers
  let detected_travelers: number | undefined;
  const tMatch = text.match(/(\d{1,2})\s*(?:travelers?|people|pax|persons?|adults?)/);
  if (tMatch) detected_travelers = Math.max(1, Math.min(20, parseInt(tMatch[1], 10)));

  // Budget
  let detected_budget_inr: number | undefined;
  const bMatch =
    text.match(/(?:budget|under|around|approx(?:imately)?)\s*[₹rs.]*\s*(\d[\d,]{2,})/) ||
    text.match(/[₹]\s*(\d[\d,]{2,})/);
  if (bMatch) detected_budget_inr = parseInt(bMatch[1].replace(/,/g, ""), 10);

  // Seasons
  const detected_seasons: Season[] = [];
  for (const [s, words] of Object.entries(SEASON_KEYWORDS) as [Season, string[]][]) {
    if (words.some((w) => text.includes(w))) detected_seasons.push(s);
  }

  // Interests
  const detected_interests: Interest[] = [];
  for (const [i, words] of Object.entries(INTEREST_KEYWORDS) as [Interest, string[]][]) {
    if (words.some((w) => text.includes(w))) detected_interests.push(i);
  }

  // Inherit interests from matched destinations if none detected
  if (!detected_interests.length && matched.length) {
    for (const m of matched.slice(0, 3)) for (const i of m.destination.interests) {
      if (!detected_interests.includes(i)) detected_interests.push(i);
    }
  }

  // Estimated cost
  const days = detected_days ?? 5;
  const travelers = detected_travelers ?? 2;
  const ground = matched.reduce((sum, m) => sum + m.destination.cost_per_day_inr, 0);
  const perDestDays = matched.length ? days / matched.length : days;
  const estimated_total_cost_inr =
    Math.round(ground * perDestDays * travelers) +
    matched.reduce((s, m) => s + m.destination.approx_flight_inr_from_del * travelers * 0.5, 0);

  // Best season
  let estimated_best_season: Season | null = null;
  if (matched.length) {
    const tally: Record<string, number> = {};
    for (const m of matched) for (const s of m.destination.best_seasons) tally[s] = (tally[s] || 0) + 1;
    estimated_best_season = (Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0] as Season) ?? null;
  }

  // Suggestions
  if (!matched.length) {
    suggestions.push("Couldn't identify a destination from your text — try naming a city or region.");
  } else {
    if (detected_days && matched.length > 1 && detected_days / matched.length < 2) {
      suggestions.push(
        `${detected_days} days across ${matched.length} stops is tight — drop one stop or add ${matched.length} more days.`,
      );
    }
    if (estimated_best_season && detected_seasons.length && !detected_seasons.includes(estimated_best_season)) {
      suggestions.push(
        `Your timing (${detected_seasons.join(", ")}) misses the sweet spot — best season is ${estimated_best_season}.`,
      );
    }
    if (detected_budget_inr && estimated_total_cost_inr > detected_budget_inr * 1.15) {
      suggestions.push(
        `Estimated ₹${estimated_total_cost_inr.toLocaleString("en-IN")} exceeds your budget by ~${Math.round(
          ((estimated_total_cost_inr - detected_budget_inr) / detected_budget_inr) * 100,
        )}%. Drop a flight or pick budget hotels.`,
      );
    }
    const avgCrowd = matched.reduce((s, m) => s + m.destination.crowd_factor, 0) / matched.length;
    if (avgCrowd > 0.8) suggestions.push("This route is very crowded — consider a shoulder-season window.");
  }

  // Must-add: nearby same-region underrated picks
  const must_add: AnalyzeResult["must_add"] = [];
  if (matched.length) {
    const regions = new Set(matched.map((m) => m.destination.region));
    const interestSet = new Set(detected_interests);
    const candidates = DESTINATIONS.filter(
      (d) => regions.has(d.region) && !matched.find((m) => m.destination.id === d.id),
    );
    const scored = candidates.map((d) => ({
      d,
      score:
        d.interests.filter((i) => interestSet.has(i)).length * 2 + (1 - d.crowd_factor),
    }));
    scored.sort((a, b) => b.score - a.score);
    for (const { d } of scored.slice(0, 3)) {
      must_add.push({
        destination: d,
        reason: `Same region, lower crowd (${Math.round((1 - d.crowd_factor) * 100)}% off-beat) and matches your interests.`,
      });
    }
  }

  return {
    source_label: input.source_label ?? "text",
    matched_destinations: matched.slice(0, 8),
    detected_days,
    detected_travelers,
    detected_budget_inr,
    detected_seasons,
    detected_interests,
    estimated_total_cost_inr,
    estimated_best_season,
    warnings,
    suggestions,
    must_add,
  };
}
