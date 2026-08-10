import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { CalendarDays, Loader2, MapPin, MessageSquare, Sparkles, Trophy, Users, Wallet } from "lucide-react";
import { DESTINATIONS } from "@/data/destinations";
import { api } from "@/lib/api";
import { PageHero } from "@/components/PageHero";
import { patchTrip, getTrip } from "@/lib/tripStore";

export const Route = createFileRoute("/plan")({
  validateSearch: (s: Record<string, unknown>) => ({
    dest: typeof s.dest === "string" ? s.dest : undefined,
    name: typeof s.name === "string" ? s.name : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Plan — 3 ranked itineraries | WanderCompanion" },
      { name: "description", content: "Pick dates, travelers and budget. Get three day-by-day itineraries ranked for you." },
      { property: "og:title", content: "Plan — Build a smart itinerary" },
      { property: "og:description", content: "Three ranked itinerary options under your constraints." },
    ],
  }),
  component: PlanPage,
});

const PACE_TINT: Record<string, string> = {
  easy: "bg-emerald-100 text-emerald-800 border-emerald-200",
  balanced: "bg-sky-100 text-sky-800 border-sky-200",
  packed: "bg-amber-100 text-amber-800 border-amber-200",
};

const inputCls = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

function PlanPage() {
  const { dest: destFromSearch, name: nameFromSearch } = Route.useSearch();
  const saved = typeof window !== "undefined" ? getTrip().planQuery : null;

  // Try to resolve AI-suggested name to a dataset destination by fuzzy match
  const resolvedFromName = useMemo(() => {
    if (!nameFromSearch) return null;
    const n = nameFromSearch.toLowerCase();
    return DESTINATIONS.find((d) =>
      d.name.toLowerCase() === n ||
      d.name.toLowerCase().includes(n) ||
      n.includes(d.name.toLowerCase())
    );
  }, [nameFromSearch]);

  const [destId, setDestId] = useState(destFromSearch ?? resolvedFromName?.id ?? saved?.destination_id ?? DESTINATIONS[0].id);
  const [startDate, setStartDate] = useState(saved?.start_date ?? "");
  const [days, setDays] = useState<number>(saved?.duration_days ?? 5);
  const [travelers, setTravelers] = useState<number>(saved?.travelers ?? 2);
  const [style, setStyle] = useState<string>(saved?.style ?? "mid");
  const [budget, setBudget] = useState<number>(saved?.budget_inr ?? 0);
  const [likes, setLikes] = useState(saved?.likes?.join(", ") ?? "food, scenic views");
  const [dislikes, setDislikes] = useState(saved?.dislikes?.join(", ") ?? "crowds");
  const [includeFlight, setIncludeFlight] = useState(saved?.include_flight ?? true);

  const dest = useMemo(() => DESTINATIONS.find((d) => d.id === destId)!, [destId]);

  const mutation = useMutation({
    mutationFn: async (req: any) => api.plan(req),
    onSuccess: (data, req) => patchTrip({ planQuery: req, planOptions: data }),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate({
      destination_id: destId,
      start_date: startDate || undefined,
      duration_days: days,
      travelers,
      style,
      budget_inr: budget > 0 ? budget : undefined,
      likes: likes.split(",").map((s: string) => s.trim()).filter(Boolean),
      dislikes: dislikes.split(",").map((s: string) => s.trim()).filter(Boolean),
      include_flight: includeFlight,
    });
  }

  const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  return (
    <div>
      <PageHero
        eyebrow="Step 03 · Plan"
        icon={<Sparkles className="h-3.5 w-3.5" />}
        title={<>Three itineraries, <span className="text-brand-gradient">ranked.</span></>}
        description="Pick a destination (or pull one from Dream), tell us about your trip — we'll generate three day-by-day options and rank them transparently."
      />

      <section className="mx-auto max-w-5xl px-4 py-8">
        <form onSubmit={onSubmit} className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-7">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Destination" icon={<MapPin className="h-4 w-4" />}>
              <select value={destId} onChange={(e) => setDestId(e.target.value)} className={inputCls}>
                {DESTINATIONS.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} — {d.state}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">{dest.tagline}</p>
            </Field>
            <Field label="Start date (optional)" icon={<CalendarDays className="h-4 w-4" />}>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
            </Field>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Field label={`Days: ${days}`}>
              <input type="range" min={2} max={20} value={days} onChange={(e) => setDays(+e.target.value)} className="w-full accent-[var(--brand)]" />
            </Field>
            <Field label={`Travelers: ${travelers}`} icon={<Users className="h-4 w-4" />}>
              <input type="range" min={1} max={10} value={travelers} onChange={(e) => setTravelers(+e.target.value)} className="w-full accent-[var(--brand)]" />
            </Field>
            <Field label="Travel style">
              <select value={style} onChange={(e) => setStyle(e.target.value)} className={inputCls}>
                <option value="shoestring">Shoestring</option>
                <option value="budget">Budget</option>
                <option value="mid">Mid</option>
                <option value="comfort">Comfort</option>
                <option value="luxury">Luxury</option>
              </select>
            </Field>
            <Field label="Total budget ₹ (0 = any)" icon={<Wallet className="h-4 w-4" />}>
              <input type="number" min={0} step={1000} value={budget} onChange={(e) => setBudget(+e.target.value)} className={inputCls} />
            </Field>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <Field label="Likes (comma separated)">
              <input value={likes} onChange={(e) => setLikes(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Dislikes (comma separated)">
              <input value={dislikes} onChange={(e) => setDislikes(e.target.value)} className={inputCls} />
            </Field>
          </div>

          <label className="mt-5 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={includeFlight} onChange={(e) => setIncludeFlight(e.target.checked)} className="h-4 w-4 accent-[var(--brand)]" />
            Include round-trip flight from Delhi (DEL) in cost
          </label>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
            <p className="text-xs text-muted-foreground">Engine: deterministic itinerary + multi-criteria rank.</p>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition hover:opacity-90 disabled:opacity-60"
            >
              {mutation.isPending ? (<><Loader2 className="h-4 w-4 animate-spin" /> Planning…</>) : (<><Sparkles className="h-4 w-4" /> Generate 3 itineraries</>)}
            </button>
          </div>
        </form>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16">
        {nameFromSearch && !resolvedFromName && (
          <div className="mb-4 rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 text-sm">
            <b className="text-indigo-900">{nameFromSearch}</b> isn't in the curated dataset. We mapped you to <b>{dest.name}</b> for engine planning — for an AI-tailored itinerary of <b>{nameFromSearch}</b> specifically, click "Ask AI" below.
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("wc:chat:ask", { detail: { prompt: `Build a detailed ${days}-day itinerary for ${nameFromSearch} for ${travelers} travelers, ${style} style, budget ₹${budget || 80000}. Day-by-day with morning/afternoon/evening, food picks, costs in ₹, and total budget split.` } }))}
              className="ml-2 inline-flex items-center gap-1 rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:opacity-90"
            >
              <MessageSquare className="h-3 w-3" /> Ask AI for {nameFromSearch} plan
            </button>
          </div>
        )}
        {mutation.isError && (
          <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            Something went wrong. Try again.
          </p>
        )}


        {mutation.data && (
          <>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-bold sm:text-3xl">{mutation.data.destination.name} — 3 options</h2>
                <p className="text-sm text-muted-foreground">{mutation.data.destination.tagline}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const top = mutation.data.options[0];
                    window.dispatchEvent(new CustomEvent("wc:chat:ask", { detail: { prompt: `My current plan for ${mutation.data.destination.name}: ${days} days, ${travelers} travelers, ₹${top.cost_inr.toLocaleString("en-IN")} total. Suggest 3 specific changes that cut cost by 15-25% while keeping the experience strong. Be specific (which day, which swap, ₹ savings).` } }));
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
                >
                  <MessageSquare className="h-3 w-3" /> Ask AI about this plan
                </button>
                <button
                  onClick={() => { patchTrip({ chosenItinerary: mutation.data.options[0] }); }}
                  className="text-sm font-semibold text-brand hover:underline"
                >
                  Save & open Optimize →
                </button>
                <Link to="/optimize" className="text-sm font-semibold text-brand hover:underline">Optimize →</Link>
              </div>
            </div>


            {/* Quick comparison table */}
            <div className="mb-8 overflow-hidden rounded-2xl border border-border bg-card">
              <div className="border-b border-border bg-secondary/50 px-5 py-3">
                <h3 className="font-display text-sm font-semibold text-foreground">At-a-glance comparison</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-secondary/30 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left">Rank</th>
                      <th className="px-4 py-3 text-left">Plan</th>
                      <th className="px-4 py-3 text-left">Pace</th>
                      <th className="px-4 py-3 text-right">Days</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3 text-right">/Day/Person</th>
                      <th className="px-4 py-3 text-left">Why</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {mutation.data.options.map((opt: any) => (
                      <tr key={opt.variant} className={opt.ranked.rank === 1 ? "bg-brand-soft/50" : "hover:bg-secondary/40"}>
                        <td className="px-4 py-3 font-display font-bold text-foreground">#{opt.ranked.rank}</td>
                        <td className="px-4 py-3 font-semibold text-foreground">{opt.label}</td>
                        <td className="px-4 py-3 capitalize text-muted-foreground">{opt.pace}</td>
                        <td className="px-4 py-3 text-right">{opt.duration_days}</td>
                        <td className="px-4 py-3 text-right font-semibold">{inr(opt.cost_inr)}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{inr(opt.per_person_per_day_inr)}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{opt.ranked.verdict}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <AiTips destination={mutation.data.destination.name} />

            <div className="grid gap-6 lg:grid-cols-3">
              {mutation.data.options.map((opt: any) => (
                <article
                  key={opt.variant}
                  className={`rounded-2xl border bg-card p-5 shadow-soft ${
                    opt.ranked.rank === 1 ? "border-foreground/30 ring-brand" : "border-border"
                  }`}
                >
                  <header className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{opt.variant}</p>
                      <h3 className="font-display text-lg font-bold text-foreground">{opt.label}</h3>
                    </div>
                    {opt.ranked.rank === 1 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-foreground px-2.5 py-1 text-xs font-bold text-background">
                        <Trophy className="h-3 w-3" /> #1
                      </span>
                    )}
                  </header>

                  <p className="text-sm text-muted-foreground">{opt.blurb}</p>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className={`rounded-full border px-2.5 py-1 font-medium capitalize ${PACE_TINT[opt.pace]}`}>{opt.pace}</span>
                    <span className="rounded-full border border-border bg-secondary px-2.5 py-1 font-medium">{opt.duration_days} days</span>
                    <span className="rounded-full border border-border bg-secondary px-2.5 py-1 font-medium">{inr(opt.cost_inr)}</span>
                    <span className="rounded-full border border-border bg-secondary px-2.5 py-1 font-medium">{inr(opt.per_person_per_day_inr)}/day/pp</span>
                  </div>

                  <ol className="mt-4 space-y-2">
                    {opt.days.map((day: any) => (
                      <li key={day.day} className="rounded-xl border border-border bg-secondary/30 p-3">
                        <div className="mb-1 flex items-baseline justify-between gap-2">
                          <p className="text-sm font-bold text-foreground">Day {day.day} · {day.title}</p>
                          {day.date && <span className="text-[11px] text-muted-foreground">{day.date}</span>}
                        </div>
                        <p className="text-xs text-foreground/80"><b>AM:</b> {day.morning}</p>
                        <p className="text-xs text-foreground/80"><b>PM:</b> {day.afternoon}</p>
                        <p className="text-xs text-foreground/80"><b>Eve:</b> {day.evening}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">🍽 {day.food_pick}</p>
                      </li>
                    ))}
                  </ol>

                  <div className="mt-4 rounded-xl border border-border bg-brand-soft p-3">
                    <p className="text-xs font-semibold text-foreground">Why this rank — {opt.ranked.verdict}</p>
                    <ul className="mt-1 space-y-0.5 text-xs text-foreground/80">
                      {opt.reasons.map((r: any, i: number) => (<li key={i}>• {r}</li>))}
                    </ul>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Link to="/book" className="flex-1 rounded-full bg-foreground px-3 py-2 text-center text-xs font-semibold text-background hover:opacity-90">
                      Book this
                    </Link>
                    <Link to="/travel" className="flex-1 rounded-full border border-border bg-background px-3 py-2 text-center text-xs font-semibold hover:bg-secondary">
                      Map & route
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {!mutation.data && !mutation.isPending && (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center text-muted-foreground">
            Set your preferences above and hit <b className="text-foreground">Generate 3 itineraries</b>.
          </div>
        )}
      </section>
    </div>
  );
}

function AiTips({ destination }: { destination: string }) {
  const [tips, setTips] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.ai.planEnhance({ destination })
      .then(res => setTips(res.text))
      .catch(() => setTips("Unable to load AI tips."))
      .finally(() => setLoading(false));
  }, [destination]);

  return (
    <div className="mb-8 rounded-2xl border border-indigo-100 bg-indigo-50/30 p-6">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-indigo-600" />
        <h3 className="font-display text-lg font-bold text-indigo-900">AI Local Tips & Insights</h3>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-indigo-600/70">
          <Loader2 className="h-4 w-4 animate-spin" /> Gathering local wisdom...
        </div>
      ) : (
        <div className="prose prose-sm prose-indigo max-w-none text-indigo-900/80">
          {tips ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="markdown-content">
                {tips.split('\n').map((line, i) => (
                  <p key={i} className={line.startsWith('#') ? 'font-bold mt-2' : ''}>{line}</p>
                ))}
              </div>
            </div>
          ) : "No tips available."}
        </div>
      )}
    </div>
  );
}

function Field({ label, hint, icon, children }: { label: string; hint?: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}{label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}
