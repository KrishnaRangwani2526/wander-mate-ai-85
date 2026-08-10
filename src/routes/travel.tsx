import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { Navigation, MapPin, Utensils, Camera, Hotel, Loader2, Building2, Bus, Save, Trash2 } from "lucide-react";
import { DESTINATIONS, type Destination } from "@/data/destinations";
import { optimizeRoute } from "@/lib/engines/route";
import { PageHero } from "@/components/PageHero";
import { api } from "@/lib/api";
import { patchTrip, useTrip } from "@/lib/tripStore";
import type { Poi } from "@/components/LeafletMap";

const LeafletMap = lazy(() => import("@/components/LeafletMap"));

interface Search { ids?: string }

export const Route = createFileRoute("/travel")({
  head: () => ({
    meta: [
      { title: "Travel — Live city map & POIs | WanderCompanion" },
      { name: "description", content: "City-focused map with viewpoints, food, hotels and transit. Pick stops, get the shortest route drawn live." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): Search => ({ ids: typeof s.ids === "string" ? s.ids : undefined }),
  component: TravelPage,
});

const CATEGORY_META = [
  { key: "tourist", label: "Tourist", color: "#7c3aed", Icon: Camera },
  { key: "viewpoint", label: "Viewpoints", color: "#0284c7", Icon: MapPin },
  { key: "food", label: "Food", color: "#dc2626", Icon: Utensils },
  { key: "stay", label: "Stay", color: "#059669", Icon: Hotel },
  { key: "transport", label: "Transport", color: "#374151", Icon: Bus },
] as const;

function TravelPage() {
  const { ids } = Route.useSearch();
  const [trip] = useTrip();
  const initial = useMemo(() => {
    if (ids) return ids.split(",").filter(Boolean);
    if (trip.bookingLegs?.length) return [];
    return ["jaipur", "jodhpur", "udaipur"];
  }, [ids, trip.bookingLegs]);

  const [selected, setSelected] = useState<string[]>(initial);
  const [startId, setStartId] = useState<string>(() => initial[0] || "");
  const [endId, setEndId] = useState<string>(() => initial[initial.length - 1] || "");
  useEffect(() => {
    if (startId && !selected.includes(startId)) setStartId(selected[0] || "");
    if (endId && !selected.includes(endId)) setEndId(selected[selected.length - 1] || "");
    if (!startId && selected[0]) setStartId(selected[0]);
    if (!endId && selected.length > 1) setEndId(selected[selected.length - 1]);
  }, [selected]); // eslint-disable-line
  const dests = selected.map((id) => DESTINATIONS.find((d) => d.id === id)).filter(Boolean) as Destination[];
  const route = useMemo(
    () => optimizeRoute({ stops: dests.map((d) => ({ id: d.id, lat: d.lat, lng: d.lng })), start_id: startId, end_id: endId || undefined }),
    [dests, startId, endId],
  );
  const ordered = route.order.map((id) => dests.find((d) => d.id === id)!).filter(Boolean);

  const [active, setActive] = useState(0);
  const focus = ordered[active] ?? ordered[0];
  const cityFocus = ordered.length <= 1;

  // POI state
  const [enabled, setEnabled] = useState<Record<string, boolean>>({ tourist: true, viewpoint: true, food: true, stay: false, transport: false });
  const [pois, setPois] = useState<Poi[]>([]);
  const [loadingPois, setLoadingPois] = useState(false);
  const [selectedPoiIds, setSelectedPoiIds] = useState<string[]>([]);

  const activeCats = Object.entries(enabled).filter(([, v]) => v).map(([k]) => k);

  useEffect(() => {
    if (!focus || !cityFocus) { setPois([]); return; }
    let cancel = false;
    setLoadingPois(true);
    api.places({ lat: focus.lat, lng: focus.lng, radius: 5000, categories: activeCats })
      .then((r) => { if (!cancel) setPois((r.items || []).slice(0, 120)); })
      .catch(() => { if (!cancel) setPois([]); })
      .finally(() => { if (!cancel) setLoadingPois(false); });
    return () => { cancel = true; };
  }, [focus?.id, cityFocus, JSON.stringify(activeCats)]); // eslint-disable-line

  const filteredPois = useMemo(() => pois.filter((p) => enabled[p.category]), [pois, enabled]);
  const selectedPois = useMemo(() => selectedPoiIds.map((id) => pois.find((p) => p.id === id)).filter(Boolean) as Poi[], [selectedPoiIds, pois]);

  // shortest path across selected POIs — nearest-neighbor from first selection
  const poiRouteOrder = useMemo(() => {
    if (selectedPois.length < 2) return selectedPoiIds;
    const remaining = [...selectedPois];
    const order: string[] = [];
    let cur = remaining.shift()!;
    order.push(cur.id);
    while (remaining.length) {
      let bestIdx = 0, bestD = Infinity;
      remaining.forEach((p, i) => {
        const d = (p.lat - cur.lat) ** 2 + (p.lng - cur.lng) ** 2;
        if (d < bestD) { bestD = d; bestIdx = i; }
      });
      cur = remaining.splice(bestIdx, 1)[0];
      order.push(cur.id);
    }
    return order;
  }, [selectedPois, selectedPoiIds]);

  function togglePoi(id: string) {
    setSelectedPoiIds((arr) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]));
  }

  function saveCurrentTrip() {
    if (!focus) return;
    const saved = trip.savedTrips || [];
    const record = {
      id: `${Date.now()}`,
      name: `${focus.name} · ${selectedPois.length} stops`,
      saved_at: Date.now(),
      itinerary: { destination: focus, pois: selectedPois, route_order: poiRouteOrder },
    };
    patchTrip({ savedTrips: [record, ...saved].slice(0, 10) });
  }

  return (
    <div>
      <PageHero
        eyebrow="Step 07 · Travel"
        icon={<Navigation className="h-3.5 w-3.5" />}
        title={<>Your <span className="text-brand-gradient">on-the-road</span> copilot.</>}
        description="Pick a city → toggle categories → tap POIs to build the shortest route. Data live from OpenStreetMap."
      />

      <section className="mx-auto max-w-7xl px-4 py-8">
        {selected.length >= 2 && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-2 text-xs">
            <span className="ml-1 font-semibold text-muted-foreground">Pin route:</span>
            <label className="flex items-center gap-1">
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">Start</span>
              <select value={startId} onChange={(e) => setStartId(e.target.value)} className="rounded-md border border-input bg-background px-2 py-1 text-xs">
                {selected.map((id) => { const d = DESTINATIONS.find((x) => x.id === id); return d ? <option key={id} value={id}>{d.name}</option> : null; })}
              </select>
            </label>
            <label className="flex items-center gap-1">
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-800">End</span>
              <select value={endId} onChange={(e) => setEndId(e.target.value)} className="rounded-md border border-input bg-background px-2 py-1 text-xs">
                <option value="">Auto</option>
                {selected.filter((id) => id !== startId).map((id) => { const d = DESTINATIONS.find((x) => x.id === id); return d ? <option key={id} value={id}>{d.name}</option> : null; })}
              </select>
            </label>
            <span className="ml-auto mr-1 text-muted-foreground">Route: <b className="text-foreground">{route.total_km} km</b></span>
          </div>
        )}
        <div className="mb-4 flex flex-wrap gap-2">
          {DESTINATIONS.map((d) => {
            const on = selected.includes(d.id);
            return (
              <button key={d.id}
                onClick={() => { setSelected((arr) => (on ? arr.filter((x) => x !== d.id) : [...arr, d.id])); setSelectedPoiIds([]); }}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${on ? "border-foreground bg-foreground text-background" : "border-border bg-background text-foreground hover:border-foreground/40"}`}>
                {d.name}
              </button>
            );
          })}
        </div>

        {ordered.length === 0 ? (
          <Empty />
        ) : (
          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
              <div className="relative">
                <Suspense fallback={<div className="grid h-[480px] place-items-center bg-secondary text-sm text-muted-foreground">Loading map…</div>}>
                  <LeafletMap
                    stops={ordered}
                    active={active}
                    onPick={setActive}
                    pois={filteredPois}
                    selectedPoiIds={selectedPoiIds}
                    onTogglePoi={togglePoi}
                    poiRouteOrder={poiRouteOrder}
                    cityFocus={cityFocus}
                  />
                </Suspense>
                <div className="pointer-events-none absolute bottom-3 left-3 z-[400] rounded-full border border-border bg-background/95 px-3 py-1 text-xs font-bold text-foreground shadow-soft">
                  {cityFocus ? `${focus?.name} · ${filteredPois.length} POIs` : `${ordered.length} stops · ${route.total_km} km`}
                </div>
                {loadingPois && (
                  <div className="pointer-events-none absolute top-3 right-3 z-[400] flex items-center gap-1.5 rounded-full bg-background/95 px-3 py-1 text-xs font-semibold text-foreground shadow-soft">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading POIs
                  </div>
                )}
              </div>

              <div className="border-t border-border p-4">
                <div className="mb-3 flex flex-wrap items-center gap-1.5">
                  {CATEGORY_META.map(({ key, label, color, Icon }) => {
                    const on = enabled[key];
                    return (
                      <button key={key}
                        onClick={() => setEnabled((s) => ({ ...s, [key]: !s[key] }))}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition ${on ? "border-foreground bg-foreground text-background" : "border-border bg-background text-foreground"}`}>
                        <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
                        <Icon className="h-3 w-3" /> {label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {ordered.map((d, i) => (
                    <button key={d.id} onClick={() => { setActive(i); setSelectedPoiIds([]); }}
                      className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition ${i === active ? "border-foreground bg-foreground text-background" : "border-border bg-background text-foreground"}`}>
                      <span className="font-bold">{i + 1}.</span> {d.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <aside className="space-y-3">
              {focus && (
                <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
                  <div className="relative h-40 overflow-hidden">
                    <img src={focus.hero_image} alt={focus.name} className="h-full w-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-white">
                      <div className="text-[11px] opacity-80"><MapPin className="-mt-0.5 mr-1 inline h-3 w-3" />{focus.state}</div>
                      <h3 className="font-display text-xl font-bold">{focus.name}</h3>
                    </div>
                  </div>
                  <div className="p-4 text-xs text-muted-foreground">
                    Nearest airport <b className="text-foreground">{focus.nearest_airport_iata}</b> · Railhead <b className="text-foreground">{focus.nearest_railhead}</b>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
                <div className="mb-2 flex items-center justify-between">
                  <div className="font-display font-bold text-foreground">Your picks ({selectedPois.length})</div>
                  <div className="flex gap-1">
                    <button onClick={saveCurrentTrip} disabled={!selectedPois.length} className="inline-flex items-center gap-1 rounded-full bg-foreground px-2.5 py-1 text-[11px] font-semibold text-background disabled:opacity-40"><Save className="h-3 w-3" /> Save</button>
                    <button onClick={() => setSelectedPoiIds([])} disabled={!selectedPois.length} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold text-foreground disabled:opacity-40"><Trash2 className="h-3 w-3" /> Clear</button>
                  </div>
                </div>
                {selectedPois.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Tap POIs on the map or list to build a shortest-path route across your favorite stops.</p>
                ) : (
                  <ol className="space-y-1.5">
                    {poiRouteOrder.map((id, i) => {
                      const p = pois.find((x) => x.id === id);
                      if (!p) return null;
                      return (
                        <li key={id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-2 py-1.5 text-xs">
                          <span><b className="text-foreground">{i + 1}.</b> {p.name} <span className="text-muted-foreground">· {p.category}</span></span>
                          <button onClick={() => togglePoi(id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>

              <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
                <div className="mb-2 flex items-center gap-2 font-display font-bold text-foreground"><Building2 className="h-4 w-4 text-brand" /> Nearby ({filteredPois.length})</div>
                <div className="max-h-72 space-y-1 overflow-y-auto">
                  {filteredPois.slice(0, 60).map((p) => {
                    const on = selectedPoiIds.includes(p.id);
                    const color = CATEGORY_META.find((c) => c.key === p.category)?.color || "#666";
                    return (
                      <button key={p.id} onClick={() => togglePoi(p.id)}
                        className={`flex w-full items-center justify-between gap-2 rounded-lg border px-2 py-1.5 text-left text-xs transition ${on ? "border-foreground bg-brand-soft" : "border-border bg-background hover:border-foreground/40"}`}>
                        <span className="flex items-center gap-2 truncate">
                          <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
                          <span className="truncate text-foreground">{p.name}</span>
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{p.category}</span>
                      </button>
                    );
                  })}
                  {filteredPois.length === 0 && !loadingPois && (
                    <p className="text-xs text-muted-foreground">No POIs in the enabled categories yet. Toggle more categories above.</p>
                  )}
                </div>
              </div>

              {trip.savedTrips && trip.savedTrips.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
                  <div className="mb-2 font-display text-sm font-bold text-foreground">Saved routes</div>
                  <ul className="space-y-1 text-xs">
                    {trip.savedTrips.map((s) => (
                      <li key={s.id} className="rounded border border-border bg-background px-2 py-1 text-foreground/80">
                        {s.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </aside>
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12">
        <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-5 text-sm text-muted-foreground">
          <b className="text-foreground">Map data:</b> live OpenStreetMap POIs via Overpass API. Colored dots = category. Select stops to draw the shortest route.
          <Link to="/book" className="ml-2 text-brand underline-offset-4 hover:underline">Book transport →</Link>
        </div>
      </section>
    </div>
  );
}

function Empty() {
  return <div className="rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center text-sm text-muted-foreground">Pick a destination above to draw your map.</div>;
}
