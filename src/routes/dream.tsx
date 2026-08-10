import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Sparkles, Loader2, MapPin, Star, ArrowRight, MessageSquare, ImageIcon } from "lucide-react";
import {
  INTEREST_LABELS,
  SEASON_LABELS,
  DESTINATIONS,
  type Interest,
  type Season,
} from "@/data/destinations";
import { api } from "@/lib/api";
import { PageHero } from "@/components/PageHero";
import { patchTrip, fallbackHero, getTrip } from "@/lib/tripStore";

export const Route = createFileRoute("/dream")({
  head: () => ({
    meta: [
      { title: "Dream — Discover India by your mood | WanderCompanion" },
      { name: "description", content: "Pick interests, duration, season and budget. Get destinations that actually match — plus AI suggestions for anything off-list." },
    ],
  }),
  component: DreamPage,
});

const INTERESTS = Object.keys(INTEREST_LABELS) as Interest[];
const SEASONS = Object.keys(SEASON_LABELS) as Season[];

interface DreamResultItem {
  id: string;
  name: string;
  state: string;
  tagline: string;
  interests?: Interest[];
  best_seasons?: Season[];
  score?: number;
  reasons?: string[];
  estimated_cost_inr?: number;
  per_person_per_day_inr?: number;
  hero_image?: string;
  ai?: boolean;
  ranked?: { rank: number; total_score: number; verdict: string };
}

function heroFor(r: DreamResultItem) {
  if (r.hero_image) return r.hero_image;
  const d = DESTINATIONS.find((x) => x.id === r.id);
  return d?.hero_image || fallbackHero(`${r.name} ${r.state || ""}`);
}

function DreamPage() {
  const saved = typeof window !== "undefined" ? getTrip().dreamFilters : null;
  const [interests, setInterests] = useState<Interest[]>(saved?.interests || ["beach"]);
  const [seasons, setSeasons] = useState<Season[]>(saved?.seasons || []);
  const [days, setDays] = useState<number>(saved?.duration_days || 5);
  const [travelers, setTravelers] = useState<number>(saved?.travelers || 2);
  const [maxBudget, setMaxBudget] = useState<number>(saved?.max_budget_per_day_inr || 0);
  const [avoidCrowds, setAvoidCrowds] = useState<boolean>(saved?.avoid_crowds || false);
  const [style, setStyle] = useState<string>(saved?.style || "mid");
  const [cached, setCached] = useState<DreamResultItem[] | null>(() => getTrip().dreamResults || null);
  const [aiExtra, setAiExtra] = useState<DreamResultItem[]>([]);
  const [aiBusy, setAiBusy] = useState(false);

  const mutation = useMutation({
    mutationFn: async (req: any) => api.dream(req),
    onSuccess: (data, req) => {
      patchTrip({ dreamFilters: req, dreamResults: data.results });
      setCached(data.results);
      setAiExtra([]);
      // If too few hits, ask AI for real-world matches
      if (data.results.length < 4) fetchAiSuggestions(req);
    },
  });

  const toggle = <T extends string>(arr: T[], v: T, set: (a: T[]) => void) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  async function fetchAiSuggestions(req: any) {
    setAiBusy(true);
    try {
      const interestsTxt = (req.interests || []).map((i: string) => INTEREST_LABELS[i as Interest] || i).join(", ");
      const seasonsTxt = (req.seasons || []).map((s: string) => SEASON_LABELS[s as Season] || s).join(", ") || "any season";
      const budgetTxt = req.max_budget_per_day_inr ? `under ₹${req.max_budget_per_day_inr}/day per person` : "any budget";
      const prompt = `Suggest 6 specific real-world travel destinations (India or international) matching: interests=${interestsTxt}; season=${seasonsTxt}; ${budgetTxt}; trip length ${req.duration_days || 5} days.

Return STRICT JSON array, no prose, no markdown fences. Each item:
{"id":"slug","name":"City","state":"State/Country","tagline":"≤80 chars","reasons":["why1","why2"],"est_cost_inr":NUMBER,"per_day_inr":NUMBER}`;
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }] }),
      });
      const data = await res.json();
      const raw = String(data.text || "").replace(/```json|```/g, "").trim();
      const start = raw.indexOf("[");
      const end = raw.lastIndexOf("]");
      if (start >= 0 && end > start) {
        const arr = JSON.parse(raw.slice(start, end + 1));
        const items: DreamResultItem[] = arr.slice(0, 6).map((x: any, i: number) => ({
          id: `ai-${x.id || i}`,
          name: x.name,
          state: x.state || "",
          tagline: x.tagline || "",
          reasons: Array.isArray(x.reasons) ? x.reasons : [],
          estimated_cost_inr: Number(x.est_cost_inr) || 0,
          per_person_per_day_inr: Number(x.per_day_inr) || 0,
          ai: true,
        }));
        setAiExtra(items);
      }
    } catch {
      /* silent */
    } finally {
      setAiBusy(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (interests.length === 0) return;
    mutation.mutate({
      interests,
      seasons: seasons.length ? seasons : undefined,
      duration_days: days,
      travelers,
      max_budget_per_day_inr: maxBudget > 0 ? maxBudget : undefined,
      avoid_crowds: avoidCrowds,
      style,
    });
  }

  const results = mutation.data?.results ?? cached ?? null;

  return (
    <div>
      <PageHero
        eyebrow="Step 01 · Dream"
        icon={<Sparkles className="h-3.5 w-3.5" />}
        title={<>What does your trip <span className="text-brand-gradient">feel like?</span></>}
        description="Filters are real — pick beaches and you get beaches. If the curated list is thin, AI fills in real-world picks within your budget."
      />

      <section className="mx-auto max-w-5xl px-4 py-8">
        <form onSubmit={onSubmit} className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-7">
          <Field label="I'm into…" hint="Hard filter — only destinations matching ≥1 will show">
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((i) => (
                <Chip key={i} active={interests.includes(i)} onClick={() => toggle(interests, i, setInterests)}>
                  {INTEREST_LABELS[i]}
                </Chip>
              ))}
            </div>
          </Field>

          <Field label="Best months" hint="Optional hard filter">
            <div className="flex flex-wrap gap-2">
              {SEASONS.map((s) => (
                <Chip key={s} active={seasons.includes(s)} onClick={() => toggle(seasons, s, setSeasons)}>
                  {SEASON_LABELS[s]}
                </Chip>
              ))}
            </div>
          </Field>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Field label={`Days: ${days}`}>
              <input type="range" min={1} max={20} value={days} onChange={(e) => setDays(+e.target.value)} className="w-full accent-[var(--brand)]" />
            </Field>
            <Field label={`Travelers: ${travelers}`}>
              <input type="range" min={1} max={10} value={travelers} onChange={(e) => setTravelers(+e.target.value)} className="w-full accent-[var(--brand)]" />
            </Field>
            <Field label="Travel style">
              <select value={style} onChange={(e) => setStyle(e.target.value)} className={selectCls}>
                <option value="shoestring">Shoestring</option>
                <option value="budget">Budget</option>
                <option value="mid">Mid</option>
                <option value="comfort">Comfort</option>
                <option value="luxury">Luxury</option>
              </select>
            </Field>
            <Field label="Max ₹/day (0 = any)">
              <input type="number" min={0} step={500} value={maxBudget} onChange={(e) => setMaxBudget(+e.target.value)} className={selectCls} />
            </Field>
          </div>

          <label className="mt-5 flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={avoidCrowds} onChange={(e) => setAvoidCrowds(e.target.checked)} className="h-4 w-4 accent-[var(--brand)]" />
            Steer me away from the most touristy places
          </label>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
            <p className="text-xs text-muted-foreground">Filters: <b className="text-foreground">hard</b> · scoring ranks survivors · AI fills gaps</p>
            <button type="submit" disabled={mutation.isPending || interests.length === 0} className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition hover:opacity-90 disabled:opacity-50">
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Find my destinations
            </button>
          </div>
        </form>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16">
        {mutation.isError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            Something went wrong. Please try again.
          </div>
        )}
        {results && results.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center">
            <p className="text-foreground font-medium">No curated matches for these filters.</p>
            <p className="mt-1 text-sm text-muted-foreground">Asking AI for real-world picks…</p>
          </div>
        )}
        {results && results.length > 0 && <Results results={results} />}
        {(aiBusy || aiExtra.length > 0) && (
          <div className="mt-10">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <h3 className="font-display text-lg font-bold text-foreground">AI-suggested matches</h3>
              {aiBusy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {aiExtra.map((r) => <AiCard key={r.id} r={r} />)}
            </div>
          </div>
        )}
        {!results && !mutation.isPending && <EmptyHint />}
      </section>
    </div>
  );
}

const selectCls = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="mb-2 flex items-baseline justify-between">
        <label className="text-sm font-semibold text-foreground">{label}</label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${active ? "border-foreground bg-foreground text-background" : "border-border bg-background text-foreground hover:border-foreground/40 hover:bg-secondary"}`}>{children}</button>
  );
}

function EmptyHint() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center text-sm text-muted-foreground">
      Pick what you love and hit <b className="text-foreground">Find my destinations</b>.
    </div>
  );
}

function SmartImg({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [err, setErr] = useState(false);
  if (err) {
    return (
      <div className={`${className} grid place-items-center bg-gradient-to-br from-indigo-100 via-pink-100 to-amber-100 text-foreground/40`}>
        <ImageIcon className="h-8 w-8" />
      </div>
    );
  }
  return <img src={src} alt={alt} className={className} onError={() => setErr(true)} loading="lazy" />;
}

function Results({ results }: { results: DreamResultItem[] }) {
  const navigate = useNavigate();
  const [top, ...restAll] = results;
  const [visible, setVisible] = useState(11);
  const rest = restAll.slice(0, visible);
  const topImg = heroFor(top);

  function pickAndPlan(r: DreamResultItem) {
    patchTrip({ selectedDestination: { id: r.id.startsWith("ai-") ? undefined : r.id, name: r.name, state: r.state } });
    if (r.id.startsWith("ai-")) navigate({ to: "/plan", search: { dest: undefined, name: r.name } as any });
    else navigate({ to: "/plan", search: { dest: r.id, name: r.name } });
  }

  function askAi(r: DreamResultItem) {
    window.dispatchEvent(new CustomEvent("wc:chat:ask", { detail: { prompt: `Tell me about ${r.name}, ${r.state}: famous places, best season, ideal duration, food, and a sample 5-day plan under ₹${(r.per_person_per_day_inr || 4000) * 5} per person.` } }));
  }

  return (
    <div>
      <div className="mb-6 flex items-baseline justify-between">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">Your ranked picks</h2>
        <span className="text-sm text-muted-foreground">{results.length} matches · showing {1 + rest.length}</span>
      </div>

      <article className="mb-8 grid overflow-hidden rounded-2xl border border-border bg-card shadow-card md:grid-cols-[1.2fr_1fr]">
        <div className="relative h-64 md:h-auto">
          <SmartImg src={topImg} alt={top.name} className="h-full w-full object-cover" />
          <span className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1 text-xs font-bold text-background">
            <Star className="h-3 w-3 fill-current" /> Rank #1 {top.ranked ? `· ${Math.round(top.ranked.total_score * 100)}/100` : ""}
          </span>
        </div>
        <div className="p-6 sm:p-8">
          <div className="text-sm font-medium text-muted-foreground">
            <MapPin className="mr-1 inline h-3.5 w-3.5" />{top.state}
          </div>
          <h3 className="mt-1 font-display text-3xl font-bold tracking-tight">{top.name}</h3>
          <p className="mt-1 text-muted-foreground">{top.tagline}</p>
          {top.ranked && (
            <p className="mt-3 rounded-lg border border-border bg-brand-soft p-3 text-sm font-medium text-foreground">✨ {top.ranked.verdict}</p>
          )}
          <ul className="mt-4 space-y-1 text-sm text-foreground/80">
            {(top.reasons || []).map((r) => <li key={r}>· {r}</li>)}
          </ul>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <div>
              <div className="text-xs text-muted-foreground">Estimated trip cost</div>
              <div className="font-display text-2xl font-bold text-foreground">₹{(top.estimated_cost_inr || 0).toLocaleString("en-IN")}</div>
              <div className="text-xs text-muted-foreground">~₹{(top.per_person_per_day_inr || 0).toLocaleString("en-IN")} per person / day</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => askAi(top)} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-secondary">
                <MessageSquare className="h-3.5 w-3.5" /> Ask AI
              </button>
              <button onClick={() => pickAndPlan(top)} className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background hover:opacity-90">
                Plan this trip <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </article>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {rest.map((r) => (
          <div key={r.id} className="overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-0.5 hover:shadow-card">
            <div className="relative h-40">
              <SmartImg src={heroFor(r)} alt={r.name} className="h-full w-full object-cover" />
              {r.ranked && (
                <span className="absolute left-3 top-3 rounded-full bg-background/95 px-2 py-0.5 text-xs font-bold text-foreground">#{r.ranked.rank} · {Math.round(r.ranked.total_score * 100)}/100</span>
              )}
            </div>
            <div className="p-4">
              <div className="flex items-baseline justify-between">
                <h3 className="font-display font-bold text-foreground">{r.name}</h3>
                <span className="text-xs text-muted-foreground">{r.state}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.tagline}</p>
              <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
                <span className="text-sm font-semibold">₹{(r.estimated_cost_inr || 0).toLocaleString("en-IN")}</span>
                <div className="flex gap-1.5">
                  <button onClick={() => askAi(r)} className="rounded-full border border-border px-2 py-1 text-[11px] font-semibold hover:bg-secondary">Ask AI</button>
                  <button onClick={() => pickAndPlan(r)} className="inline-flex items-center gap-1 rounded-full bg-foreground px-2.5 py-1 text-[11px] font-semibold text-background hover:opacity-90">Plan <ArrowRight className="h-3 w-3" /></button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {visible < restAll.length && (
        <div className="mt-6 text-center">
          <button
            onClick={() => setVisible((v) => v + 12)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary"
          >
            Show more ({restAll.length - visible} left)
          </button>
        </div>
      )}
    </div>
  );
}

function AiCard({ r }: { r: DreamResultItem }) {
  const navigate = useNavigate();
  function plan() {
    patchTrip({ selectedDestination: { name: r.name, state: r.state } });
    navigate({ to: "/plan", search: { name: r.name } as any });
  }
  function ask() {
    window.dispatchEvent(new CustomEvent("wc:chat:ask", { detail: { prompt: `Tell me about ${r.name}, ${r.state} — famous places, best season, food, sample plan.` } }));
  }
  return (
    <article className="overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/40 to-white shadow-soft">
      <div className="relative h-36">
        <SmartImg src={fallbackHero(`${r.name} ${r.state}`)} alt={r.name} className="h-full w-full object-cover" />
        <span className="absolute left-3 top-3 rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-bold text-white">AI pick</span>
      </div>
      <div className="p-4">
        <div className="flex items-baseline justify-between">
          <h3 className="font-display font-bold text-foreground">{r.name}</h3>
          <span className="text-xs text-muted-foreground">{r.state}</span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{r.tagline}</p>
        <ul className="mt-2 space-y-0.5 text-xs text-foreground/75">
          {(r.reasons || []).slice(0, 3).map((x, i) => <li key={i}>· {x}</li>)}
        </ul>
        <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
          <span className="text-sm font-semibold">₹{(r.estimated_cost_inr || 0).toLocaleString("en-IN")}</span>
          <div className="flex gap-1.5">
            <button onClick={ask} className="rounded-full border border-indigo-200 px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50">Ask AI</button>
            <button onClick={plan} className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:opacity-90">Plan <ArrowRight className="h-3 w-3" /></button>
          </div>
        </div>
      </div>
    </article>
  );
}
