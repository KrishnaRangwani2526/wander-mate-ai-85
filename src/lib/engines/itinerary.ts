// Itinerary planning engine — generates multiple day-by-day plans for a destination.

import { DESTINATIONS, type Destination } from "@/data/destinations";
import { estimateCostForDestination, type CostStyle } from "./cost";

export type PlanVariant = "quick" | "scenic" | "deepdive";

export interface PlanInput {
  destination_id: string;
  start_date?: string; // ISO date
  duration_days: number;
  travelers: number;
  style?: CostStyle;
  likes?: string[];   // free text tags
  dislikes?: string[];
  include_flight?: boolean;
  include_train?: boolean;
}

export interface DayPlan {
  day: number;
  date?: string;
  title: string;
  morning: string;
  afternoon: string;
  evening: string;
  food_pick: string;
  pace: "easy" | "balanced" | "packed";
}

export interface ItineraryOption {
  variant: PlanVariant;
  label: string;
  blurb: string;
  duration_days: number;
  days: DayPlan[];
  cost_inr: number;
  per_person_per_day_inr: number;
  pace: "easy" | "balanced" | "packed";
  highlights_covered: string[];
  reasons: string[];
}

const VARIANT_META: Record<
  PlanVariant,
  { label: string; blurb: string; pace: "easy" | "balanced" | "packed"; daysDelta: number; style?: CostStyle }
> = {
  quick: {
    label: "Quick highlights",
    blurb: "Hit the top sights in fewer days. Best if you're time-poor.",
    pace: "packed",
    daysDelta: -2,
  },
  scenic: {
    label: "Scenic balanced",
    blurb: "A relaxed pace with the famous sights plus a few hidden gems.",
    pace: "balanced",
    daysDelta: 0,
  },
  deepdive: {
    label: "Deep dive",
    blurb: "Stay longer, slow down, and live like a local.",
    pace: "easy",
    daysDelta: 2,
    style: "comfort",
  },
};

function addDays(iso: string | undefined, n: number): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

function buildDays(dest: Destination, days: number, variant: PlanVariant, startDate?: string): DayPlan[] {
  const meta = VARIANT_META[variant];
  const hl = dest.highlights;
  const food = dest.famous_food;
  const plans: DayPlan[] = [];

  for (let i = 0; i < days; i++) {
    const dayNum = i + 1;
    let title: string;
    let morning: string;
    let afternoon: string;
    let evening: string;

    if (i === 0) {
      title = `Arrive in ${dest.name}`;
      morning = `Land at ${dest.nearest_airport_iata} or arrive at ${dest.nearest_railhead}; check in and freshen up.`;
      afternoon = `Easy orientation walk near your stay. Get a SIM, cash and local map.`;
      evening = `Sunset stroll and a local dinner — try ${pick(food, 0)}.`;
    } else if (i === days - 1 && days > 1) {
      title = `Wrap up & depart`;
      morning = `Light breakfast, last-minute souvenir shopping for ${dest.state} crafts.`;
      afternoon = `Pack and transfer to ${dest.nearest_airport_iata}/${dest.nearest_railhead}.`;
      evening = `Travel back home.`;
    } else {
      const idx = i - 1;
      const main = pick(hl, idx);
      const second = pick(hl, idx + 1);
      title = `${main}`;
      morning =
        variant === "deepdive"
          ? `Slow morning. Local cafe, then visit ${main}.`
          : `Early start to ${main} — beat the crowds.`;
      afternoon =
        variant === "quick"
          ? `Pair with a quick stop at ${second}.`
          : `Lunch break, then explore ${second} at your own pace.`;
      evening =
        variant === "deepdive"
          ? `Workshop or local interaction. Dinner of ${pick(food, idx)}.`
          : `Relax, journal the day, dinner of ${pick(food, idx)}.`;
    }

    plans.push({
      day: dayNum,
      date: addDays(startDate, i),
      title,
      morning,
      afternoon,
      evening,
      food_pick: pick(food, i),
      pace: meta.pace,
    });
  }
  return plans;
}

export function generateItineraryOptions(input: PlanInput): ItineraryOption[] {
  const dest = DESTINATIONS.find((d) => d.id === input.destination_id);
  if (!dest) throw new Error(`Unknown destination: ${input.destination_id}`);

  const baseDays = Math.max(2, input.duration_days);
  const variants: PlanVariant[] = ["quick", "scenic", "deepdive"];

  const dislikesLower = (input.dislikes ?? []).map((s) => s.toLowerCase());
  const likesLower = (input.likes ?? []).map((s) => s.toLowerCase());

  return variants.map((variant) => {
    const meta = VARIANT_META[variant];
    const days = Math.max(2, baseDays + meta.daysDelta);
    const style: CostStyle = meta.style ?? input.style ?? "mid";

    const cost = estimateCostForDestination(dest, {
      destination_id: dest.id,
      duration_days: days,
      travelers: input.travelers,
      style,
      include_flight: input.include_flight,
      include_train: input.include_train,
    });

    const dayPlans = buildDays(dest, days, variant, input.start_date);

    const reasons: string[] = [meta.blurb];
    if (variant === "quick" && days <= input.duration_days)
      reasons.push("Fits within your available days with buffer.");
    if (variant === "deepdive" && likesLower.some((l) => "food".includes(l)))
      reasons.push("Extra time means real food experiences, not just touristy spots.");
    if (variant === "scenic")
      reasons.push("Matches the destination's ideal duration.");
    if (dislikesLower.some((d) => "crowd".includes(d)) && variant === "deepdive")
      reasons.push("Slower pace avoids peak-hour crowds.");

    const covered = dest.highlights.slice(0, Math.min(dest.highlights.length, Math.max(2, days - 1)));

    return {
      variant,
      label: meta.label,
      blurb: meta.blurb,
      duration_days: days,
      days: dayPlans,
      cost_inr: cost.grand_total_inr,
      per_person_per_day_inr: cost.per_person_per_day,
      pace: meta.pace,
      highlights_covered: covered,
      reasons,
    };
  });
}
