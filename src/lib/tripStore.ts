/**
 * Cross-section trip state, persisted to sessionStorage.
 * Pages read/write so Dream → Plan → Optimize → Book → Travel keeps context.
 */
import { useEffect, useState } from "react";

const KEY = "wc.trip.v1";

export interface TripState {
  dreamFilters?: any;
  dreamResults?: any[];
  selectedDestination?: { id?: string; name?: string; state?: string };
  planQuery?: any;
  planOptions?: any;
  chosenItinerary?: any;
  optimizedItinerary?: any;
  bookingLegs?: Array<{ origin: string; destination: string; date?: string }>;
  savedTrips?: Array<{ id: string; name: string; saved_at: number; itinerary: any }>;
}

function read(): TripState {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

function write(s: TripState) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(s));
    window.dispatchEvent(new CustomEvent("wc:trip:update"));
  } catch {
    /* ignore */
  }
}

export function getTrip(): TripState {
  return read();
}

export function patchTrip(patch: Partial<TripState>) {
  const cur = read();
  write({ ...cur, ...patch });
}

export function useTrip(): [TripState, (p: Partial<TripState>) => void] {
  const [state, setState] = useState<TripState>(() => read());
  useEffect(() => {
    const handler = () => setState(read());
    window.addEventListener("wc:trip:update", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("wc:trip:update", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  return [state, patchTrip];
}

/** Best-effort fallback hero image keyed by destination slug. */
export function fallbackHero(name: string): string {
  const q = encodeURIComponent(name.replace(/[^\w\s]/g, " ").trim().split(/\s+/).join(","));
  return `https://loremflickr.com/800/500/${q},travel?lock=${name.length}`;
}
