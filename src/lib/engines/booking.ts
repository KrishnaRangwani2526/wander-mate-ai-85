// Booking engine — synthesizes flight, train, hotel options for a destination.
// Pure hardcoded heuristics derived from destination dataset. Offline-only.

import { DESTINATIONS, type Destination } from "@/data/destinations";

export interface FlightOption {
  id: string;
  airline: string;
  from: string;
  to: string;
  depart: string;
  arrive: string;
  stops: number;
  duration_min: number;
  class: "Economy" | "Premium Eco" | "Business";
  price_inr: number;
  baggage: string;
  refundable: boolean;
  external_url: string;
}

export interface TrainOption {
  id: string;
  train_no: string;
  name: string;
  from: string;
  to: string;
  depart: string;
  arrive: string;
  duration_min: number;
  class: "SL" | "3A" | "2A" | "1A";
  price_inr: number;
  availability: string;
  external_url: string;
}

export interface HotelOption {
  id: string;
  name: string;
  area: string;
  stars: 2 | 3 | 4 | 5;
  rating: number;
  price_per_night_inr: number;
  amenities: string[];
  refundable: boolean;
  external_url: string;
}

const AIRLINES = ["IndiGo", "Air India", "Vistara", "SpiceJet", "Akasa Air"];
const CLASSES: FlightOption["class"][] = ["Economy", "Premium Eco", "Business"];

function fmt(mins: number): string {
  const h = Math.floor(mins / 60), m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function searchFlights(dest_id: string, travelers = 1, origin = "DEL"): FlightOption[] {
  const dest = DESTINATIONS.find((d) => d.id === dest_id);
  if (!dest) return [];
  const base = dest.approx_flight_inr_from_del || 4500;
  const baseDuration = 90 + Math.round(Math.hypot(dest.lat - 28.6, dest.lng - 77.2) * 8);

  const opts: FlightOption[] = [];
  let id = 0;
  for (let i = 0; i < AIRLINES.length; i++) {
    const airline = AIRLINES[i];
    const stops = i === 1 || i === 4 ? 1 : 0;
    const classIdx = i % 3;
    const cls = CLASSES[classIdx];
    const mult = [0.85, 1.0, 1.25, 1.55, 2.4][i] * (stops ? 0.9 : 1);
    const departH = 6 + i * 3;
    const dur = baseDuration + (stops ? 70 : 0) + (classIdx === 2 ? -10 : 0);
    opts.push({
      id: `fl-${++id}`,
      airline,
      from: origin,
      to: dest.nearest_airport_iata,
      depart: fmt((departH % 24) * 60),
      arrive: fmt(((departH % 24) * 60 + dur) % 1440),
      stops,
      duration_min: dur,
      class: cls,
      price_inr: Math.round(base * mult) * travelers,
      baggage: cls === "Economy" ? "15 kg" : cls === "Premium Eco" ? "25 kg" : "40 kg",
      refundable: classIdx > 0,
      external_url: `https://www.cleartrip.com/flights/results?from=${origin}&to=${dest.nearest_airport_iata}&adults=${travelers}`,
    });
  }
  return opts.sort((a, b) => a.price_inr - b.price_inr);
}

export function searchTrains(dest_id: string, travelers = 1): TrainOption[] {
  const dest = DESTINATIONS.find((d) => d.id === dest_id);
  if (!dest || dest.approx_train_inr_from_del === 0) return [];
  const baseSL = dest.approx_train_inr_from_del;
  const baseDuration = 240 + Math.round(Math.hypot(dest.lat - 28.6, dest.lng - 77.2) * 35);
  const TRAINS = [
    { no: "12951", name: "Rajdhani Express", departH: 16 },
    { no: "22691", name: "Duronto Express", departH: 22 },
    { no: "12903", name: "Golden Temple Mail", departH: 7 },
    { no: "12009", name: "Shatabdi Express", departH: 6 },
  ];
  const CLS: { c: TrainOption["class"]; m: number }[] = [
    { c: "SL", m: 1 }, { c: "3A", m: 2.6 }, { c: "2A", m: 3.8 }, { c: "1A", m: 6.2 },
  ];
  const out: TrainOption[] = [];
  let id = 0;
  TRAINS.forEach((t, i) => {
    const cls = CLS[i % CLS.length];
    out.push({
      id: `tr-${++id}`,
      train_no: t.no,
      name: t.name,
      from: "NDLS",
      to: dest.nearest_railhead || dest.name.slice(0, 3).toUpperCase(),
      depart: fmt(t.departH * 60),
      arrive: fmt(((t.departH * 60 + baseDuration) % 1440)),
      duration_min: baseDuration,
      class: cls.c,
      price_inr: Math.round(baseSL * cls.m) * travelers,
      availability: ["AVL 24", "WL 12", "AVL 88", "RAC 3"][i],
      external_url: `https://www.irctc.co.in/nget/train-search`,
    });
  });
  return out.sort((a, b) => a.price_inr - b.price_inr);
}

export function searchHotels(dest_id: string, nights = 1): HotelOption[] {
  const dest = DESTINATIONS.find((d) => d.id === dest_id);
  if (!dest) return [];
  const base = Math.round(dest.cost_per_day_inr * 0.45);
  const styles: { name: string; stars: 2 | 3 | 4 | 5; rating: number; mult: number; amen: string[] }[] = [
    { name: "Backpacker Hostel", stars: 2, rating: 4.1, mult: 0.5, amen: ["Wi-Fi", "Common kitchen"] },
    { name: "Boutique Guesthouse", stars: 3, rating: 4.4, mult: 1.0, amen: ["Wi-Fi", "Breakfast", "AC"] },
    { name: "Heritage Hotel", stars: 4, rating: 4.6, mult: 1.8, amen: ["Wi-Fi", "Pool", "Restaurant", "Spa"] },
    { name: "Luxury Resort", stars: 5, rating: 4.8, mult: 3.4, amen: ["Wi-Fi", "Pool", "Spa", "Concierge", "All-day dining"] },
  ];
  return styles.map((s, i) => ({
    id: `ht-${i + 1}`,
    name: `${dest.name} ${s.name}`,
    area: `${dest.name} center`,
    stars: s.stars,
    rating: s.rating,
    price_per_night_inr: Math.max(450, Math.round(base * s.mult)),
    amenities: s.amen,
    refundable: i > 0,
    external_url: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(dest.name)}`,
  })).sort((a, b) => a.price_per_night_inr - b.price_per_night_inr);
}

export interface TravelerProfile {
  full_name: string;
  email: string;
  phone: string;
  gov_id: string;
  origin_city: string;
  meal_pref: "veg" | "non-veg" | "vegan";
  seat_pref: "window" | "aisle" | "no-pref";
}

export const DEFAULT_PROFILE: TravelerProfile = {
  full_name: "", email: "", phone: "", gov_id: "",
  origin_city: "Delhi", meal_pref: "veg", seat_pref: "window",
};

// ---------------- Buses (RedBus deep links) ----------------
export interface BusOption {
  id: string;
  operator: string;
  from: string;
  to: string;
  depart: string;
  arrive: string;
  duration_min: number;
  bus_type: "Seater" | "AC Sleeper" | "Volvo AC" | "Non-AC Sleeper";
  price_inr: number;
  rating: number;
  external_url: string;
}

const BUS_OPERATORS = [
  { name: "RedBus Partner Express", type: "Seater" as const, mult: 0.75, rating: 4.0, departH: 7 },
  { name: "VRL Travels", type: "Non-AC Sleeper" as const, mult: 0.95, rating: 4.2, departH: 20 },
  { name: "SRS Travels", type: "AC Sleeper" as const, mult: 1.25, rating: 4.3, departH: 21 },
  { name: "State Volvo Service", type: "Volvo AC" as const, mult: 1.5, rating: 4.4, departH: 22 },
];

function slugCity(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function searchBuses(dest_id: string, travelers = 1, originCity = "Delhi"): BusOption[] {
  const dest = DESTINATIONS.find((d) => d.id === dest_id);
  if (!dest || (dest.country && dest.country !== "India")) return [];
  const km = Math.hypot(dest.lat - 28.6, dest.lng - 77.2) * 111;
  if (km < 40 || km > 1600) return [];
  const baseFare = Math.max(250, Math.round((km * 1.6) / 10) * 10);
  const baseDuration = Math.round((km / 45) * 60);
  return BUS_OPERATORS.map((o, i) => ({
    id: `bus-${i + 1}`,
    operator: o.name,
    from: originCity,
    to: dest.name,
    depart: fmt(o.departH * 60),
    arrive: fmt((o.departH * 60 + baseDuration) % 1440),
    duration_min: baseDuration,
    bus_type: o.type,
    price_inr: Math.round(baseFare * o.mult) * travelers,
    rating: o.rating,
    external_url: `https://www.redbus.in/bus-tickets/${slugCity(originCity)}-to-${slugCity(dest.name)}`,
  })).sort((a, b) => a.price_inr - b.price_inr);
}
