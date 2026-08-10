// Route optimizer — nearest-neighbor seed + 2-opt refinement.
// Pure TS, takes lat/lng stops and returns a visit order minimising total
// great-circle distance. Caller supplies stops; we don't geocode here.

export interface Stop {
  id: string;
  name?: string;
  lat: number;
  lng: number;
}

export interface RoutePlan {
  order: string[]; // stop ids in visit order
  total_km: number;
  legs: { from: string; to: string; km: number }[];
}

function toRad(d: number) { return (d * Math.PI) / 180; }

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function tourLength(order: number[], stops: Stop[], closed: boolean): number {
  let total = 0;
  for (let i = 0; i < order.length - 1; i++) total += haversineKm(stops[order[i]], stops[order[i + 1]]);
  if (closed && order.length > 1) total += haversineKm(stops[order[order.length - 1]], stops[order[0]]);
  return total;
}

function nearestNeighbor(stops: Stop[], startIdx: number): number[] {
  const n = stops.length;
  const visited = new Array<boolean>(n).fill(false);
  const order: number[] = [startIdx];
  visited[startIdx] = true;
  for (let step = 1; step < n; step++) {
    const last = order[order.length - 1];
    let bestI = -1;
    let bestD = Infinity;
    for (let i = 0; i < n; i++) {
      if (visited[i]) continue;
      const d = haversineKm(stops[last], stops[i]);
      if (d < bestD) { bestD = d; bestI = i; }
    }
    order.push(bestI);
    visited[bestI] = true;
  }
  return order;
}

function twoOpt(order: number[], stops: Stop[], closed: boolean): number[] {
  let improved = true;
  let best = order.slice();
  let bestLen = tourLength(best, stops, closed);
  const n = best.length;
  let guard = 0;
  while (improved && guard++ < 50) {
    improved = false;
    for (let i = 1; i < n - 2; i++) {
      for (let k = i + 1; k < n - (closed ? 0 : 1); k++) {
        const next = best.slice(0, i).concat(best.slice(i, k + 1).reverse(), best.slice(k + 1));
        const len = tourLength(next, stops, closed);
        if (len + 1e-9 < bestLen) {
          best = next;
          bestLen = len;
          improved = true;
        }
      }
    }
  }
  return best;
}

export interface OptimizeRouteInput {
  stops: Stop[];
  start_id?: string;
  end_id?: string; // pin last stop
  closed?: boolean; // return to start
}

export function optimizeRoute(input: OptimizeRouteInput): RoutePlan {
  const stops = input.stops.filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng));
  if (stops.length === 0) return { order: [], total_km: 0, legs: [] };
  if (stops.length === 1) return { order: [stops[0].id], total_km: 0, legs: [] };

  const startIdx = Math.max(0, stops.findIndex((s) => s.id === input.start_id));
  const endIdx = input.end_id ? stops.findIndex((s) => s.id === input.end_id) : -1;

  // Nearest-neighbor seed from start, then 2-opt.
  const seed = nearestNeighbor(stops, startIdx === -1 ? 0 : startIdx);
  let optimal = twoOpt(seed, stops, input.closed ?? false);

  // If end is pinned, move it to the last position and re-run 2-opt on the middle.
  if (endIdx >= 0 && endIdx !== startIdx) {
    optimal = optimal.filter((i) => i !== endIdx);
    optimal.push(endIdx);
    // 2-opt on the interior (keep first and last fixed)
    let improved = true;
    let guard = 0;
    while (improved && guard++ < 30) {
      improved = false;
      for (let i = 1; i < optimal.length - 2; i++) {
        for (let k = i + 1; k < optimal.length - 1; k++) {
          const next = optimal.slice(0, i).concat(optimal.slice(i, k + 1).reverse(), optimal.slice(k + 1));
          if (tourLength(next, stops, false) + 1e-9 < tourLength(optimal, stops, false)) {
            optimal = next;
            improved = true;
          }
        }
      }
    }
  }

  const legs: RoutePlan["legs"] = [];
  let total = 0;
  for (let i = 0; i < optimal.length - 1; i++) {
    const a = stops[optimal[i]];
    const b = stops[optimal[i + 1]];
    const km = Math.round(haversineKm(a, b) * 10) / 10;
    legs.push({ from: a.id, to: b.id, km });
    total += km;
  }
  if (input.closed && optimal.length > 1) {
    const a = stops[optimal[optimal.length - 1]];
    const b = stops[optimal[0]];
    const km = Math.round(haversineKm(a, b) * 10) / 10;
    legs.push({ from: a.id, to: b.id, km });
    total += km;
  }

  return {
    order: optimal.map((i) => stops[i].id),
    total_km: Math.round(total * 10) / 10,
    legs,
  };
}

