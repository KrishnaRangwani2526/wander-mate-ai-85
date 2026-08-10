import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Sliders, ArrowRight, MessageSquare, Plus, Trash2, Wallet, Loader2, Search,
  GripVertical, Route as RouteIcon, Clock, UtensilsCrossed, MapPin,
} from "lucide-react";
import { DESTINATIONS } from "@/data/destinations";
import { PageHero } from "@/components/PageHero";
import { useTrip, patchTrip } from "@/lib/tripStore";
import { api } from "@/lib/api";
import { haversineKm } from "@/lib/engines/route";

interface Search { ids?: string; days?: number; budget?: number }

export const Route = createFileRoute("/optimize")({
  head: () => ({ meta: [
    { title: "Optimize — Drag-and-drop itinerary builder | WanderCompanion" },
    { name: "description", content: "Drag real places into each day, auto-order them by distance, set times and meals, and watch the budget live." },
    { property: "og:title", content: "Optimize — Drag-and-drop itinerary builder" },
    { property: "og:description", content: "Real places, distance-ordered days, live budget." },
  ] }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    ids: typeof s.ids === "string" ? s.ids : undefined,
    days: s.days ? Number(s.days) : undefined,
    budget: s.budget ? Number(s.budget) : undefined,
  }),
  component: OptimizePage,
});

const inp = "w-full rounded-lg border border-input bg-background px-2 py-1.5 text-xs text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

type Row = {
  id: string;
  day: number;
  time: string;          // HH:MM clock time
  place: string;
  note: string;
  cost: number;
  kind: "place" | "meal" | "travel";
  mins: number;          // time spent here
  lat?: number;
  lng?: number;
};

type PoolItem = { id: string; name: string; category: string; lat?: number; lng?: number };

const DEFAULT_MINS: Record<Row["kind"], number> = { place: 90, meal: 60, travel: 45 };
const CAT_COST: Record<string, number> = { tourist: 300, viewpoint: 0, food: 450, stay: 0, transport: 0 };

function minutesToClock(m: number): string {
  const mm = ((m % 1440) + 1440) % 1440;
  return `${String(Math.floor(mm / 60)).padStart(2, "0")}:${String(mm % 60).padStart(2, "0")}`;
}
function clockToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (Number.isFinite(h) ? h : 9) * 60 + (Number.isFinite(m) ? m : 0);
}

function buildRowsFromItinerary(it: any, destName: string, days: number): Row[] {
  const base = ["09:00", "13:30", "18:30"];
  if (it?.days && Array.isArray(it.days)) {
    return it.days.flatMap((d: any, i: number) => {
      const per = Math.round((it.cost_inr || 0) / (it.days.length * 3));
      return [
        { id: `${i}-am`, day: d.day || i + 1, time: base[0], place: d.morning || `${destName} morning`, note: "", cost: per, kind: "place" as const, mins: 150 },
        { id: `${i}-lunch`, day: d.day || i + 1, time: "13:00", place: `Lunch — ${d.food_pick || "local favourite"}`, note: "meal", cost: 400, kind: "meal" as const, mins: 60 },
        { id: `${i}-pm`, day: d.day || i + 1, time: base[1], place: d.afternoon || `${destName} afternoon`, note: "", cost: per, kind: "place" as const, mins: 150 },
        { id: `${i}-eve`, day: d.day || i + 1, time: base[2], place: d.evening || `${destName} evening`, note: "", cost: per, kind: "place" as const, mins: 120 },
      ];
    });
  }
  return Array.from({ length: days }).flatMap((_, i) => {
    const day = i + 1;
    return [
      { id: `d${day}-am`, day, time: "09:00", place: `${destName} — morning sightseeing`, note: "", cost: 800, kind: "place" as const, mins: 150 },
      { id: `d${day}-lunch`, day, time: "13:00", place: "Lunch break", note: "meal", cost: 400, kind: "meal" as const, mins: 60 },
      { id: `d${day}-pm`, day, time: "14:30", place: `${destName} — afternoon`, note: "", cost: 700, kind: "place" as const, mins: 150 },
    ];
  });
}

function normalise(rows: any[]): Row[] {
  return (rows || []).map((r, i) => ({
    id: r.id ?? `r${i}`,
    day: Number(r.day) || 1,
    time: /^\d{1,2}:\d{2}$/.test(r.time) ? r.time : r.time === "PM" ? "14:30" : r.time === "Eve" ? "18:30" : "09:00",
    place: r.place ?? "",
    note: r.note ?? "",
    cost: Number(r.cost) || 0,
    kind: (r.kind as Row["kind"]) ?? "place",
    mins: Number(r.mins) || DEFAULT_MINS[(r.kind as Row["kind"]) ?? "place"],
    lat: r.lat, lng: r.lng,
  }));
}

function OptimizePage() {
  const { ids, days: dDays, budget: dBudget } = Route.useSearch();
  const [trip] = useTrip();
  const chosen = trip.chosenItinerary;

  const initialDestId = ids?.split(",")[0] || chosen?.destination?.id || trip.selectedDestination?.id || DESTINATIONS[0].id;
  const [destId, setDestId] = useState(initialDestId);
  const dest = useMemo(() => DESTINATIONS.find((d) => d.id === destId) ?? DESTINATIONS[0], [destId]);
  const destName = dest.name;

  const initialDays = dDays || chosen?.duration_days || 4;
  const initialBudget = dBudget || chosen?.cost_inr || 60000;

  const [rows, setRows] = useState<Row[]>(() =>
    trip.optimizedItinerary?.rows?.length
      ? normalise(trip.optimizedItinerary.rows)
      : buildRowsFromItinerary(chosen, destName, initialDays),
  );
  const [budget, setBudget] = useState<number>(initialBudget);
  const [travelers, setTravelers] = useState<number>(chosen?.query?.travelers || 2);
  const [dayStart, setDayStart] = useState("09:00");

  // ---- live place pool (OpenStreetMap POIs) + curated highlights + meals ----
  const [pois, setPois] = useState<PoolItem[]>([]);
  const [loadingPois, setLoadingPois] = useState(false);
  const [poolQuery, setPoolQuery] = useState("");

  useEffect(() => {
    let cancel = false;
    setLoadingPois(true);
    api.places({ lat: dest.lat, lng: dest.lng, radius: 8000, categories: ["tourist", "viewpoint", "food"] })
      .then((r) => {
        if (cancel) return;
        setPois(
          (r.items || []).slice(0, 150).map((p: any, i: number) => ({
            id: `poi-${i}-${p.id ?? p.name}`,
            name: p.name || "Unnamed spot",
            category: p.category || "tourist",
            lat: p.lat, lng: p.lng,
          })),
        );
      })
      .catch(() => { if (!cancel) setPois([]); })
      .finally(() => { if (!cancel) setLoadingPois(false); });
    return () => { cancel = true; };
  }, [dest.id, dest.lat, dest.lng]);

  const pool: PoolItem[] = useMemo(() => {
    const curated: PoolItem[] = dest.highlights.map((h, i) => ({
      id: `hl-${i}-${h}`, name: h, category: "tourist", lat: dest.lat, lng: dest.lng,
    }));
    const meals: PoolItem[] = dest.famous_food.map((f, i) => ({ id: `food-${i}-${f}`, name: f, category: "food" }));
    const all = [...curated, ...pois, ...meals];
    const seen = new Set<string>();
    const uniq = all.filter((p) => {
      const k = p.name.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    // distance-wise: nearest to city centre first
    const withDist = uniq.map((p) => ({
      p,
      km: p.lat != null && p.lng != null ? haversineKm({ lat: dest.lat, lng: dest.lng }, { lat: p.lat, lng: p.lng }) : 99,
    }));
    withDist.sort((a, b) => a.km - b.km);
    const q = poolQuery.trim().toLowerCase();
    return withDist.map((x) => x.p).filter((p) => !q || p.name.toLowerCase().includes(q));
  }, [dest, pois, poolQuery]);

  useEffect(() => {
    patchTrip({ optimizedItinerary: { rows, budget, travelers, destName } });
  }, [rows, budget, travelers, destName]);

  const totalCost = useMemo(() => rows.reduce((s, r) => s + (Number(r.cost) || 0), 0), [rows]);
  const budgetPct = Math.min(100, Math.round((totalCost / Math.max(1, budget)) * 100));
  const over = totalCost > budget;

  const dayNumbers = useMemo(() => {
    const set = new Set(rows.map((r) => r.day));
    if (set.size === 0) for (let i = 1; i <= initialDays; i++) set.add(i);
    return Array.from(set).sort((a, b) => a - b);
  }, [rows, initialDays]);

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function removeRow(id: string) { setRows((rs) => rs.filter((r) => r.id !== id)); }

  function addFromPool(item: PoolItem, day: number, beforeRowId?: string) {
    const kind: Row["kind"] = item.category === "food" ? "meal" : "place";
    const newRow: Row = {
      id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      day,
      time: "09:00",
      place: kind === "meal" ? `Meal — ${item.name}` : item.name,
      note: kind === "meal" ? "favourite meal" : item.category,
      cost: CAT_COST[item.category] ?? 300,
      kind,
      mins: DEFAULT_MINS[kind],
      lat: item.lat, lng: item.lng,
    };
    setRows((rs) => {
      const next = [...rs];
      const idx = beforeRowId ? next.findIndex((r) => r.id === beforeRowId) : -1;
      if (idx >= 0) next.splice(idx, 0, newRow); else next.push(newRow);
      return retime(next, day, dayStart);
    });
  }

  function moveRow(rowId: string, day: number, beforeRowId?: string) {
    setRows((rs) => {
      const moving = rs.find((r) => r.id === rowId);
      if (!moving) return rs;
      const without = rs.filter((r) => r.id !== rowId);
      const moved = { ...moving, day };
      const idx = beforeRowId ? without.findIndex((r) => r.id === beforeRowId) : -1;
      if (idx >= 0) without.splice(idx, 0, moved); else without.push(moved);
      return retime(retime(without, day, dayStart), moving.day, dayStart);
    });
  }

  /** Re-stamp clock times for one day from its start, adding travel time between stops. */
  function retime(all: Row[], day: number, start: string): Row[] {
    let t = clockToMinutes(start);
    let prev: Row | null = null;
    return all.map((r) => {
      if (r.day !== day) return r;
      if (prev && prev.lat != null && prev.lng != null && r.lat != null && r.lng != null) {
        const km = haversineKm({ lat: prev.lat, lng: prev.lng }, { lat: r.lat, lng: r.lng });
        t += Math.max(10, Math.round((km / 22) * 60)); // ~22 km/h city average
      } else if (prev) {
        t += 20;
      }
      const out = { ...r, time: minutesToClock(t) };
      t += r.mins || DEFAULT_MINS[r.kind];
      prev = r;
      return out;
    });
  }

  /** Nearest-neighbour order within one day, then re-time. */
  function orderByDistance(day: number) {
    setRows((rs) => {
      const dayRows = rs.filter((r) => r.day === day);
      const others = rs.filter((r) => r.day !== day);
      const geo = dayRows.filter((r) => r.lat != null && r.lng != null);
      const nogeo = dayRows.filter((r) => r.lat == null || r.lng == null);
      if (geo.length < 2) return rs;
      const ordered: Row[] = [];
      const remaining = [...geo];
      let cur = remaining.shift()!;
      ordered.push(cur);
      while (remaining.length) {
        let bi = 0, bd = Infinity;
        remaining.forEach((p, i) => {
          const d = haversineKm({ lat: cur.lat!, lng: cur.lng! }, { lat: p.lat!, lng: p.lng! });
          if (d < bd) { bd = d; bi = i; }
        });
        cur = remaining.splice(bi, 1)[0];
        ordered.push(cur);
      }
      // keep meals interleaved around midday
      const meals = ordered.filter((r) => r.kind === "meal");
      const places = ordered.filter((r) => r.kind !== "meal");
      const mid = Math.ceil(places.length / 2);
      const merged = [...places.slice(0, mid), ...meals, ...places.slice(mid), ...nogeo];
      const rebuilt = [...others, ...merged];
      return retime(rebuilt, day, dayStart);
    });
  }

  function dayKm(day: number): number {
    const pts = rows.filter((r) => r.day === day && r.lat != null && r.lng != null);
    let km = 0;
    for (let i = 1; i < pts.length; i++) km += haversineKm({ lat: pts[i - 1].lat!, lng: pts[i - 1].lng! }, { lat: pts[i].lat!, lng: pts[i].lng! });
    return Math.round(km * 10) / 10;
  }

  function addDay() {
    const next = (dayNumbers[dayNumbers.length - 1] ?? 0) + 1;
    setRows((rs) => [...rs, {
      id: `r-${Date.now()}`, day: next, time: dayStart, place: `${destName} — plan day ${next}`,
      note: "", cost: 800, kind: "place", mins: 120,
    }]);
  }

  function askAI(promptExtra: string) {
    const summary = rows
      .slice()
      .sort((a, b) => a.day - b.day || clockToMinutes(a.time) - clockToMinutes(b.time))
      .map((r) => `Day ${r.day} ${r.time}: ${r.place} (${r.mins}m, ₹${r.cost})`).join("\n");
    const prompt = `Here's my current ${destName} itinerary (${travelers} travelers, budget ₹${budget}, current total ₹${totalCost}):\n${summary}\n\n${promptExtra}\nBe specific: which row to change, why, and the ₹ impact.`;
    window.dispatchEvent(new CustomEvent("wc:chat:ask", { detail: { prompt } }));
  }

  function saveAndSendToBook() {
    patchTrip({
      optimizedItinerary: { rows, budget, travelers, destName },
      bookingLegs: [{ origin: "DEL", destination: dest.nearest_airport_iata }],
    });
  }

  // ---- drag payloads ----
  function onDragStartPool(e: React.DragEvent, item: PoolItem) {
    e.dataTransfer.setData("application/json", JSON.stringify({ type: "pool", item }));
    e.dataTransfer.effectAllowed = "copy";
  }
  function onDragStartRow(e: React.DragEvent, rowId: string) {
    e.dataTransfer.setData("application/json", JSON.stringify({ type: "row", rowId }));
    e.dataTransfer.effectAllowed = "move";
  }
  function handleDrop(e: React.DragEvent, day: number, beforeRowId?: string) {
    e.preventDefault();
    e.stopPropagation();
    try {
      const payload = JSON.parse(e.dataTransfer.getData("application/json"));
      if (payload.type === "pool") addFromPool(payload.item, day, beforeRowId);
      else if (payload.type === "row") moveRow(payload.rowId, day, beforeRowId);
    } catch { /* ignore malformed drops */ }
  }

  return (
    <div>
      <PageHero
        eyebrow="Step 04 · Optimize"
        icon={<Sliders className="h-3.5 w-3.5" />}
        title={<>Drag real places into <span className="text-brand-gradient">each day.</span></>}
        description="Left = every place and famous meal near your destination, nearest first. Drag one into a day, auto-order it by distance, and the clock times, travel gaps and budget update themselves."
      />

      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-4 grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft sm:grid-cols-4">
          <label className="text-xs font-semibold text-muted-foreground">
            Destination
            <select value={destId} onChange={(e) => setDestId(e.target.value)} className={`${inp} mt-1`}>
              {DESTINATIONS.map((d) => <option key={d.id} value={d.id}>{d.name}, {d.state}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-muted-foreground">
            Day starts at
            <input type="time" value={dayStart} onChange={(e) => setDayStart(e.target.value)} className={`${inp} mt-1`} />
          </label>
          <label className="text-xs font-semibold text-muted-foreground">
            Budget ₹
            <input type="number" min={0} step={1000} value={budget} onChange={(e) => setBudget(+e.target.value)} className={`${inp} mt-1`} />
          </label>
          <label className="text-xs font-semibold text-muted-foreground">
            Travelers
            <input type="number" min={1} max={12} value={travelers} onChange={(e) => setTravelers(+e.target.value)} className={`${inp} mt-1`} />
          </label>
        </div>

        <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
          {/* ---------- Place pool ---------- */}
          <aside className="rounded-2xl border border-border bg-card p-4 shadow-soft lg:sticky lg:top-20 lg:max-h-[80vh] lg:overflow-auto">
            <h2 className="flex items-center gap-2 font-display font-bold text-foreground">
              <MapPin className="h-4 w-4" /> Places & meals
            </h2>
            <p className="text-xs text-muted-foreground">Live spots around {destName}, nearest first. Drag any card into a day.</p>
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input value={poolQuery} onChange={(e) => setPoolQuery(e.target.value)} placeholder="Search places or food" className={`${inp} pl-7`} />
            </div>
            {loadingPois && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Loading live places…</p>
            )}
            <ul className="mt-3 space-y-1.5">
              {pool.slice(0, 120).map((p) => (
                <li
                  key={p.id}
                  draggable
                  onDragStart={(e) => onDragStartPool(e, p)}
                  className="group flex cursor-grab items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5 text-xs hover:border-brand active:cursor-grabbing"
                >
                  <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate font-medium text-foreground">{p.name}</span>
                  {p.category === "food"
                    ? <UtensilsCrossed className="h-3.5 w-3.5 text-amber-600" />
                    : <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">{p.category}</span>}
                  <button
                    onClick={() => addFromPool(p, dayNumbers[0] ?? 1)}
                    title="Add to day 1"
                    className="rounded-full bg-foreground px-1.5 py-0.5 text-[10px] font-bold text-background opacity-0 transition group-hover:opacity-100"
                  >+</button>
                </li>
              ))}
              {!loadingPois && pool.length === 0 && (
                <li className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">No places found — try another search.</li>
              )}
            </ul>
          </aside>

          {/* ---------- Days ---------- */}
          <div className="space-y-4">
            {/* budget bar */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 font-semibold text-foreground">
                  <Wallet className="h-3 w-3" /> ₹{totalCost.toLocaleString("en-IN")} / ₹{budget.toLocaleString("en-IN")}
                </span>
                <span className={`font-bold ${over ? "text-destructive" : "text-emerald-700"}`}>
                  {over ? `+₹${(totalCost - budget).toLocaleString("en-IN")} over` : `₹${(budget - totalCost).toLocaleString("en-IN")} left`}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div className={`h-full transition-all ${over ? "bg-destructive" : "bg-brand"}`} style={{ width: `${budgetPct}%` }} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={addDay} className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background"><Plus className="h-3 w-3" /> Add day</button>
                <button onClick={() => askAI("Cut the cost without killing the experience.")} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary"><MessageSquare className="h-3 w-3" /> Ask AI to save money</button>
                <button onClick={() => askAI("Is this day order sensible for travel time? Suggest a better sequence.")} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary"><RouteIcon className="h-3 w-3" /> Sanity-check the route</button>
                <Link to="/book" onClick={saveAndSendToBook} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary">Send to Book <ArrowRight className="h-3 w-3" /></Link>
              </div>
            </div>

            {dayNumbers.map((day) => {
              const dayRows = rows
                .filter((r) => r.day === day)
                .sort((a, b) => clockToMinutes(a.time) - clockToMinutes(b.time));
              const dayTotal = dayRows.reduce((s, r) => s + (Number(r.cost) || 0), 0);
              return (
                <div
                  key={day}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                  onDrop={(e) => handleDrop(e, day)}
                  className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-secondary/40 px-4 py-2.5">
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-base font-bold text-foreground">Day {day}</span>
                      <span className="text-xs text-muted-foreground">{dayRows.length} stops · {dayKm(day)} km · ₹{dayTotal.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => orderByDistance(day)} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold hover:bg-secondary"><RouteIcon className="h-3 w-3" /> Order by distance</button>
                      <button onClick={() => setRows((rs) => retime(rs, day, dayStart))} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold hover:bg-secondary"><Clock className="h-3 w-3" /> Re-time</button>
                    </div>
                  </div>

                  {dayRows.length === 0 && (
                    <div className="m-4 rounded-xl border-2 border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                      Drag a place from the left into Day {day}.
                    </div>
                  )}

                  <ul className="divide-y divide-border">
                    {dayRows.map((r) => (
                      <li
                        key={r.id}
                        draggable
                        onDragStart={(e) => onDragStartRow(e, r.id)}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onDrop={(e) => handleDrop(e, day, r.id)}
                        className="flex cursor-grab flex-wrap items-center gap-2 px-3 py-2 hover:bg-secondary/30 active:cursor-grabbing"
                      >
                        <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <input type="time" value={r.time} onChange={(e) => updateRow(r.id, { time: e.target.value })} className={`${inp} w-24`} />
                        <input value={r.place} onChange={(e) => updateRow(r.id, { place: e.target.value })} className={`${inp} min-w-[160px] flex-1`} />
                        <select value={r.kind} onChange={(e) => updateRow(r.id, { kind: e.target.value as Row["kind"] })} className={`${inp} w-24`}>
                          <option value="place">Place</option>
                          <option value="meal">Meal</option>
                          <option value="travel">Travel</option>
                        </select>
                        <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <input type="number" min={0} step={15} value={r.mins} onChange={(e) => updateRow(r.id, { mins: +e.target.value })} className={`${inp} w-16 text-right`} />m
                        </label>
                        <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          ₹<input type="number" min={0} step={50} value={r.cost} onChange={(e) => updateRow(r.id, { cost: +e.target.value })} className={`${inp} w-20 text-right`} />
                        </label>
                        <button onClick={() => removeRow(r.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        <p className="mt-6 rounded-2xl border border-dashed border-border bg-secondary/40 p-4 text-xs text-muted-foreground">
          <b className="text-foreground">How the optimizer works:</b> places come live from OpenStreetMap around {destName} and are listed nearest-first. “Order by distance” runs a nearest-neighbour pass over the day's mapped stops, keeps meals around midday, then re-stamps clock times using ~22 km/h city travel speed plus the minutes you set per stop. Everything stays editable by hand.
        </p>
      </section>
    </div>
  );
}
