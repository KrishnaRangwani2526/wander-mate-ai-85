import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Sparkles, ScanSearch, CalendarDays, SlidersHorizontal,
  Image as ImageIcon, Plane, MapPinned, ArrowRight, Search,
  Mountain, Waves, Landmark, Utensils, Star,
} from "lucide-react";

import heroTaj from "@/assets/hero-taj.jpg";
import heroKerala from "@/assets/hero-kerala.jpg";
import heroLadakh from "@/assets/hero-ladakh.jpg";
import heroJaipur from "@/assets/hero-jaipur.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "WanderCompanion — Your complete India travel guide" },
      {
        name: "description",
        content:
          "Dream, analyze, plan, optimize, sightsee, book and travel — seven smart tools to design unforgettable Indian trips.",
      },
    ],
  }),
  component: LandingPage,
});

const HERO_SLIDES = [
  { img: heroTaj,    title: "Wander where stories begin",     sub: "Forts, ghats and palaces — India's living history at your pace.",      tag: "Agra · Uttar Pradesh" },
  { img: heroKerala, title: "Drift through the backwaters",   sub: "Houseboats, palm-lined canals and slow Kerala sunsets.",               tag: "Alleppey · Kerala" },
  { img: heroLadakh, title: "Breathe in the high Himalayas",  sub: "Monasteries, prayer flags and roads that touch the clouds.",          tag: "Leh · Ladakh" },
  { img: heroJaipur, title: "Find magic in the Pink City",    sub: "Royal courtyards, bazaars and Rajasthani warmth.",                     tag: "Jaipur · Rajasthan" },
];

const TOOLS = [
  { to: "/dream",    label: "Dream",    icon: Sparkles,         tint: "from-fuchsia-500 to-pink-500",   blurb: "Discover by mood, season and budget." },
  { to: "/analyze",  label: "Analyze",  icon: ScanSearch,       tint: "from-amber-500 to-orange-600",   blurb: "Paste any URL, PDF or reel — get insights." },
  { to: "/plan",     label: "Plan",     icon: CalendarDays,     tint: "from-sky-500 to-indigo-600",     blurb: "Day-by-day itinerary in 3 variants." },
  { to: "/optimize", label: "Optimize", icon: SlidersHorizontal,tint: "from-emerald-500 to-teal-600",   blurb: "Tune for budget, days & must-sees." },
  { to: "/sightsee", label: "Sightsee", icon: ImageIcon,        tint: "from-rose-500 to-red-600",       blurb: "Curated galleries of every destination." },
  { to: "/book",     label: "Book",     icon: Plane,            tint: "from-violet-500 to-purple-700",  blurb: "Flights, trains & hotels — one place." },
  { to: "/travel",   label: "Travel",   icon: MapPinned,        tint: "from-cyan-500 to-blue-600",      blurb: "Live route, viewpoints & nearby pings." },
] as const;

import destManali from "@/assets/dest-manali.jpg";
import destGoa from "@/assets/dest-goa.jpg";
import destRishikesh from "@/assets/dest-rishikesh.jpg";
import destJaisalmer from "@/assets/dest-jaisalmer.jpg";
import destVaranasi from "@/assets/dest-varanasi.jpg";
import destUdaipur from "@/assets/dest-udaipur.jpg";

const TRENDING = [
  { id: "manali",    name: "Manali",    state: "Himachal Pradesh", img: destManali,    tag: "Mountains" },
  { id: "goa",       name: "Goa",       state: "Goa",              img: destGoa,       tag: "Beach" },
  { id: "jaipur",    name: "Jaipur",    state: "Rajasthan",        img: heroJaipur,    tag: "Heritage" },
  { id: "leh",       name: "Leh",       state: "Ladakh",           img: heroLadakh,    tag: "Adventure" },
  { id: "rishikesh", name: "Rishikesh", state: "Uttarakhand",      img: destRishikesh, tag: "Spiritual" },
  { id: "udaipur",   name: "Udaipur",   state: "Rajasthan",        img: destUdaipur,   tag: "Lakes" },
  { id: "varanasi",  name: "Varanasi",  state: "Uttar Pradesh",    img: destVaranasi,  tag: "Spiritual" },
  { id: "jaisalmer", name: "Jaisalmer", state: "Rajasthan",        img: destJaisalmer, tag: "Desert" },
];

const INTERESTS = [
  { label: "Mountains", icon: Mountain, color: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
  { label: "Beaches",   icon: Waves,    color: "bg-sky-50 text-sky-700 ring-sky-200" },
  { label: "Heritage",  icon: Landmark, color: "bg-amber-50 text-amber-700 ring-amber-200" },
  { label: "Food",      icon: Utensils, color: "bg-rose-50 text-rose-700 ring-rose-200" },
];

function HeroCarousel() {
  const [i, setI] = useState(0);
  const [query, setQuery] = useState("");
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % HERO_SLIDES.length), 5200);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="relative h-[78vh] min-h-[520px] w-full overflow-hidden">
      {HERO_SLIDES.map((s, idx) => (
        <div
          key={s.img}
          className="absolute inset-0 transition-opacity duration-1000 ease-out"
          style={{ opacity: idx === i ? 1 : 0 }}
        >
          <img 
            src={s.img} 
            alt={s.title} 
            loading={idx === 0 ? "eager" : "lazy"}
            className="h-full w-full object-cover animate-[kenburns_18s_ease-in-out_infinite_alternate]" 
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/70" />
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-900/40 via-transparent to-orange-500/30" />
        </div>
      ))}

      <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-end px-5 pb-12 sm:pb-20 text-white">
        <span className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider backdrop-blur">
          <Star className="h-3 w-3 fill-yellow-300 text-yellow-300" /> {HERO_SLIDES[i].tag}
        </span>
        <h1 className="font-display max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl drop-shadow-lg">
          {HERO_SLIDES[i].title}
        </h1>
        <p className="mt-4 max-w-xl text-base text-white/90 sm:text-lg">{HERO_SLIDES[i].sub}</p>

        {/* Search bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const prompt = query.trim();
            if (!prompt) return;
            window.dispatchEvent(new CustomEvent("wc:chat:ask", { detail: { prompt } }));
          }}
          className="mt-7 flex w-full max-w-2xl items-center gap-2 rounded-full bg-white p-1.5 shadow-2xl ring-1 ring-black/5"
        >
          <Search className="ml-3 h-5 w-5 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Where do you dream of going? e.g. Manali in December"
            className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground sm:text-base"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-500 to-pink-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:opacity-95 sm:px-5"
          >
            Ask AI <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        {/* Interest chips */}
        <div className="mt-5 flex flex-wrap gap-2">
          {INTERESTS.map((c) => (
            <Link
              key={c.label}
              to="/dream"
              className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-foreground shadow ring-1 ring-black/5 transition hover:scale-105"
            >
              <c.icon className="h-3.5 w-3.5" /> {c.label}
            </Link>
          ))}
        </div>

        {/* slide dots */}
        <div className="mt-8 flex gap-1.5">
          {HERO_SLIDES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setI(idx)}
              aria-label={`slide ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all ${idx === i ? "w-8 bg-white" : "w-3 bg-white/50"}`}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes kenburns {
          from { transform: scale(1) translate(0,0); }
          to   { transform: scale(1.12) translate(-1%, -1.5%); }
        }
      `}</style>
    </div>
  );
}

function ToolsGrid() {
  return (
    <section className="relative -mt-12 sm:-mt-16 px-4">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-3xl bg-white p-3 shadow-2xl ring-1 ring-black/5 sm:p-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {TOOLS.map((t) => (
              <Link
                key={t.to}
                to={t.to}
                className="group relative flex flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl p-3 text-center transition hover:-translate-y-0.5"
              >
                <span className={`relative grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${t.tint} text-white shadow-lg`}>
                  <t.icon className="h-6 w-6" strokeWidth={2.25} />
                </span>
                <span className="text-[13px] font-bold tracking-tight text-foreground">{t.label}</span>
                <span className="hidden text-[11px] leading-tight text-muted-foreground sm:block">{t.blurb}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FlightTicker() {
  const rows = [
    { route: "DEL → GOI", carrier: "IndiGo",  price: "₹5,500", time: "2h 35m" },
    { route: "BLR → IXL", carrier: "Vistara", price: "₹9,800", time: "4h 10m" },
    { route: "BOM → JAI", carrier: "Akasa",   price: "₹3,200", time: "1h 45m" },
    { route: "CCU → MAA", carrier: "Air India", price: "₹4,150", time: "2h 25m" },
    { route: "DEL → SXR", carrier: "SpiceJet", price: "₹4,600", time: "1h 30m" },
    { route: "HYD → COK", carrier: "IndiGo",  price: "₹3,900", time: "1h 35m" },
  ];
  const doubled = [...rows, ...rows];
  return (
    <section className="border-y border-border bg-gradient-to-r from-sky-50 via-indigo-50 to-rose-50 py-3">
      <div className="mask-fade-x overflow-hidden">
        <div className="flex animate-marquee gap-8 whitespace-nowrap text-[13px]">
          {doubled.map((r, i) => (
            <span key={i} className="flex items-center gap-2 font-medium text-foreground/80">
              <Plane className="h-3.5 w-3.5 text-indigo-600" />
              <b>{r.route}</b>
              <span className="text-muted-foreground">· {r.carrier}</span>
              <span className="text-emerald-700 font-semibold">{r.price}</span>
              <span className="text-muted-foreground">· {r.time}</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Trending() {
  return (
    <section className="px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-orange-600">Trending destinations</p>
            <h2 className="font-display mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Where India is going this season</h2>
          </div>
          <Link to="/sightsee" className="text-sm font-semibold text-indigo-600 hover:underline">
            See all galleries →
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {TRENDING.map((d) => (
            <Link
              key={d.id}
              to="/sightsee"
              className="group relative block aspect-[3/4] overflow-hidden rounded-2xl shadow-card"
            >
              <img src={d.img} alt={d.name} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <span className="absolute top-3 left-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground">
                {d.tag}
              </span>
              <div className="absolute bottom-3 left-3 right-3 text-white">
                <div className="font-display text-xl font-bold leading-tight">{d.name}</div>
                <div className="text-xs text-white/80">{d.state}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: "01", title: "Dream it",  text: "Tell us your mood, season and budget — we surface ranked destinations.", color: "from-fuchsia-500 to-pink-500" },
    { n: "02", title: "Plan it",   text: "Get three day-by-day itineraries you can tune for pace and price.",     color: "from-sky-500 to-indigo-600" },
    { n: "03", title: "Travel it", text: "One-tap booking links + live route map with viewpoints en route.",      color: "from-emerald-500 to-teal-600" },
  ];
  return (
    <section className="bg-gradient-to-b from-white to-secondary/40 px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">How it works</p>
        <h2 className="font-display mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Three steps from idea to itinerary</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="relative overflow-hidden rounded-3xl bg-white p-7 shadow-card ring-1 ring-black/5">
              <div className={`absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br ${s.color} opacity-20 blur-2xl`} />
              <div className={`inline-flex rounded-full bg-gradient-to-r ${s.color} bg-clip-text text-4xl font-black text-transparent`}>{s.n}</div>
              <h3 className="font-display mt-3 text-2xl font-bold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureGrid() {
  return (
    <section className="px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-bold uppercase tracking-wider text-rose-600">Why WanderCompanion</p>
        <h2 className="font-display mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Seven smart tools, zero noise</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              className="group relative overflow-hidden rounded-2xl border border-border bg-white p-6 transition hover:shadow-card"
            >
              <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${t.tint} text-white shadow`}>
                <t.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-xl font-bold">{t.label}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{t.blurb}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 opacity-0 transition group-hover:opacity-100">
                Open {t.label} <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="relative overflow-hidden px-4 pb-20">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-pink-600 px-8 py-14 text-center text-white shadow-2xl sm:px-12 sm:py-20">
        <h2 className="font-display text-3xl font-extrabold leading-tight sm:text-5xl">
          Your next trip is one dream away.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-white/90">
          Free, offline-friendly, and built for travelers — not algorithms.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link to="/dream" className="rounded-full bg-white px-6 py-3 text-sm font-bold text-indigo-700 shadow-lg hover:scale-105 transition">
            Start dreaming
          </Link>
          <Link to="/analyze" className="rounded-full bg-white/15 px-6 py-3 text-sm font-bold text-white ring-1 ring-white/30 backdrop-blur hover:bg-white/25 transition">
            Analyze an itinerary
          </Link>
        </div>
      </div>
    </section>
  );
}

function LandingPage() {
  return (
    <div className="bg-background">
      <HeroCarousel />
      <ToolsGrid />
      <FlightTicker />
      <Trending />
      <HowItWorks />
      <FeatureGrid />
      <FinalCTA />
    </div>
  );
}
