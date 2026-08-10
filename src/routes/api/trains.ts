import { createFileRoute } from "@tanstack/react-router";

/**
 * Honest India train lookup.
 * Real-time IRCTC seat availability requires a paid provider (RapidAPI IRCTC).
 * This endpoint returns typical daily trains on a given route from a curated
 * schedule snapshot plus a `live_seat_data: false` flag and a link to IRCTC
 * for the user to complete the booking.
 */

interface StaticTrain {
  no: string;
  name: string;
  from_code: string;
  to_code: string;
  depart: string; // HH:MM
  arrive: string; // HH:MM
  duration_min: number;
  classes: Array<"SL" | "3A" | "2A" | "1A" | "CC" | "EC">;
  base_price_inr: Partial<Record<"SL" | "3A" | "2A" | "1A" | "CC" | "EC", number>>;
}

// Curated snapshot — daily-running services on popular corridors.
// Not exhaustive; use as a hint until user opts into a paid IRCTC provider.
const TRAINS: StaticTrain[] = [
  { no: "12951", name: "Mumbai Rajdhani", from_code: "NDLS", to_code: "BCT", depart: "16:25", arrive: "08:15", duration_min: 950, classes: ["3A","2A","1A"], base_price_inr: { "3A": 2495, "2A": 3610, "1A": 6115 } },
  { no: "12002", name: "New Delhi Shatabdi", from_code: "NDLS", to_code: "BPL", depart: "06:00", arrive: "14:05", duration_min: 485, classes: ["CC","EC"], base_price_inr: { CC: 1435, EC: 2765 } },
  { no: "12009", name: "Mumbai Shatabdi", from_code: "BCT", to_code: "ADI", depart: "06:25", arrive: "13:20", duration_min: 415, classes: ["CC","EC"], base_price_inr: { CC: 1250, EC: 2450 } },
  { no: "12621", name: "Tamil Nadu Express", from_code: "NDLS", to_code: "MAS", depart: "22:30", arrive: "07:10", duration_min: 2020, classes: ["SL","3A","2A","1A"], base_price_inr: { SL: 795, "3A": 2135, "2A": 3130, "1A": 5320 } },
  { no: "12245", name: "Yesvantpur Duronto", from_code: "HWH", to_code: "YPR", depart: "23:55", arrive: "08:50", duration_min: 1975, classes: ["3A","2A","1A"], base_price_inr: { "3A": 2295, "2A": 3355, "1A": 5680 } },
  { no: "22691", name: "Rajdhani Bengaluru", from_code: "NDLS", to_code: "SBC", depart: "20:45", arrive: "05:55", duration_min: 2050, classes: ["3A","2A","1A"], base_price_inr: { "3A": 2765, "2A": 4085, "1A": 6935 } },
  { no: "12432", name: "Trivandrum Rajdhani", from_code: "NZM", to_code: "TVC", depart: "10:55", arrive: "12:00", duration_min: 2825, classes: ["3A","2A","1A"], base_price_inr: { "3A": 3225, "2A": 4670, "1A": 7935 } },
  { no: "12626", name: "Kerala Express", from_code: "NDLS", to_code: "TVC", depart: "11:40", arrive: "05:15", duration_min: 2735, classes: ["SL","3A","2A","1A"], base_price_inr: { SL: 950, "3A": 2530, "2A": 3720, "1A": 6320 } },
  { no: "12903", name: "Golden Temple Mail", from_code: "BCT", to_code: "ASR", depart: "21:25", arrive: "10:30", duration_min: 2225, classes: ["SL","3A","2A","1A"], base_price_inr: { SL: 830, "3A": 2220, "2A": 3245, "1A": 5500 } },
  { no: "12029", name: "New Delhi Shatabdi Amritsar", from_code: "NDLS", to_code: "ASR", depart: "07:20", arrive: "13:25", duration_min: 365, classes: ["CC","EC"], base_price_inr: { CC: 985, EC: 1875 } },
  { no: "12045", name: "Chandigarh Shatabdi", from_code: "NDLS", to_code: "CDG", depart: "07:40", arrive: "11:00", duration_min: 200, classes: ["CC","EC"], base_price_inr: { CC: 705, EC: 1420 } },
  { no: "12957", name: "Swarna Jayanti Rajdhani", from_code: "NDLS", to_code: "ADI", depart: "19:55", arrive: "10:20", duration_min: 865, classes: ["3A","2A","1A"], base_price_inr: { "3A": 2415, "2A": 3510, "1A": 5945 } },
  { no: "12013", name: "New Delhi Shatabdi Amritsar (Alt)", from_code: "NDLS", to_code: "LDH", depart: "16:30", arrive: "20:33", duration_min: 245, classes: ["CC","EC"], base_price_inr: { CC: 815, EC: 1585 } },
  { no: "22439", name: "Vande Bharat Katra", from_code: "NDLS", to_code: "SVDK", depart: "06:00", arrive: "14:00", duration_min: 480, classes: ["CC","EC"], base_price_inr: { CC: 1545, EC: 2415 } },
  { no: "22691_ex", name: "Sampark Kranti", from_code: "NDLS", to_code: "SBC", depart: "21:15", arrive: "08:40", duration_min: 2245, classes: ["SL","3A","2A"], base_price_inr: { SL: 895, "3A": 2380, "2A": 3495 } },
  { no: "12864", name: "YPR Howrah SF", from_code: "YPR", to_code: "HWH", depart: "20:10", arrive: "23:55", duration_min: 1665, classes: ["SL","3A","2A","1A"], base_price_inr: { SL: 745, "3A": 1995, "2A": 2925, "1A": 4970 } },
  { no: "12471", name: "Swaraj Express", from_code: "BDTS", to_code: "SVDK", depart: "11:05", arrive: "18:35", duration_min: 1830, classes: ["SL","3A","2A","1A"], base_price_inr: { SL: 785, "3A": 2100, "2A": 3080, "1A": 5220 } },
  { no: "12139", name: "Sewagram Express", from_code: "CSMT", to_code: "NGP", depart: "20:35", arrive: "09:00", duration_min: 745, classes: ["SL","3A","2A","1A"], base_price_inr: { SL: 555, "3A": 1490, "2A": 2185, "1A": 3720 } },
  { no: "12615", name: "Grand Trunk Express", from_code: "NDLS", to_code: "MAS", depart: "18:40", arrive: "05:25", duration_min: 2085, classes: ["SL","3A","2A","1A"], base_price_inr: { SL: 810, "3A": 2170, "2A": 3180, "1A": 5405 } },
];

const CITY_TO_STATIONS: Record<string, string[]> = {
  delhi: ["NDLS", "NZM", "DLI", "ANVT"],
  mumbai: ["BCT", "CSMT", "LTT", "BDTS"],
  bangalore: ["SBC", "YPR", "KJM"],
  bengaluru: ["SBC", "YPR", "KJM"],
  chennai: ["MAS", "MSB"],
  kolkata: ["HWH", "SDAH", "KOAA"],
  hyderabad: ["SC", "HYB", "KCG"],
  ahmedabad: ["ADI"],
  jaipur: ["JP"],
  chandigarh: ["CDG"],
  amritsar: ["ASR"],
  bhopal: ["BPL"],
  nagpur: ["NGP"],
  ludhiana: ["LDH"],
  katra: ["SVDK"],
  trivandrum: ["TVC"],
  thiruvananthapuram: ["TVC"],
};

function stationsFor(city: string): string[] {
  const key = city.trim().toLowerCase();
  if (CITY_TO_STATIONS[key]) return CITY_TO_STATIONS[key];
  if (/^[A-Z]{2,5}$/.test(city)) return [city.toUpperCase()];
  return [];
}

export const Route = createFileRoute("/api/trains")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json().catch(() => ({}));
        const originList = stationsFor(body.origin || "");
        const destList = stationsFor(body.destination || "");
        const travelers = Math.max(1, Math.min(9, Number(body.travelers) || 1));

        const trains = TRAINS.filter((t) => originList.includes(t.from_code) && destList.includes(t.to_code));
        const results = trains.map((t) => {
          const cls = t.classes[0];
          const perSeat = t.base_price_inr[cls] || 0;
          const total = perSeat * travelers;
          return {
            train_no: t.no,
            name: t.name,
            from: t.from_code,
            to: t.to_code,
            depart: t.depart,
            arrive: t.arrive,
            duration_min: t.duration_min,
            classes: t.classes.map((c) => ({ code: c, price_inr: (t.base_price_inr[c] || 0) * travelers })),
            best_class: cls,
            price_inr: total,
            book_url: `https://www.irctc.co.in/nget/train-search`,
          };
        }).sort((a, b) => a.price_inr - b.price_inr);

        return Response.json({
          results,
          live_seat_data: false,
          note: results.length
            ? "Fares are typical starting fares per class. Live seat availability requires an IRCTC paid provider — click Book on IRCTC to check and reserve."
            : "No curated daily service found for this pair. Search IRCTC directly, or try common corridor pairs.",
          origin: body.origin,
          destination: body.destination,
        });
      },
    },
  },
});
