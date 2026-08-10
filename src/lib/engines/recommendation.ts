// Recommendation engine — interests are HARD filters, score only ranks survivors.
import { DESTINATIONS, type Destination, type Interest, type Season } from "@/data/destinations";

export interface DreamInput {
  interests: Interest[];
  seasons?: Season[];
  duration_days?: number;
  origin_iata?: string;
  max_budget_per_day_inr?: number;
  avoid_crowds?: boolean;
}

export interface DestinationMatch {
  destination: Destination;
  score: number;
  reasons: string[];
}

export function recommendDestinations(input: DreamInput, limit = 6): DestinationMatch[] {
  const { interests, seasons, duration_days, max_budget_per_day_inr, avoid_crowds } = input;

  // ---- HARD FILTERS ----
  let pool: Destination[] = DESTINATIONS.slice();

  if (interests.length > 0) {
    // Must overlap at least one interest
    pool = pool.filter((d) => d.interests.some((i) => interests.includes(i)));
  }

  if (seasons && seasons.length > 0) {
    // Strict season match (avoid recommending Ladakh in winter, etc.)
    pool = pool.filter((d) => d.best_seasons.some((s) => seasons.includes(s)));
  }

  if (max_budget_per_day_inr != null && max_budget_per_day_inr > 0) {
    // Allow 15% slack so "budget 3000" still surfaces 3450 places
    pool = pool.filter((d) => d.cost_per_day_inr <= max_budget_per_day_inr * 1.15);
  }

  if (avoid_crowds) {
    pool = pool.filter((d) => d.crowd_factor <= 0.75);
  }

  // ---- SOFT SCORING on survivors ----
  const scored = pool.map<DestinationMatch>((d) => {
    const reasons: string[] = [];
    let score = 0;

    if (interests.length > 0) {
      const overlap = d.interests.filter((i) => interests.includes(i));
      score += (overlap.length / Math.max(1, Math.min(interests.length, d.interests.length))) * 0.5;
      reasons.push(`Matches ${overlap.join(", ")}`);
    }

    if (seasons && seasons.length > 0) {
      score += 0.2;
      reasons.push("In peak season");
    }

    if (duration_days != null) {
      const [min, max] = d.ideal_duration_days;
      if (duration_days >= min && duration_days <= max) {
        score += 0.15;
        reasons.push(`Ideal for ${duration_days}-day trip`);
      } else {
        const mid = (min + max) / 2;
        score += Math.max(0, 0.1 - Math.abs(duration_days - mid) * 0.02);
      }
    }

    if (max_budget_per_day_inr != null && max_budget_per_day_inr > 0) {
      if (d.cost_per_day_inr <= max_budget_per_day_inr) {
        score += 0.1;
        reasons.push(`Within ₹${max_budget_per_day_inr}/day budget`);
      } else {
        score += 0.04;
      }
    }

    if (avoid_crowds) {
      score += (1 - d.crowd_factor) * 0.1;
      if (d.crowd_factor < 0.5) reasons.push("Off the beaten path");
    }

    return { destination: d, score: Math.max(0, Math.min(1, score)), reasons };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}
