import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Sliders, ArrowRight, MessageSquare, Plus, Trash2, Save, Wallet } from "lucide-react";
import { DESTINATIONS } from "@/data/destinations";
import { PageHero } from "@/components/PageHero";
import { useTrip, patchTrip } from "@/lib/tripStore";

interface Search { ids?: string; days?: number; budget?: number }

export const Route = createFileRoute("/optimize")({
  head: () => ({ meta: [
    { title: "Optimize — Editable itinerary + AI budget chat | WanderCompanion" },
    { name: "description", content: "Edit each day, watch the budget bar live, and chat with an AI budget optimizer on the side." },
  ] }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    ids: typeof s.ids === "string" ? s.ids : undefined,
    days: s.days ? Number(s.days) : undefined,
    budget: s.budget ? Number(s.budget) : undefined,
  }),
  component: OptimizePage,
});

const inp = "w-full rounded-lg border border-input bg-background px-2 py-1.5 text-xs text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

type Row = { id: string; day: number; time: string; place: string; note: string; cost: number };

function buildRowsFromItinerary(it: any, destName: string, days: number): Row[] {
  if (it?.days && Array.isArray(it.days)) {
    return it.days.flatMap((d: any, i: number) => [
      { id: `${i}-am`, day: d.day || i + 1, time: "AM", place: d.morning || `${destName} morning`, note: d.food_pick || "", cost: Math.round((it.cost_inr || 0) / (it.days.length * 3)) },
      { id: `${i}-pm`, day: d.day || i + 1, time: "PM", place: d.afternoon || `${destName} afternoon`, note: "", cost: Math.round((it.cost_inr || 0) / (it.days.length * 3)) },
      { id: `${i}-eve`, day: d.day || i + 1, time: "Eve", place: d.evening || `${destName} evening`, note: "", cost: Math.round((it.cost_inr || 0) / (it.days.length * 3)) },
    ]);
  }
  return Array.from({ length: days * 3 }).map((_, i) => {
    const day = Math.floor(i / 3) + 1;
    const slot = ["AM", "PM", "Eve"][i % 3];
    return { id: `d${day}-${slot}`, day, time: slot, place: `${destName} — ${slot} activity`, note: "", cost: 1500 };
  });
}

function OptimizePage() {
  const { ids, days: dDays, budget: dBudget } = Route.useSearch();
  const [trip] = useTrip();
  const chosen = trip.chosenItinerary;

  const initialDest = ids?.split(",")[0] || chosen?.destination?.id || DESTINATIONS[0].id;
  const destName = DESTINATIONS.find((d) => d.id === initialDest)?.name || chosen?.destination?.name || initialDest;
  const initialDays = dDays || chosen?.duration_days || 5;
  const initialBudget = dBudget || chosen?.cost_inr || 60000;

  const [rows, setRows] = useState<Row[]>(() => trip.optimizedItinerary?.rows || buildRowsFromItinerary(chosen, destName, initialDays));
  const [budget, setBudget] = useState<number>(initialBudget);
  const [travelers, setTravelers] = useState<number>(chosen?.query?.travelers || 2);

  useEffect(() => {
    patchTrip({ optimizedItinerary: { rows, budget, travelers, destName } });
  }, [rows, budget, travelers, destName]);

  const totalCost = useMemo(() => rows.reduce((s, r) => s + (Number(r.cost) || 0), 0), [rows]);
  const budgetPct = Math.min(100, Math.round((totalCost / Math.max(1, budget)) * 100));
  const over = totalCost > budget;

  const byDay = useMemo(() => {
    const grouped: Record<number, Row[]> = {};
    rows.forEach((r) => { (grouped[r.day] ||= []).push(r); });
    return grouped;
  }, [rows]);

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function removeRow(id: string) { setRows((rs) => rs.filter((r) => r.id !== id)); }
  function addRow(day: number) {
    setRows((rs) => [...rs, { id: `d${day}-${Date.now()}`, day, time: "Eve", place: "New activity", note: "", cost: 500 }]);
  }
  function addDay() {
    const nextDay = Math.max(0, ...rows.map((r) => r.day)) + 1;
    setRows((rs) => [...rs,
      { id: `d${nextDay}-am`, day: nextDay, time: "AM", place: `${destName} morning`, note: "", cost: 1200 },
      { id: `d${nextDay}-pm`, day: nextDay, time: "PM", place: `${destName} afternoon`, note: "", cost: 1500 },
      { id: `d${nextDay}-eve`, day: nextDay, time: "Eve", place: `${destName} evening`, note: "", cost: 1000 },
    ]);
  }

  function askAI(promptExtra: string) {
    const summary = rows.map((r) => `Day ${r.day} ${r.time}: ${r.place} (₹${r.cost})`).join("\n");
    const prompt = `Here's my current itinerary for ${destName} (${travelers} travelers, budget ₹${budget}, current total ₹${totalCost}):\n${summary}\n\n${promptExtra}\nBe specific: which row to change, why, and ₹ impact.`;
    window.dispatchEvent(new CustomEvent("wc:chat:ask", { detail: { prompt } }));
  }

  function saveAndSendToBook() {
    patchTrip({
      optimizedItinerary: { rows, budget, travelers, destName },
      bookingLegs: [{ origin: "DEL", destination: DESTINATIONS.find((d) => d.name === destName)?.nearest_airport_iata || "DEL" }],
    });
  }

  return (
    <div>
      <PageHero
        eyebrow="Step 04 · Optimize"
        icon={<Sliders className="h-3.5 w-3.5" />}
        title={<>Edit every day. <span className="text-brand-gradient">Watch the budget live.</span></>}
        description="Add, remove and re-cost each activity. The AI budget chat sits on the right — ask for swaps, savings, or a leaner day."
      />

      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
          {/* Editable itinerary */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h2 className="font-display text-xl font-bold text-foreground">{destName} · itinerary</h2>
                <p className="text-xs text-muted-foreground">Click any cell to edit. Rows persist across pages.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={addDay} className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background"><Plus className="h-3 w-3" /> Add day</button>
              </div>
            </div>

            {/* Budget bar */}
            <div className="mb-4 rounded-xl border border-border bg-background p-3">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 font-semibold text-foreground"><Wallet className="h-3 w-3" /> ₹{totalCost.toLocaleString("en-IN")} / ₹{budget.toLocaleString("en-IN")}</span>
                <span className={`font-bold ${over ? "text-destructive" : "text-emerald-700"}`}>{over ? `+₹${(totalCost - budget).toLocaleString("en-IN")} over` : `₹${(budget - totalCost).toLocaleString("en-IN")} left`}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div className={`h-full transition-all ${over ? "bg-destructive" : "bg-brand"}`} style={{ width: `${budgetPct}%` }} />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input type="number" min={0} step={1000} value={budget} onChange={(e) => setBudget(+e.target.value)} className={inp} placeholder="Budget ₹" />
                <input type="number" min={1} max={12} value={travelers} onChange={(e) => setTravelers(+e.target.value)} className={inp} placeholder="Travelers" />
              </div>
            </div>

            {/* Day tables */}
            <div className="space-y-4">
              {Object.entries(byDay).sort((a, b) => Number(a[0]) - Number(b[0])).map(([day, dayRows]) => {
                const dayTotal = dayRows.reduce((s, r) => s + (Number(r.cost) || 0), 0);
                return (
                  <div key={day} className="overflow-hidden rounded-xl border border-border">
                    <div className="flex items-center justify-between bg-secondary/40 px-3 py-2">
                      <span className="text-sm font-bold text-foreground">Day {day}</span>
                      <span className="text-xs text-muted-foreground">₹{dayTotal.toLocaleString("en-IN")}</span>
                    </div>
                    <table className="w-full text-xs">
                      <tbody className="divide-y divide-border">
                        {dayRows.map((r) => (
                          <tr key={r.id} className="hover:bg-secondary/30">
                            <td className="w-14 px-2 py-1.5">
                              <select value={r.time} onChange={(e) => updateRow(r.id, { time: e.target.value })} className={inp}>
                                <option>AM</option><option>PM</option><option>Eve</option>
                              </select>
                            </td>
                            <td className="px-2 py-1.5"><input value={r.place} onChange={(e) => updateRow(r.id, { place: e.target.value })} className={inp} /></td>
                            <td className="px-2 py-1.5"><input value={r.note} onChange={(e) => updateRow(r.id, { note: e.target.value })} placeholder="note" className={inp} /></td>
                            <td className="w-24 px-2 py-1.5"><input type="number" value={r.cost} onChange={(e) => updateRow(r.id, { cost: +e.target.value })} className={`${inp} text-right`} /></td>
                            <td className="w-8 px-1">
                              <button onClick={() => removeRow(r.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="flex justify-end border-t border-border bg-secondary/20 px-2 py-1.5">
                      <button onClick={() => addRow(Number(day))} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-[11px] font-semibold hover:border-foreground/40"><Plus className="h-3 w-3" /> Add row</button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Link to="/sightsee" search={{} as any} onClick={saveAndSendToBook} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-secondary"><Save className="h-4 w-4" /> Save to Sightsee</Link>
              <Link to="/book" onClick={saveAndSendToBook} className="inline-flex items-center gap-1 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background hover:opacity-90">Book this trip <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </div>

          {/* Side AI budget chat */}
          <aside className="space-y-3">
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5">
              <div className="mb-2 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-indigo-600" />
                <h3 className="font-display font-bold text-indigo-900">Budget optimizer chat</h3>
              </div>
              <p className="text-xs text-indigo-900/70">Sends your live rows + budget to the AI. Answers are real-time (Gemini + Google Search).</p>
              <div className="mt-3 space-y-2">
                <button onClick={() => askAI("Suggest 3 specific swaps that cut cost by 15-25% while keeping the experience strong.")}
                  className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-left text-xs font-semibold text-indigo-900 hover:bg-indigo-100">
                  💰 Cut cost by 15–25% (specific swaps)
                </button>
                <button onClick={() => askAI("Rebalance to fit exactly my budget. Which rows to remove or replace, with new totals?")}
                  className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-left text-xs font-semibold text-indigo-900 hover:bg-indigo-100">
                  🎯 Fit exactly to my budget
                </button>
                <button onClick={() => askAI("Are there famous places I'm missing? Suggest 3 high-rated additions with ₹ estimates.")}
                  className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-left text-xs font-semibold text-indigo-900 hover:bg-indigo-100">
                  ⭐ What am I missing?
                </button>
                <button onClick={() => askAI("Reorder days for shortest travel time within the city. Explain the reorder.")}
                  className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-left text-xs font-semibold text-indigo-900 hover:bg-indigo-100">
                  🗺 Optimize the order
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Live summary</div>
              <div className="mt-1 text-sm text-foreground/80">
                {rows.length} rows · {Object.keys(byDay).length} days · {travelers} travelers<br />
                Per-person-per-day ~ <b className="text-foreground">₹{Math.round(totalCost / Math.max(1, travelers) / Math.max(1, Object.keys(byDay).length)).toLocaleString("en-IN")}</b>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
