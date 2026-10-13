import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Compass, MapPin, Search, Sparkles } from "lucide-react";

import heroTaj from "@/assets/hero-taj.jpg";
import heroLadakh from "@/assets/hero-ladakh.jpg";
import destManali from "@/assets/dest-manali.jpg";
import destGoa from "@/assets/dest-goa.jpg";
import destRishikesh from "@/assets/dest-rishikesh.jpg";
import destJaisalmer from "@/assets/dest-jaisalmer.jpg";
import destVaranasi from "@/assets/dest-varanasi.jpg";
import destUdaipur from "@/assets/dest-udaipur.jpg";
import { SavedTripsChip } from "@/components/SavedTripsChip";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "WanderCompanion — Plan your India trip, simply" },
      {
        name: "description",
        content:
          "Find a destination, build a day-by-day plan that fits your budget, and book — all in one calm place.",
      },
      { property: "og:title", content: "WanderCompanion — Plan your India trip, simply" },
      {
        property: "og:description",
        content: "Find a destination, build a day-by-day plan that fits your budget, and book.",
      },
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
  {
    to: "/dream",
    title: "Find where to go",
    text: "Pick your interests, season and budget. We shortlist places that fit.",
  },
  {
    to: "/plan",
    title: "Shape the days",
    text: "Get a day-by-day plan with costs that add up, then drag stops around.",
  },
  {
    to: "/book",
    title: "Book it",
    text: "Jump straight to IRCTC, RedBus and flight sites with your route filled in.",
  },
] as const;

function Hero() {
  const [q, setQ] = useState("");
  return (
    <section className="relative isolate overflow-hidden bg-foreground">
      <img
        src={heroTaj}
        alt=""
        className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/70 via-black/40 to-black/10" />
      <div className="mx-auto flex min-h-[72vh] max-w-6xl flex-col justify-center px-5 pb-12 pt-14 text-white md:min-h-[76vh] md:pb-16">
        <p className="inline-flex w-fit items-center gap-2 rounded-full border border-white/25 bg-black/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/90 backdrop-blur-sm">
          <Compass className="h-3.5 w-3.5" />
          India, planned with care
        </p>
        <h1 className="font-display mt-5 max-w-3xl text-[2.8rem] font-normal leading-[1.04] tracking-tight md:text-[4.5rem]">
          Trips that feel like you planned them with a <em>friend</em>.
        </h1>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/85 sm:text-base">
          Find your place, make the days yours, and travel at your pace.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!q.trim()) return;
            window.dispatchEvent(new CustomEvent("wc:chat:ask", { detail: { prompt: q.trim() } }));
          }}
          className="mt-7 flex max-w-2xl items-center gap-2 rounded-2xl border border-white/50 bg-background p-1.5 text-foreground shadow-2xl shadow-black/20 sm:rounded-full"
        >
          <Search className="ml-3 h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Where would you love to go?"
            aria-label="Ask for a travel idea"
            className="min-w-0 flex-1 bg-transparent px-1 py-3 text-sm outline-none placeholder:text-muted-foreground sm:py-3.5"
          />
          <button className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background transition hover:bg-foreground/90 sm:rounded-full sm:px-5">
            <Sparkles className="h-4 w-4" />
            Ask AI
          </button>
        </form>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/90">
          {["Plans for your budget", "Day-by-day ideas", "Places worth the detour"].map((label) => (
            <span
              key={label}
              className="rounded-full border border-white/20 bg-black/20 px-3 py-1.5 backdrop-blur-sm"
            >
              {label}
            </span>
          ))}
        </div>
        <Link
          to="/dream"
          className="mt-5 inline-flex w-fit items-center gap-1.5 text-sm font-medium text-white underline-offset-4 hover:underline"
        >
          Explore by mood and season <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

function Places() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-14 md:py-20">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-primary">A little inspiration</p>
          <h2 className="font-display mt-1.5 text-3xl md:text-4xl">Find your kind of somewhere</h2>
        </div>
        <Link
          to="/sightsee"
          className="mb-1 inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-secondary sm:px-4 sm:text-sm"
        >
          All places <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="-mx-5 mt-7 flex snap-x gap-4 overflow-x-auto px-5 pb-3 md:mx-0 md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:px-0">
        {PLACES.map((p) => (
          <Link
            key={p.name}
            to="/sightsee"
            className="group w-[72%] shrink-0 snap-start sm:w-[42%] md:w-auto"
          >
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-secondary shadow-soft">
              <img
                src={p.img}
                alt={p.name}
                loading="lazy"
                className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-4 text-white">
                <div>
                  <span className="flex items-center gap-1 text-[11px] font-medium text-white/80">
                    <MapPin className="h-3 w-3" /> {p.note}
                  </span>
                  <span className="font-display mt-1 block text-2xl">{p.name}</span>
                </div>
                <span className="mb-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/40 bg-white/15 transition group-hover:bg-white group-hover:text-foreground">
                  <ArrowRight className="h-4 w-4 -rotate-45 transition group-hover:rotate-0" />
                </span>
              </div>
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
          <h2 className="font-display mt-1.5 text-3xl md:text-4xl">
            From idea to <em>ticket</em> in three steps
          </h2>
          <img
            src={heroLadakh}
            alt="Road through Ladakh"
            loading="lazy"
            className="mt-6 hidden aspect-[4/3] w-full rounded-xl object-cover md:block"
          />
        </div>
        <ol className="divide-y divide-border">
          {STEPS.map((s, i) => (
            <li key={s.to}>
              <Link to={s.to} className="group flex gap-5 py-6 transition-colors hover:bg-white/40">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-background font-display text-xl font-normal italic text-primary shadow-soft">
                  {i + 1}
                </span>
                <span className="flex-1">
                  <span className="block text-lg font-medium">{s.title}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                    {s.text}
                  </span>
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
      <h2 className="font-display mx-auto max-w-xl text-3xl md:text-4xl">
        See how other <em>travellers</em> do it
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
        Follow local creators, read honest reviews of hotels and cafés, and copy a plan you like.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link
          to="/social"
          className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background"
        >
          Open the feed
        </Link>
        <Link
          to="/vendors"
          className="rounded-full border border-border px-5 py-2.5 text-sm font-medium"
        >
          Browse places to stay
        </Link>
      </div>
    </section>
  );
}

function LandingPage() {
  return (
    <div>
      <Hero />
      <SavedTripsChip />
      <Places />
      <Steps />
      <Closing />
    </div>
  );
}
