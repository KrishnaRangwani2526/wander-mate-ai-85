import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { recommendDestinations } from "@/lib/engines/recommendation";
import { estimateCostForDestination, type CostStyle } from "@/lib/engines/cost";
import { compareAndRank, type RankedItem } from "@/lib/engines/rank";
import type { Interest, Season } from "@/data/destinations";

const InterestEnum = z.enum([
  "mountains",
  "beach",
  "heritage",
  "spiritual",
  "wildlife",
  "adventure",
  "desert",
  "food",
  "nightlife",
  "backwaters",
]);

const SeasonEnum = z.enum(["winter", "spring", "summer", "monsoon", "autumn"]);

const DreamSchema = z.object({
  interests: z.array(InterestEnum).min(1).max(10),
  seasons: z.array(SeasonEnum).optional(),
  duration_days: z.number().int().min(1).max(60).optional(),
  origin_iata: z.string().optional(),
  max_budget_per_day_inr: z.number().int().positive().optional(),
  avoid_crowds: z.boolean().optional(),
  travelers: z.number().int().min(1).max(20).optional(),
  style: z.enum(["shoestring", "budget", "mid", "comfort", "luxury"]).optional(),
});

export type DreamRequest = z.infer<typeof DreamSchema>;

export interface DreamResultItem {
  id: string;
  name: string;
  state: string;
  tagline: string;
  hero_image: string;
  highlights: string[];
  interests: Interest[];
  best_seasons: Season[];
  score: number;
  reasons: string[];
  estimated_cost_inr: number;
  per_person_per_day_inr: number;
  ranked: RankedItem;
}

export const dreamDestinations = createServerFn({ method: "POST" })
  .inputValidator((d: DreamRequest) => DreamSchema.parse(d))
  .handler(async ({ data }) => {
    const matches = recommendDestinations(data, 60);
    const travelers = data.travelers ?? 2;
    const days = data.duration_days ?? 5;
    const style: CostStyle = data.style ?? "mid";

    const withCost = matches.map((m) => {
      const cost = estimateCostForDestination(m.destination, {
        destination_id: m.destination.id,
        duration_days: days,
        travelers,
        style,
        include_flight: true,
      });
      const [dmin, dmax] = m.destination.ideal_duration_days;
      const duration_fit =
        days >= dmin && days <= dmax ? 1 : Math.max(0, 1 - Math.abs(days - (dmin + dmax) / 2) / 10);
      return { match: m, cost, duration_fit };
    });

    const rankInput = withCost.map(({ match, cost, duration_fit }) => ({
      id: match.destination.id,
      name: match.destination.name,
      cost_inr: cost.grand_total_inr,
      match_score: match.score,
      duration_fit,
      crowd_factor: match.destination.crowd_factor,
      season_match: data.seasons
        ? match.destination.best_seasons.some((s) => data.seasons!.includes(s))
        : undefined,
    }));

    const ranked = compareAndRank(rankInput, {
      cost: data.max_budget_per_day_inr ? 0.35 : 0.2,
      match: 0.35,
      duration_fit: 0.15,
      uniqueness: data.avoid_crowds ? 0.2 : 0.1,
      season: 0.1,
    });

    const results: DreamResultItem[] = ranked.map((r) => {
      const found = withCost.find((w) => w.match.destination.id === r.id)!;
      const d = found.match.destination;
      return {
        id: d.id,
        name: d.name,
        state: d.state,
        tagline: d.tagline,
        hero_image: d.hero_image,
        highlights: d.highlights,
        interests: d.interests,
        best_seasons: d.best_seasons,
        score: found.match.score,
        reasons: found.match.reasons,
        estimated_cost_inr: found.cost.grand_total_inr,
        per_person_per_day_inr: found.cost.per_person_per_day,
        ranked: r,
      };
    });

    return { results, query: data };
  });
