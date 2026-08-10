// Compare and rank engine — fair, transparent multi-criteria ranking.

export type RankCriterion = "cost" | "match" | "duration_fit" | "uniqueness" | "season";

export interface RankWeights {
  cost?: number; // lower is better
  match?: number; // higher is better (use score 0..1)
  duration_fit?: number;
  uniqueness?: number; // higher is better (1 - crowd)
  season?: number;
}

export interface RankItem {
  id: string;
  name: string;
  cost_inr?: number;
  match_score?: number; // 0..1
  duration_fit?: number; // 0..1
  crowd_factor?: number; // 0..1
  season_match?: boolean;
}

export interface RankedItem extends RankItem {
  rank: number;
  total_score: number;
  contributions: Record<string, number>;
  verdict: string;
}

const DEFAULT_WEIGHTS: Required<RankWeights> = {
  cost: 0.3,
  match: 0.3,
  duration_fit: 0.15,
  uniqueness: 0.15,
  season: 0.1,
};

export function compareAndRank(items: RankItem[], weights: RankWeights = {}): RankedItem[] {
  const w = { ...DEFAULT_WEIGHTS, ...weights };
  // normalize cost (invert: cheaper = better)
  const costs = items.map((i) => i.cost_inr ?? 0);
  const maxCost = Math.max(1, ...costs);
  const minCost = Math.min(...costs);

  const scored = items.map((item) => {
    const costNorm =
      item.cost_inr != null && maxCost !== minCost
        ? 1 - (item.cost_inr - minCost) / (maxCost - minCost)
        : 0.5;
    const matchNorm = item.match_score ?? 0.5;
    const durNorm = item.duration_fit ?? 0.5;
    const uniqNorm = item.crowd_factor != null ? 1 - item.crowd_factor : 0.5;
    const seasonNorm = item.season_match == null ? 0.5 : item.season_match ? 1 : 0;

    const contributions = {
      cost: costNorm * w.cost,
      match: matchNorm * w.match,
      duration_fit: durNorm * w.duration_fit,
      uniqueness: uniqNorm * w.uniqueness,
      season: seasonNorm * w.season,
    };
    const total = Object.values(contributions).reduce((a, b) => a + b, 0);

    let verdict = "Solid pick";
    if (total > 0.75) verdict = "Top recommendation — don't miss";
    else if (total > 0.6) verdict = "Strong fit";
    else if (total < 0.35) verdict = "Consider only if other constraints win";

    return { ...item, rank: 0, total_score: Math.round(total * 1000) / 1000, contributions, verdict };
  });

  scored.sort((a, b) => b.total_score - a.total_score);
  scored.forEach((s, i) => (s.rank = i + 1));
  return scored;
}
