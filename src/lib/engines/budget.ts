// Deterministic budget optimizer — pure TS, unit-testable.
// Allocates a total trip budget across categories using configurable weights
// and travel style, then surfaces feasibility + savings tradeoffs.

export type TravelStyle = "shoestring" | "budget" | "mid" | "comfort" | "luxury";

export interface BudgetInput {
  destination: string;
  total_budget: number;
  duration_days: number;
  travelers?: number;
  currency?: string;
  style?: TravelStyle;
  has_flight?: boolean; // if false, skip the flights bucket
}

export interface BudgetAllocation {
  flights: number;
  accommodation: number;
  food: number;
  activities: number;
  local_transport: number;
  misc: number;
}

export interface BudgetResult {
  destination: string;
  total_budget: number;
  currency: string;
  travelers: number;
  duration_days: number;
  style: TravelStyle;
  per_person_per_day: number;
  allocation: BudgetAllocation;
  feasibility: "comfortable" | "tight" | "unrealistic";
  benchmark_per_person_per_day: number;
  tradeoffs: string[];
  savings_tips: string[];
}

// Rough INR-equivalent floors per person per day by style (excluding flights).
// Used purely for feasibility scoring — not a quote.
const STYLE_FLOOR_INR: Record<TravelStyle, number> = {
  shoestring: 1500,
  budget: 3000,
  mid: 6000,
  comfort: 12000,
  luxury: 25000,
};

const WEIGHTS: Record<TravelStyle, BudgetAllocation> = {
  shoestring: { flights: 0.30, accommodation: 0.20, food: 0.20, activities: 0.15, local_transport: 0.10, misc: 0.05 },
  budget:     { flights: 0.32, accommodation: 0.22, food: 0.20, activities: 0.15, local_transport: 0.07, misc: 0.04 },
  mid:        { flights: 0.30, accommodation: 0.28, food: 0.18, activities: 0.15, local_transport: 0.05, misc: 0.04 },
  comfort:    { flights: 0.28, accommodation: 0.34, food: 0.16, activities: 0.14, local_transport: 0.05, misc: 0.03 },
  luxury:     { flights: 0.25, accommodation: 0.40, food: 0.15, activities: 0.13, local_transport: 0.04, misc: 0.03 },
};

function normalise(w: BudgetAllocation): BudgetAllocation {
  const sum = Object.values(w).reduce((a, b) => a + b, 0);
  const out = {} as BudgetAllocation;
  (Object.keys(w) as (keyof BudgetAllocation)[]).forEach((k) => {
    out[k] = w[k] / sum;
  });
  return out;
}

export function optimizeBudget(input: BudgetInput): BudgetResult {
  const travelers = Math.max(1, Math.floor(input.travelers ?? 1));
  const duration_days = Math.max(1, Math.floor(input.duration_days));
  const total = Math.max(0, input.total_budget);
  const currency = (input.currency ?? "INR").toUpperCase();
  const style: TravelStyle = input.style ?? "mid";

  let weights: BudgetAllocation = { ...WEIGHTS[style] };
  if (input.has_flight === false) {
    weights.flights = 0;
    weights = normalise(weights);
  }

  const allocation: BudgetAllocation = {
    flights: Math.round(total * weights.flights),
    accommodation: Math.round(total * weights.accommodation),
    food: Math.round(total * weights.food),
    activities: Math.round(total * weights.activities),
    local_transport: Math.round(total * weights.local_transport),
    misc: Math.round(total * weights.misc),
  };

  const per_person_per_day = travelers * duration_days
    ? Math.round(total / (travelers * duration_days))
    : 0;

  // Currency-agnostic feasibility: compare per-person/day to style floor
  // expressed in INR. Apply a naive currency multiplier so non-INR budgets
  // map roughly to the same lifestyle band.
  const fxToInr: Record<string, number> = { INR: 1, USD: 84, EUR: 90, GBP: 105, AED: 23, SGD: 62, JPY: 0.55 };
  const ppdInInr = per_person_per_day * (fxToInr[currency] ?? 1);
  const floor = STYLE_FLOOR_INR[style];
  let feasibility: BudgetResult["feasibility"];
  if (ppdInInr >= floor * 1.2) feasibility = "comfortable";
  else if (ppdInInr >= floor * 0.75) feasibility = "tight";
  else feasibility = "unrealistic";

  const tradeoffs: string[] = [];
  if (feasibility === "unrealistic") {
    tradeoffs.push(
      `At ${currency} ${per_person_per_day}/person/day, ${style} style in ${input.destination} is unlikely. Either drop to a lower style or add more days off the trip.`,
    );
  }
  if (input.has_flight !== false && allocation.flights < 5000 && currency === "INR") {
    tradeoffs.push("Flight bucket is small — consider trains, buses, or shifting to nearer destinations.");
  }
  if (allocation.activities < total * 0.08) {
    tradeoffs.push("Activities bucket is thin — book only 1-2 paid experiences and lean on free walking tours/markets.");
  }

  const savings_tips: string[] = [
    "Travel mid-week and avoid local festival peaks to cut accommodation 15-25%.",
    "Book flights 4-8 weeks out and use flexible-date search for the cheapest combo.",
    "Mix one nice dinner per day with breakfast/lunch from bakeries/street food.",
    "Use day passes for metros/buses instead of cabs — typically 40-60% cheaper.",
  ];
  if (style === "luxury") savings_tips.push("Stay 4-night minimum at boutique hotels for direct-booking perks.");

  return {
    destination: input.destination,
    total_budget: total,
    currency,
    travelers,
    duration_days,
    style,
    per_person_per_day,
    allocation,
    feasibility,
    benchmark_per_person_per_day: Math.round(floor / (fxToInr[currency] ?? 1)),
    tradeoffs,
    savings_tips,
  };
}
