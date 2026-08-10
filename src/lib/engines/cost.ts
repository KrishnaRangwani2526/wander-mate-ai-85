// Cost estimation engine — quick per-trip cost rollup using destination data.

import { DESTINATIONS, type Destination } from "@/data/destinations";

export type CostStyle = "shoestring" | "budget" | "mid" | "comfort" | "luxury";

const STYLE_MULT: Record<CostStyle, number> = {
  shoestring: 0.55,
  budget: 0.75,
  mid: 1.0,
  comfort: 1.6,
  luxury: 2.8,
};

export interface CostInput {
  destination_id: string;
  duration_days: number;
  travelers: number;
  style?: CostStyle;
  include_flight?: boolean;
  include_train?: boolean;
  origin_iata?: string; // currently unused; reserved for matrix
}

export interface CostBreakdown {
  destination: string;
  travelers: number;
  duration_days: number;
  style: CostStyle;
  per_person_per_day: number;
  accommodation: number;
  food: number;
  activities: number;
  local_transport: number;
  misc: number;
  flights_total: number;
  trains_total: number;
  grand_total_inr: number;
  notes: string[];
}

export function estimateCost(input: CostInput): CostBreakdown {
  const dest = DESTINATIONS.find((d) => d.id === input.destination_id);
  if (!dest) throw new Error(`Unknown destination: ${input.destination_id}`);
  return estimateCostForDestination(dest, input);
}

export function estimateCostForDestination(dest: Destination, input: CostInput): CostBreakdown {
  const style: CostStyle = input.style ?? "mid";
  const m = STYLE_MULT[style];
  const pppd = Math.round(dest.cost_per_day_inr * m);

  // Split pppd across categories
  const accommodation = Math.round(pppd * 0.45);
  const food = Math.round(pppd * 0.22);
  const activities = Math.round(pppd * 0.18);
  const local_transport = Math.round(pppd * 0.1);
  const misc = pppd - accommodation - food - activities - local_transport;

  const onground =
    (accommodation + food + activities + local_transport + misc) *
    input.travelers *
    input.duration_days;

  const flights_total = input.include_flight
    ? Math.round(dest.approx_flight_inr_from_del * m * input.travelers)
    : 0;
  const trains_total = input.include_train
    ? Math.round(dest.approx_train_inr_from_del * input.travelers)
    : 0;

  const notes: string[] = [];
  if (input.include_flight && input.include_train) {
    notes.push("Flight + train both included — usually pick one.");
  }
  if (dest.approx_train_inr_from_del === 0 && input.include_train) {
    notes.push("No direct rail link from Delhi — train cost is 0.");
  }

  return {
    destination: dest.name,
    travelers: input.travelers,
    duration_days: input.duration_days,
    style,
    per_person_per_day: pppd,
    accommodation,
    food,
    activities,
    local_transport,
    misc,
    flights_total,
    trains_total,
    grand_total_inr: onground + flights_total + trains_total,
    notes,
  };
}
