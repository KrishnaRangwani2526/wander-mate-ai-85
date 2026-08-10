import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bookmark, X, Edit3, Trash2, ArrowRight } from "lucide-react";
import { patchTrip, useTrip } from "@/lib/tripStore";

/**
 * Floating chip showing the count of saved trips + editable panel.
 * Global — mounted from __root.tsx. Sits above AiChat launcher.
 */
export function SavedTripsChip() {
  const [trip, setTrip] = useTrip();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const saved = trip.savedTrips || [];
  if (!saved.length && !open) return null;

  function remove(id: string) {
    setTrip({ savedTrips: saved.filter((s) => s.id !== id) });
  }

  function rename(id: string, name: string) {
    setTrip({ savedTrips: saved.map((s) => (s.id === id ? { ...s, name } : s)) });
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Saved trips"
        className="fixed bottom-24 right-4 z-40 inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-2 text-xs font-bold text-white shadow-card transition hover:opacity-95"
      >
        <Bookmark className="h-4 w-4" />
        <span>{saved.length}</span>
      </button>

      {open && (
        <div className="fixed bottom-40 right-4 z-40 w-[92vw] max-w-sm overflow-hidden rounded-2xl border border-border bg-background shadow-card">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <div className="flex items-center gap-1.5 font-display text-sm font-bold text-foreground">
              <Bookmark className="h-4 w-4 text-brand" /> Saved trips ({saved.length})
            </div>
            <button onClick={() => setOpen(false)} className="rounded-full p-1 text-muted-foreground hover:bg-secondary">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {saved.length === 0 ? (
              <p className="p-4 text-center text-xs text-muted-foreground">
                No saved trips yet. Save a route from the Travel tab or an itinerary from Optimize.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {saved.map((s) => {
                  const isOpen = expanded === s.id;
                  const it: any = s.itinerary || {};
                  return (
                    <li key={s.id} className="rounded-lg border border-border bg-card">
                      <div className="flex items-center gap-1.5 px-2 py-1.5">
                        <input
                          className="min-w-0 flex-1 truncate rounded bg-transparent px-1 text-xs font-semibold text-foreground focus:bg-secondary focus:outline-none"
                          value={s.name}
                          onChange={(e) => rename(s.id, e.target.value)}
                        />
                        <button
                          onClick={() => setExpanded(isOpen ? null : s.id)}
                          className="rounded p-1 text-muted-foreground hover:bg-secondary"
                          aria-label="Toggle details"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => remove(s.id)}
                          className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-destructive"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {isOpen && (
                        <div className="border-t border-border bg-background px-2 py-2 text-[11px] text-muted-foreground">
                          {it.destination?.name && (
                            <div><b className="text-foreground">City:</b> {it.destination.name}</div>
                          )}
                          {Array.isArray(it.pois) && it.pois.length > 0 && (
                            <div className="mt-1">
                              <b className="text-foreground">Stops ({it.pois.length}):</b>{" "}
                              {it.pois.slice(0, 6).map((p: any) => p.name).join(" · ")}
                              {it.pois.length > 6 && ` …+${it.pois.length - 6}`}
                            </div>
                          )}
                          {Array.isArray(it.days) && (
                            <div className="mt-1">
                              <b className="text-foreground">Days:</b> {it.days.length} · Est ₹
                              {(it.total_inr || 0).toLocaleString("en-IN")}
                            </div>
                          )}
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <Link
                              to="/travel"
                              onClick={() => setOpen(false)}
                              className="inline-flex items-center gap-1 rounded-full bg-foreground px-2.5 py-1 text-[10px] font-bold text-background hover:opacity-90"
                            >
                              Edit on map <ArrowRight className="h-3 w-3" />
                            </Link>
                            <Link
                              to="/book"
                              onClick={() => setOpen(false)}
                              className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-bold text-foreground hover:bg-secondary"
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
            )}
          </div>
        </div>
      )}
    </>
  );
}

/** Programmatic helper for other pages to save an itinerary into the chip. */
export function saveTripSnapshot(rec: { name: string; itinerary: any }) {
  const cur = ((): any[] => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(sessionStorage.getItem("wc.trip.v1") || "{}").savedTrips || []; } catch { return []; }
  })();
  const next = [{ id: `${Date.now()}`, saved_at: Date.now(), ...rec }, ...cur].slice(0, 12);
  patchTrip({ savedTrips: next });
}
