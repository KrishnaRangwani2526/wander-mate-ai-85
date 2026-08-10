import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateItineraryOptions, type ItineraryOption } from "@/lib/engines/itinerary";
import { compareAndRank, type RankedItem } from "@/lib/engines/rank";
import { DESTINATIONS } from "@/data/destinations";

const PlanSchema = z.object({
  destination_id: z.string().min(1),
  start_date: z.string().optional(),
  duration_days: z.number().int().min(2).max(40),
  travelers: z.number().int().min(1).max(20),
  style: z.enum(["shoestring", "budget", "mid", "comfort", "luxury"]).optional(),
  likes: z.array(z.string()).optional(),
  dislikes: z.array(z.string()).optional(),
  budget_inr: z.number().int().positive().optional(),
  include_flight: z.boolean().optional(),
  include_train: z.boolean().optional(),
});

export type PlanRequest = z.infer<typeof PlanSchema>;

export interface PlanResponse {
  destination: {
    id: string;
    name: string;
    state: string;
    hero_image: string;
    tagline: string;
  };
  options: (ItineraryOption & { ranked: RankedItem })[];
  query: PlanRequest;
}

export const planTrip = createServerFn({ method: "POST" })
  .inputValidator((d: PlanRequest) => PlanSchema.parse(d))
  .handler(async ({ data }): Promise<PlanResponse> => {
    const dest = DESTINATIONS.find((d2) => d2.id === data.destination_id);
    if (!dest) throw new Error("Unknown destination");

    const options = generateItineraryOptions({
      destination_id: data.destination_id,
      start_date: data.start_date,
      duration_days: data.duration_days,
      travelers: data.travelers,
      style: data.style,
      likes: data.likes,
      dislikes: data.dislikes,
      include_flight: data.include_flight,
      include_train: data.include_train,
    });

    const rankItems = options.map((o) => {
      const [dmin, dmax] = dest.ideal_duration_days;
      const dur = o.duration_days;
      const duration_fit =
        dur >= dmin && dur <= dmax ? 1 : Math.max(0, 1 - Math.abs(dur - (dmin + dmax) / 2) / 10);
      const budgetMatch =
        data.budget_inr != null
          ? Math.max(0, Math.min(1, 1 - Math.max(0, o.cost_inr - data.budget_inr) / data.budget_inr))
          : 0.6;
      return {
        id: o.variant,
        name: o.label,
        cost_inr: o.cost_inr,
        match_score: budgetMatch,
        duration_fit,
        crowd_factor: dest.crowd_factor,
        season_match: undefined,
      };
    });

    const ranked = compareAndRank(rankItems, {
      cost: data.budget_inr ? 0.4 : 0.25,
      match: 0.25,
      duration_fit: 0.25,
      uniqueness: 0.1,
      season: 0,
    });

    const merged = options.map((o) => {
      const r = ranked.find((x) => x.id === o.variant)!;
      return { ...o, ranked: r };
    });
    // Sort by rank so #1 is first
    merged.sort((a, b) => a.ranked.rank - b.ranked.rank);

    return {
      destination: {
        id: dest.id,
        name: dest.name,
        state: dest.state,
        hero_image: dest.hero_image,
        tagline: dest.tagline,
      },
      options: merged,
      query: data,
    };
  });
