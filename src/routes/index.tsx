import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Search } from "lucide-react";

import heroTaj from "@/assets/hero-taj.jpg";
import heroLadakh from "@/assets/hero-ladakh.jpg";
import destManali from "@/assets/dest-manali.jpg";
import destGoa from "@/assets/dest-goa.jpg";
import destRishikesh from "@/assets/dest-rishikesh.jpg";
import destJaisalmer from "@/assets/dest-jaisalmer.jpg";
import destVaranasi from "@/assets/dest-varanasi.jpg";
import destUdaipur from "@/assets/dest-udaipur.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "WanderCompanion — Plan your India trip, simply" },
      { name: "description", content: "Find a destination, build a day-by-day plan that fits your budget, and book — all in one calm place." },
      { property: "og:title", content: "WanderCompanion — Plan your India trip, simply" },
      { property: "og:description", content: "Find a destination, build a day-by-day plan that fits your budget, and book." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

const PLACES = [
  { name: "Udaipur", note: "Lakes & palaces", img: destUdaipur },
  { name: "Manali", note: "Mountains", img: destManali },
  { name: "Goa", note: "Beaches", img: destGoa },
  { name: "Rishikesh", note: "Rivers & yoga", img: destRishikesh },
  { name: "Jaisalmer", note: "Desert forts", img: destJaisalmer },
  { name: "Varanasi", note: "Ghats at dawn", img: destVaranasi },
];

const STEPS = [
  { to: "/dream", title: "Find where to go", text: "Pick your interests, season and budget. We shortlist places that fit." },
  { to: "/plan", title: "Shape the days", text: "Get a day-by-day plan with costs that add up, then drag stops around." },
  { to: "/book", title: "Book it", text: "Jump straight to IRCTC, RedBus and flight sites with your route filled in." },
] as const;

function Hero() {
  const [q, setQ] = useState("");
  return (
    <section className="relative isolate overflow-hidden">
      <img src={heroTaj} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" />
      <div className="absolute inset-0 -z-10 bg-black/45" />
      <div className="mx-auto flex min-h-[78vh] max-w-6xl flex-col justify-end px-5 pb-12 pt-24 text-white md:min-h-[85vh] md:pb-20">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">India, planned with care</p>
        <h1 className="font-display mt-3 max-w-2xl text-[2.6rem] font-normal leading-[1.06] md:text-[3.75rem]">
          Trips that feel like you planned them with a <em>friend</em>.
        </h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!q.trim()) return;
            window.dispatchEvent(new CustomEvent("wc:chat:ask", { detail: { prompt: q.trim() } }));
          }}
          className="mt-8 flex max-w-xl items-center gap-2 rounded-full bg-background p-1.5 text-foreground"
        >
          <Search className="ml-3 h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Try “4 days in Udaipur under ₹30,000”"
            className="min-w-0 flex-1 bg-transparent px-1 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          <button className="rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background">Ask</button>
        </form>
        <Link to="/dream" className="mt-5 inline-flex w-fit items-center gap-1.5 text-sm text-white/90 underline-offset-4 hover:underline">
          Or browse by mood and season <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

function Places() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-14 md:py-20">
      <div className="flex items-end justify-between">
        <div>
          <p className="eyebrow text-muted-foreground">Where to go</p>
          <h2 className="font-display mt-1.5 text-3xl md:text-4xl">Popular right now</h2>
        </div>
        <Link to="/sightsee" className="pb-1 text-sm text-muted-foreground hover:text-foreground">See all</Link>
      </div>
      <div className="-mx-5 mt-6 flex snap-x gap-3 overflow-x-auto px-5 pb-2 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0">
        {PLACES.map((p) => (
          <Link key={p.name} to="/sightsee" className="group w-[62%] shrink-0 snap-start sm:w-[40%] md:w-auto">
            <div className="aspect-[4/5] overflow-hidden rounded-xl">
              <img src={p.img} alt={p.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
            </div>
            <div className="mt-2.5 flex items-baseline justify-between">
              <span className="font-display text-lg">{p.name}</span>
              <span className="text-xs text-muted-foreground">{p.note}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function Steps() {
  return (
    <section className="border-y border-border bg-secondary/60">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1fr_1.4fr] md:py-20">
        <div>
          <p className="eyebrow text-muted-foreground">How it works</p>
          <h2 className="font-display mt-1.5 text-3xl md:text-4xl">From idea to <em>ticket</em> in three steps</h2>
          <img src={heroLadakh} alt="Road through Ladakh" loading="lazy" className="mt-6 hidden aspect-[4/3] w-full rounded-xl object-cover md:block" />
        </div>
        <ol className="divide-y divide-border">
          {STEPS.map((s, i) => (
            <li key={s.to}>
              <Link to={s.to} className="group flex gap-5 py-6">
                <span className="font-display text-2xl font-normal italic text-primary">{i + 1}</span>
                <span className="flex-1">
                  <span className="block text-lg font-medium">{s.title}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{s.text}</span>
                </span>
                <ArrowRight className="mt-1 h-4 w-4 text-muted-foreground transition group-hover:translate-x-1" />
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Closing() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 text-center md:py-24">
      <h2 className="font-display mx-auto max-w-xl text-3xl md:text-4xl">See how other <em>travellers</em> do it</h2>
      <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
        Follow local creators, read honest reviews of hotels and cafés, and copy a plan you like.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link to="/social" className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background">Open the feed</Link>
        <Link to="/vendors" className="rounded-full border border-border px-5 py-2.5 text-sm font-medium">Browse places to stay</Link>
      </div>
    </section>
  );
}

function LandingPage() {
  return (
    <div>
      <Hero />
      <Places />
      <Steps />
      <Closing />
    </div>
  );
}
