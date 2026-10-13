import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bookmark, Edit3, Trash2, ArrowRight } from "lucide-react";
import { patchTrip, useTrip } from "@/lib/tripStore";

type SavedItinerary = {
  destination?: { name?: string };
  pois?: Array<{ name?: string }>;
  days?: unknown[];
  total_inr?: number;
};

type SavedTrip = {
  id: string;
  name: string;
  saved_at: number;
  itinerary: SavedItinerary;
};

/**
 * Dashboard section for saved trips, shown near the top of the home page.
 */
export function SavedTripsChip() {
  const [trip, setTrip] = useTrip();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const saved = trip.savedTrips || [];
  if (!saved.length) return null;

  function remove(id: string) {
    setTrip({ savedTrips: saved.filter((s) => s.id !== id) });
  }

  function rename(id: string, name: string) {
    setTrip({ savedTrips: saved.map((s) => (s.id === id ? { ...s, name } : s)) });
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-5 pt-6" aria-labelledby="saved-trips-heading">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <Bookmark className="h-4 w-4 text-primary" />
          <h2 id="saved-trips-heading" className="font-display text-lg font-semibold">
            Your saved trips
          </h2>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-muted-foreground">
            {saved.length}
          </span>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {saved.map((s) => {
            const isOpen = expanded === s.id;
            const it = (s.itinerary || {}) as SavedItinerary;
            return (
              <li key={s.id} className="min-w-0 rounded-xl border border-border bg-background p-3">
                <div className="flex items-center gap-1.5">
                  <input
                    aria-label="Saved trip name"
                    className="min-w-0 flex-1 truncate rounded bg-transparent px-1 py-1 text-sm font-semibold text-foreground focus:bg-secondary focus:outline-none"
                    value={s.name}
                    onChange={(e) => rename(s.id, e.target.value)}
                  />
                  <button
                    onClick={() => setExpanded(isOpen ? null : s.id)}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-secondary"
                    aria-label={isOpen ? "Hide trip details" : "Show trip details"}
                    aria-expanded={isOpen}
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => remove(s.id)}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-destructive"
                    aria-label="Delete saved trip"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {isOpen && (
                  <div className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">
                    {it.destination?.name && (
                      <div>
                        <b className="text-foreground">City:</b> {it.destination.name}
                      </div>
                    )}
                    {Array.isArray(it.pois) && it.pois.length > 0 && (
                      <div className="mt-1">
                        <b className="text-foreground">Stops ({it.pois.length}):</b>{" "}
                        {it.pois
                          .slice(0, 6)
                          .map((p) => p.name)
                          .join(" · ")}
                        {it.pois.length > 6 && ` …+${it.pois.length - 6}`}
                      </div>
                    )}
                    {Array.isArray(it.days) && (
                      <div className="mt-1">
                        <b className="text-foreground">Days:</b> {it.days.length} · Est ₹
                        {(it.total_inr || 0).toLocaleString("en-IN")}
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        to="/travel"
                        className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background hover:opacity-90"
                      >
                        Edit on map <ArrowRight className="h-3 w-3" />
                      </Link>
                      <Link
                        to="/book"
                        className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary"
                      >
                        Book transport
                      </Link>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/** Programmatic helper for other pages to save an itinerary into the chip. */
export function saveTripSnapshot(rec: { name: string; itinerary: SavedItinerary }) {
  const cur = ((): SavedTrip[] => {
    if (typeof window === "undefined") return [];
    try {
      const state = JSON.parse(sessionStorage.getItem("wc.trip.v1") || "{}") as {
        savedTrips?: SavedTrip[];
      };
      return state.savedTrips || [];
    } catch {
      return [];
    }
  })();
  const next = [{ id: `${Date.now()}`, saved_at: Date.now(), ...rec }, ...cur].slice(0, 12);
  patchTrip({ savedTrips: next });
}
