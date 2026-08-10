import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { DESTINATIONS, INTEREST_LABELS } from "@/data/destinations";
import { Camera, Search, ArrowRight } from "lucide-react";
import { PageHero } from "@/components/PageHero";

export const Route = createFileRoute("/sightsee")({
  head: () => ({
    meta: [
      { title: "Sightsee — A scenic gallery of India | WanderCompanion" },
      { name: "description", content: "A curated photo gallery of every destination on your list." },
      { property: "og:title", content: "Sightsee — A scenic gallery of India" },
      { property: "og:description", content: "Visual inspiration before you go." },
    ],
  }),
  component: SightseePage,
});

function SightseePage() {
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<"all" | "india" | "world">("all");
  const [interest, setInterest] = useState<string>("all");
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return DESTINATIONS.filter((d) => {
      if (scope === "india" && d.region === "international") return false;
      if (scope === "world" && d.region !== "international") return false;
      if (interest !== "all" && !d.interests.includes(interest as never)) return false;
      if (!term) return true;
      return (
        d.name.toLowerCase().includes(term) ||
        d.state.toLowerCase().includes(term) ||
        d.tagline.toLowerCase().includes(term)
      );
    });
  }, [q, scope, interest]);

  return (
    <div>
      <PageHero
        eyebrow="Step 05 · Sightsee"
        icon={<Camera className="h-3.5 w-3.5" />}
        title={<>A scenic India, <span className="text-brand-gradient">in a single scroll.</span></>}
        description="Visual previews of every destination in our engine. Pick a vibe to spark your next trip."
      />

      <section className="mx-auto max-w-5xl px-4 py-6">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search destinations, states, vibes…"
            className="w-full rounded-full border border-border bg-card py-3 pl-10 pr-4 text-sm shadow-soft focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["all", "india", "world"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={`rounded-full border px-3 py-1 text-xs capitalize transition ${scope === s ? "border-brand bg-brand/10 text-brand" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}
            >
              {s === "all" ? "Everywhere" : s === "india" ? "India" : "International"}
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {["all", ...Object.keys(INTEREST_LABELS)].map((i) => (
            <button
              key={i}
              onClick={() => setInterest(i)}
              className={`rounded-full border px-3 py-1 text-xs transition ${interest === i ? "border-brand bg-brand/10 text-brand" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}
            >
              {i === "all" ? "All vibes" : INTEREST_LABELS[i as keyof typeof INTEREST_LABELS]}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{filtered.length} destinations</p>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 pb-16">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((d) => (
            <Link
              key={d.id}
              to="/plan"
              search={{ dest: d.id, name: d.name }}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition hover:-translate-y-0.5 hover:shadow-card"
            >
              <div className="relative aspect-[4/5] overflow-hidden">
                <img
                  src={d.hero_image}
                  alt={d.name}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent" />
              </div>
              <figcaption className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2 rounded-xl border border-white/30 bg-white/85 px-3 py-2 backdrop-blur">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-foreground">{d.name}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{d.state}</div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-foreground/70 transition group-hover:translate-x-0.5 group-hover:text-brand" />
              </figcaption>
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center text-sm text-muted-foreground">
            No destinations match that search. Try a different term.
          </div>
        )}
      </section>
    </div>
  );
}
