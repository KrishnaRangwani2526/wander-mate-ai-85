import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Search, Loader2, ArrowRight, AlertTriangle, Lightbulb, Sparkles, Upload, Link as LinkIcon, FileText, ThumbsUp, ThumbsDown, Zap } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { ScoreRadar, CostBars } from "@/components/charts";
import { api } from "@/lib/api";

export const Route = createFileRoute("/analyze")({
  head: () => ({
    meta: [
      { title: "Analyze — Audit any itinerary | WanderCompanion" },
      { name: "description", content: "Paste a URL, PDF or text — Gemini scores it on budget, comfort, exploration and value, and tells you what to swap." },
    ],
  }),
  component: AnalyzePage,
});

type Mode = "text" | "url" | "pdf";

const SAMPLES: { label: string; text: string }[] = [
  { label: "Spiti 5-day", text: "5 day Manali and Spiti trip June, 2 people, budget ₹60000. Day 1 Manali. Day 2 drive Kaza with 4 stops. Day 3 Key monastery, Kibber, Langza, Hikkim. Day 4 rest. Day 5 return." },
  { label: "Kerala 7-day", text: "7 day Kerala Munnar Alleppey Kochi in December, 2 ppl, ₹80000. Day 1 fly Kochi. Day 2 Munnar tea. Day 3 Eravikulam. Day 4 Alleppey houseboat. Day 5 backwaters. Day 6 Kochi fort. Day 7 fly back." },
  { label: "Swiss reel", text: "Zurich → Lucerne → Interlaken → Jungfraujoch 4 days, 2 travelers, mid-range budget. Want lakes, snow, photography." },
];

function AnalyzePage() {
  const [mode, setMode] = useState<Mode>("text");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [pdfName, setPdfName] = useState<string | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function run(payloadText?: string) {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const body: any = {};
      if (mode === "url") body.url = url.trim();
      else if (mode === "pdf") body.pdf_base64 = pdfBase64 ?? "";
      else body.text = (payloadText ?? text).trim();
      if (!body.text && !body.url && !body.pdf_base64) {
        setError("Provide some itinerary text, a URL, or upload a PDF.");
        setBusy(false);
        return;
      }
      const res = await api.analyze(body);
      if (res.error) setError(res.error);
      else setResult(res);
    } catch {
      setError("Unable to reach the local backend. Run: cd backend && uvicorn main:app --port 8000");
    } finally {
      setBusy(false);
    }
  }

  function onPickPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPdfName(f.name);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPdfBase64(result.split(",")[1] ?? null);
    };
    reader.readAsDataURL(f);
  }

  return (
    <div>
      <PageHero
        eyebrow="Step 02 · Analyze"
        icon={<Search className="h-3.5 w-3.5" />}
        title={<>Audit any plan, <span className="text-brand-gradient">in seconds.</span></>}
        description="Paste itinerary text, a blog URL or upload a PDF. Gemini scores it on Budget · Comfort · Exploration · Value, flags pace risk, and shows cheaper swaps."
      />

      <section className="mx-auto max-w-5xl px-4 py-8">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-7">
          <div className="mb-4 flex flex-wrap gap-2">
            {([
              ["text", "Text", <FileText className="h-3.5 w-3.5" key="t" />],
              ["url", "URL", <LinkIcon className="h-3.5 w-3.5" key="u" />],
              ["pdf", "PDF", <Upload className="h-3.5 w-3.5" key="p" />],
            ] as const).map(([m, label, icon]) => (
              <button
                key={m}
                onClick={() => setMode(m as Mode)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${mode === m ? "border-foreground bg-foreground text-background" : "border-border bg-background hover:border-foreground/40"}`}
              >
                {icon}{label}
              </button>
            ))}
          </div>

          {mode === "text" && (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={7}
              placeholder="Paste itinerary text, a reel caption, or describe the trip…"
              className="w-full rounded-xl border border-input bg-background p-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          )}
          {mode === "url" && (
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.30sundays.club/some-trip-blog"
              className="w-full rounded-xl border border-input bg-background p-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          )}
          {mode === "pdf" && (
            <div className="rounded-xl border-2 border-dashed border-border bg-background p-6 text-center">
              <input ref={fileRef} type="file" accept="application/pdf" onChange={onPickPdf} className="hidden" />
              <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background">
                <Upload className="h-3.5 w-3.5" /> Choose PDF
              </button>
              {pdfName && <p className="mt-3 text-xs text-muted-foreground">Picked: <span className="font-mono">{pdfName}</span></p>}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Try:</span>
              {SAMPLES.map((s) => (
                <button
                  key={s.label}
                  onClick={() => { setMode("text"); setText(s.text); run(s.text); }}
                  className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium hover:border-foreground/40"
                >
                  {s.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => run()}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Analyze
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16">
        {error && (
          <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertTriangle className="mr-2 inline h-4 w-4" /> {error}
          </div>
        )}
        {busy && !result && (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center text-sm text-muted-foreground">
            <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin" />
            Gemini is auditing the itinerary…
          </div>
        )}
        {result && <Output r={result} />}
        {!result && !busy && !error && (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center text-sm text-muted-foreground">
            Drop an itinerary above. You'll get scores, pace warnings, cost split, and concrete swaps.
          </div>
        )}
      </section>
    </div>
  );
}

function Output({ r }: { r: any }) {
  const score = r.experience_score ?? { budget_efficiency: 7, comfort: 7, exploration: 7, value_for_money: 7 };
  const cost = r.cost_breakdown ?? { flights_inr: 0, hotels_inr: 0, activities_inr: 0, food_inr: 0, transport_inr: 0, total_inr: 0 };
  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-6">
        {r.vibe_summary && (
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
            <h3 className="mb-2 flex items-center gap-2 font-display text-sm font-bold text-indigo-900">
              <Sparkles className="h-4 w-4 text-indigo-600" /> AI Verdict
              <span className="ml-auto rounded-full bg-indigo-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-900">
                {r.source === "gemini" ? "Gemini" : "Heuristic"}
              </span>
            </h3>
            <p className="text-sm italic leading-relaxed text-indigo-900/85">{r.vibe_summary}</p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-2 font-display text-sm font-bold text-foreground">Experience scorecard</h3>
            <ScoreRadar data={score} />
            <div className="mt-2 grid grid-cols-4 gap-1 text-center text-[11px]">
              {(["budget_efficiency","comfort","exploration","value_for_money"] as const).map((k) => (
                <div key={k}><div className="font-bold text-foreground">{score[k]}/10</div><div className="text-muted-foreground capitalize">{k.replace("_"," ")}</div></div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-2 font-display text-sm font-bold text-foreground">Cost breakdown</h3>
            <CostBars data={cost} />
            <div className="mt-2 text-center text-xs text-muted-foreground">Total <span className="font-bold text-foreground">₹{(cost.total_inr || 0).toLocaleString("en-IN")}</span></div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-bold text-emerald-900">
              <ThumbsUp className="h-4 w-4" /> Pros
            </h3>
            <ul className="space-y-1.5 text-sm text-emerald-900/85">
              {(r.pros || []).map((p: string, i: number) => <li key={i}>· {p}</li>)}
            </ul>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
            <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-bold text-rose-900">
              <ThumbsDown className="h-4 w-4" /> Cons
            </h3>
            <ul className="space-y-1.5 text-sm text-rose-900/85">
              {(r.cons || []).map((p: string, i: number) => <li key={i}>· {p}</li>)}
            </ul>
          </div>
        </div>

        {(r.pace_warnings?.length ?? 0) > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <h3 className="mb-2 flex items-center gap-2 font-display text-sm font-bold text-amber-900">
              <AlertTriangle className="h-4 w-4" /> Pace warnings
            </h3>
            <ul className="space-y-1.5 text-sm text-amber-900/85">
              {r.pace_warnings.map((p: string, i: number) => <li key={i}>· {p}</li>)}
            </ul>
          </div>
        )}
      </div>

      <aside className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Estimated cost</div>
          <div className="mt-1 font-display text-3xl font-bold text-brand-gradient">
            ₹{(cost.total_inr || 0).toLocaleString("en-IN")}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {r.travelers ?? 2} travelers · {r.duration_days ?? "?"} days
          </div>
        </div>

        {(r.optimization_tips?.length ?? 0) > 0 && (
          <div className="rounded-2xl border border-border bg-brand-soft p-5">
            <h3 className="mb-2 flex items-center gap-2 font-display text-sm font-bold text-foreground">
              <Lightbulb className="h-4 w-4 text-brand" /> Optimization tips
            </h3>
            <ul className="space-y-1.5 text-sm text-foreground/85">
              {r.optimization_tips.map((p: string, i: number) => <li key={i}>· {p}</li>)}
            </ul>
          </div>
        )}

        {(r.cheaper_alternatives?.length ?? 0) > 0 && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-2 flex items-center gap-2 font-display text-sm font-bold text-foreground">
              <Zap className="h-4 w-4 text-amber-500" /> Cheaper swaps
            </h3>
            <ul className="space-y-1.5 text-sm text-foreground/85">
              {r.cheaper_alternatives.map((p: string, i: number) => <li key={i}>· {p}</li>)}
            </ul>
          </div>
        )}

        {(r.destinations?.length ?? 0) > 0 && (
          <Link to="/plan" search={{} as any} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-semibold text-background hover:opacity-90">
            Build a better plan <ArrowRight className="h-4 w-4" />
          </Link>

        )}
      </aside>
    </div>
  );
}
