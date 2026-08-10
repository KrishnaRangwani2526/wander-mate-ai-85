// Crowd Intelligence — heuristic 1-10 crowd score from month seasonality and
// destination peak/shoulder/low tables. Pure TS, deterministic, fast.

export interface CrowdInput {
  destination: string; // free text; matched case-insensitively against table keys
  month: number;       // 1-12
}

export interface CrowdScore {
  destination: string;
  month: number;
  score: number; // 1 (empty) - 10 (overwhelmed)
  band: "low" | "shoulder" | "peak";
  reason: string;
  alternatives: { month: number; score: number }[];
}

// Month bands by canonical destination key. Anything not matched falls back
// to a Northern-hemisphere generic curve (summer = peak).
const TABLE: Record<string, { peak: number[]; shoulder: number[]; low: number[] }> = {
  paris:      { peak: [6, 7, 8, 12],   shoulder: [4, 5, 9, 10],     low: [1, 2, 3, 11] },
  london:     { peak: [6, 7, 8, 12],   shoulder: [4, 5, 9, 10],     low: [1, 2, 3, 11] },
  rome:       { peak: [5, 6, 7, 8, 9], shoulder: [3, 4, 10],        low: [1, 2, 11, 12] },
  barcelona:  { peak: [6, 7, 8],       shoulder: [4, 5, 9, 10],     low: [1, 2, 3, 11, 12] },
  bali:       { peak: [7, 8, 12],      shoulder: [4, 5, 6, 9],      low: [1, 2, 3, 10, 11] },
  tokyo:      { peak: [3, 4, 10, 11],  shoulder: [5, 6, 9, 12],     low: [1, 2, 7, 8] },
  dubai:      { peak: [11, 12, 1, 2],  shoulder: [3, 4, 10],        low: [5, 6, 7, 8, 9] },
  goa:        { peak: [11, 12, 1, 2],  shoulder: [3, 10],           low: [4, 5, 6, 7, 8, 9] },
  manali:     { peak: [4, 5, 6, 12],   shoulder: [3, 7, 9, 10, 11], low: [1, 2, 8] },
  kerala:     { peak: [11, 12, 1, 2],  shoulder: [3, 9, 10],        low: [4, 5, 6, 7, 8] },
  rajasthan:  { peak: [10, 11, 12, 1, 2], shoulder: [3, 9],         low: [4, 5, 6, 7, 8] },
  ladakh:     { peak: [6, 7, 8],       shoulder: [5, 9],            low: [1, 2, 3, 4, 10, 11, 12] },
  thailand:   { peak: [12, 1, 2],      shoulder: [3, 11],           low: [4, 5, 6, 7, 8, 9, 10] },
  singapore:  { peak: [6, 7, 12],      shoulder: [1, 2, 3, 4, 5],   low: [8, 9, 10, 11] },
  newyork:    { peak: [5, 6, 9, 10, 12], shoulder: [3, 4, 11],      low: [1, 2, 7, 8] },
};

function keyFor(destination: string): string | null {
  const norm = destination.toLowerCase().replace(/[^a-z]/g, "");
  for (const k of Object.keys(TABLE)) if (norm.includes(k)) return k;
  return null;
}

function scoreFromBands(month: number, bands: { peak: number[]; shoulder: number[]; low: number[] }): number {
  if (bands.peak.includes(month)) return 9;
  if (bands.shoulder.includes(month)) return 6;
  if (bands.low.includes(month)) return 3;
  return 5;
}

export function crowdScore(input: CrowdInput): CrowdScore {
  const month = ((Math.floor(input.month) - 1 + 12) % 12) + 1;
  const key = keyFor(input.destination);
  const bands = key ? TABLE[key] : {
    // Generic NH curve fallback
    peak: [6, 7, 8, 12],
    shoulder: [4, 5, 9, 10],
    low: [1, 2, 3, 11],
  };

  const score = scoreFromBands(month, bands);
  const band: CrowdScore["band"] = score >= 8 ? "peak" : score >= 5 ? "shoulder" : "low";
  const reason = key
    ? `${input.destination} sits in the ${band} band for month ${month} based on historical seasonality.`
    : `No tuned table for "${input.destination}" — using a generic Northern-hemisphere curve. Month ${month} is ${band}.`;

  const alternatives = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    score: scoreFromBands(i + 1, bands),
  }))
    .filter((m) => m.month !== month)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);

  return { destination: input.destination, month, score, band, reason, alternatives };
}
