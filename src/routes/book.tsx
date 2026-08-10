import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plane, Train, Bus, Hotel, ExternalLink, Save, User, Check, Star, Sparkles, Loader2, Calendar, TrendingDown, MapPin, Plus, X as XIcon, ArrowRight } from "lucide-react";
import { DESTINATIONS } from "@/data/destinations";
import { api } from "@/lib/api";
import { PageHero } from "@/components/PageHero";
import { FlexPriceLine } from "@/components/charts";
import { useTrip } from "@/lib/tripStore";

const PROFILE_KEY = "wc.travelerProfile";

// Common Indian origin cities → IATA
const ORIGIN_CITIES: { code: string; label: string }[] = [
  { code: "DEL", label: "Delhi (DEL)" },
  { code: "BOM", label: "Mumbai (BOM)" },
  { code: "BLR", label: "Bangalore (BLR)" },
  { code: "MAA", label: "Chennai (MAA)" },
  { code: "CCU", label: "Kolkata (CCU)" },
  { code: "HYD", label: "Hyderabad (HYD)" },
  { code: "PNQ", label: "Pune (PNQ)" },
  { code: "AMD", label: "Ahmedabad (AMD)" },
  { code: "COK", label: "Kochi (COK)" },
  { code: "JAI", label: "Jaipur (JAI)" },
  { code: "LKO", label: "Lucknow (LKO)" },
  { code: "IXC", label: "Chandigarh (IXC)" },
  { code: "GAU", label: "Guwahati (GAU)" },
  { code: "BBI", label: "Bhubaneswar (BBI)" },
];

const IATA_TO_CITY_NAME: Record<string, string> = {
  DEL: "delhi", BOM: "mumbai", BLR: "bangalore", MAA: "chennai", CCU: "kolkata",
  HYD: "hyderabad", PNQ: "pune", AMD: "ahmedabad", COK: "kochi", JAI: "jaipur",
  LKO: "lucknow", IXC: "chandigarh", GAU: "guwahati", BBI: "bhubaneswar",
  GOI: "goa", ATQ: "amritsar", CDG: "chandigarh", IXL: "leh", SXR: "srinagar",
  VNS: "varanasi", AGR: "agra", UDR: "udaipur", JSA: "jaisalmer", DED: "dehradun",
  TVC: "trivandrum",
};

type Tab = "flights" | "trains" | "buses" | "hotels";

interface FlightOption {
  id: string;
  airline: string;
  from: string;
  to: string;
  depart: string;
  arrive: string;
  stops: number;
  duration_min: number;
  class: "Economy" | "Premium Eco" | "Business";
  price_inr: number;
  baggage: string;
  refundable: boolean;
  external_url: string;
}

interface TrainOption {
  id: string;
  train_no: string;
  name: string;
  from: string;
  to: string;
  depart: string;
  arrive: string;
  duration_min: number;
  class: "SL" | "3A" | "2A" | "1A";
  price_inr: number;
  availability: string;
  external_url: string;
}

interface BusOption {
  id: string;
  operator: string;
  from: string;
  to: string;
  depart: string;
  arrive: string;
  duration_min: number;
  bus_type: string;
  price_inr: number;
  rating: number;
  external_url: string;
}

interface HotelOption {
  id: string;
  name: string;
  area: string;
  stars: 2 | 3 | 4 | 5;
  rating: number;
  price_per_night_inr: number;
  amenities: string[];
  refundable: boolean;
  external_url: string;
}

interface TravelerProfile {
  full_name: string;
  email: string;
  phone: string;
  gov_id: string;
  origin_city: string;
  meal_pref: "veg" | "non-veg" | "vegan";
  seat_pref: "window" | "aisle" | "no-pref";
}

const DEFAULT_PROFILE: TravelerProfile = {
  full_name: "", email: "", phone: "", gov_id: "",
  origin_city: "Delhi", meal_pref: "veg", seat_pref: "window",
};

export const Route = createFileRoute("/book")({
  head: () => ({
    meta: [
      { title: "Book — One-click flights, trains, hotels | WanderCompanion" },
      { name: "description", content: "Save your profile once, compare flights, trains and hotels, then book on the official site in one tap." },
    ],
  }),
  component: BookPage,
});

const inp = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

function BookPage() {
  const [trip] = useTrip();
  const [origin, setOrigin] = useState<string>("DEL");
  const [destId, setDestId] = useState(DESTINATIONS[0].id);
  const [travelers, setTravelers] = useState(2);
  const [nights, setNights] = useState(4);
  const [tab, setTab] = useState<Tab>("flights");
  const [profile, setProfile] = useState<TravelerProfile>(DEFAULT_PROFILE);
  const [saved, setSaved] = useState(false);
  // Seed destination from Dream/Plan selection when present
  useEffect(() => {
    const sel = trip.selectedDestination?.id;
    if (sel && DESTINATIONS.some((d) => d.id === sel)) setDestId(sel);
  }, [trip.selectedDestination?.id]);

  const [flights, setFlights] = useState<FlightOption[]>([]);
  const [trains, setTrains] = useState<TrainOption[]>([]);
  const [hotels, setHotels] = useState<HotelOption[]>([]);
  const [buses, setBuses] = useState<BusOption[]>([]);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(PROFILE_KEY) : null;
      if (raw) setProfile({ ...DEFAULT_PROFILE, ...JSON.parse(raw) });
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    // Load booking options from backend
    api.book({ destination_id: destId, travelers, nights, origin, origin_city: IATA_TO_CITY_NAME[origin] ?? "delhi" })
      .then((data: any) => {
        setFlights(data.flights || []);
        setTrains(data.trains || []);
        setHotels(data.hotels || []);
        setBuses(data.buses || []);
      })
      .catch(() => {
        setFlights([]);
        setTrains([]);
        setHotels([]);
        setBuses([]);
      });
  }, [destId, travelers, nights, origin]);

  function saveProfile() {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  const dest = DESTINATIONS.find((d) => d.id === destId)!;

  return (
    <div>
      <PageHero
        eyebrow="Step 06 · Book"
        icon={<Plane className="h-3.5 w-3.5" />}
        title={<>Save once. <span className="text-brand-gradient">Book in one tap.</span></>}
        description="One profile drives flight, train and hotel checkouts. Compare side-by-side, then jump to the official site."
      />

      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-7">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Origin">
                <select value={origin} onChange={(e) => setOrigin(e.target.value)} className={inp}>
                  {ORIGIN_CITIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                </select>
              </Field>
              <Field label="Destination">
                <select value={destId} onChange={(e) => setDestId(e.target.value)} className={inp}>
                  {DESTINATIONS.map((d) => <option key={d.id} value={d.id}>{d.name}, {d.state}</option>)}
                </select>
              </Field>
              <Field label={`Travelers: ${travelers}`}>
                <input type="range" min={1} max={8} value={travelers} onChange={(e) => setTravelers(+e.target.value)} className="w-full accent-[var(--brand)]" />
              </Field>
              <Field label={`Nights: ${nights}`}>
                <input type="range" min={1} max={20} value={nights} onChange={(e) => setNights(+e.target.value)} className="w-full accent-[var(--brand)]" />
              </Field>
            </div>
            <div className="mt-5 flex gap-2 border-b border-border">
              {([
                { k: "flights", l: "Flights", I: Plane, n: flights.length },
                { k: "trains", l: "Trains", I: Train, n: trains.length },
                { k: "buses", l: "Buses", I: Bus, n: buses.length },
                { k: "hotels", l: "Hotels", I: Hotel, n: hotels.length },
              ] as const).map((t) => (
                <button
                  key={t.k}
                  onClick={() => setTab(t.k)}
                  className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-semibold transition ${
                    tab === t.k ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <t.I className="h-4 w-4" /> {t.l} <span className="text-xs opacity-60">({t.n})</span>
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-3">
              {tab === "flights" && flights.map((f, i) => <FlightRow key={f.id} f={f} best={i === 0} />)}
              {tab === "trains" && (trains.length ? trains.map((t, i) => <TrainRow key={t.id} t={t} best={i === 0} />) : <Empty msg="No rail link from Delhi for this destination." />)}
              {tab === "buses" && (buses.length ? buses.map((b, i) => <BusRow key={b.id} b={b} best={i === 0} />) : <Empty msg="No practical bus route for this distance — try flights or trains." />)}
              {tab === "hotels" && hotels.map((h, i) => <HotelRow key={h.id} h={h} nights={nights} best={i === 0} />)}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <h3 className="flex items-center gap-2 font-display font-bold text-foreground"><User className="h-4 w-4" /> Your profile</h3>
              <p className="text-xs text-muted-foreground">Stored locally in your browser. Never sent anywhere.</p>
              <div className="mt-3 grid gap-3">
                <input className={inp} placeholder="Full name" value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
                <input className={inp} placeholder="Email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
                <input className={inp} placeholder="Phone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
                <input className={inp} placeholder="Aadhaar / Passport last 4" value={profile.gov_id} onChange={(e) => setProfile({ ...profile, gov_id: e.target.value })} />
                <input className={inp} placeholder="Origin city" value={profile.origin_city} onChange={(e) => setProfile({ ...profile, origin_city: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <select className={inp} value={profile.meal_pref} onChange={(e) => setProfile({ ...profile, meal_pref: e.target.value as TravelerProfile["meal_pref"] })}>
                    <option value="veg">Veg</option><option value="non-veg">Non-veg</option><option value="vegan">Vegan</option>
                  </select>
                  <select className={inp} value={profile.seat_pref} onChange={(e) => setProfile({ ...profile, seat_pref: e.target.value as TravelerProfile["seat_pref"] })}>
                    <option value="window">Window</option><option value="aisle">Aisle</option><option value="no-pref">No pref</option>
                  </select>
                </div>
                <button onClick={saveProfile} className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background hover:opacity-90">
                  {saved ? <><Check className="h-4 w-4" /> Saved</> : <><Save className="h-4 w-4" /> Save profile</>}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Best combo for {dest.name}</div>
              <div className="mt-2 text-sm text-foreground/80">
                ✈ {flights[0]?.airline} from ₹{flights[0]?.price_inr.toLocaleString("en-IN")}<br/>
                🏨 {hotels[0]?.name} · ₹{(hotels[0]?.price_per_night_inr * nights).toLocaleString("en-IN")} ({nights} nts)
              </div>
              <div className="mt-2 font-display text-2xl font-bold text-brand-gradient">
                ₹{((flights[0]?.price_inr ?? 0) + (hotels[0]?.price_per_night_inr ?? 0) * nights).toLocaleString("en-IN")}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">Estimated total · flight + {nights}-night stay</div>
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h3 className="font-display font-bold text-foreground">Book on the official site</h3>
          <p className="text-xs text-muted-foreground">Live availability and payment happen on the operator's own website.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { l: "IRCTC — trains", u: "https://www.irctc.co.in/nget/train-search", I: Train },
              { l: "RedBus — buses", u: `https://www.redbus.in/bus-tickets/${(IATA_TO_CITY_NAME[origin] ?? "delhi")}-to-${dest.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, I: Bus },
              { l: "Google Flights", u: `https://www.google.com/travel/flights?q=Flights%20from%20${origin}%20to%20${dest.nearest_airport_iata}`, I: Plane },
              { l: "Cleartrip — flights", u: `https://www.cleartrip.com/flights/results?from=${origin}&to=${dest.nearest_airport_iata}&adults=${travelers}`, I: Plane },
              { l: "Booking.com — stays", u: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(dest.name)}`, I: Hotel },
            ].map((x) => (
              <a key={x.l} href={x.u} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary">
                <x.I className="h-3.5 w-3.5" /> {x.l} <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
            ))}
          </div>
        </div>
      </section>

      <MultiLegPanel defaultOrigin={origin} savedDests={savedDestChain(trip)} />
      <FlexSearchPanel />

      <section className="mx-auto max-w-7xl px-4 pb-12">
        <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-5 text-sm text-muted-foreground">
          <b className="text-foreground">Ranking formula:</b> 50% cheapest fare · 20% shortest duration · 20% fewest stops · 10% airline rating.
          One-tap book pre-fills the official site — you finish payment there. We never store payment info.
        </div>
      </section>

    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>{children}</div>;
}

function BusRow({ b, best }: { b: BusOption; best?: boolean }) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 ${best ? "border-foreground bg-secondary/40" : "border-border bg-background"}`}>
      <div className="min-w-[180px]">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">{b.operator}</span>
          {best && <Badge>Cheapest</Badge>}
        </div>
        <div className="text-xs text-muted-foreground">{b.bus_type} · ★ {b.rating} · {b.from} → {b.to}</div>
      </div>
      <div className="text-sm text-foreground/80">{b.depart} → {b.arrive} · {Math.round(b.duration_min / 60)}h {b.duration_min % 60}m</div>
      <div className="flex items-center gap-3">
        <span className="font-display text-lg font-bold text-foreground">₹{b.price_inr.toLocaleString("en-IN")}</span>
        <a href={b.external_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1.5 text-xs font-bold text-background hover:opacity-90">
          RedBus <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-background">{children}</span>;
}

function FlightRow({ f, best }: { f: FlightOption; best: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 transition ${best ? "border-foreground/30 bg-brand-soft" : "border-border bg-background hover:border-foreground/20"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-foreground">{f.airline}</span>
          <span className="text-xs text-muted-foreground">· {f.class}</span>
          {best && <Badge>Best price</Badge>}
        </div>
        <div className="text-right">
          <div className="font-display text-lg font-bold text-foreground">₹{f.price_inr.toLocaleString("en-IN")}</div>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 items-center gap-2 text-sm">
        <div><div className="font-bold text-foreground">{f.depart}</div><div className="text-xs text-muted-foreground">{f.from}</div></div>
        <div className="text-center text-xs text-muted-foreground">{Math.floor(f.duration_min / 60)}h {f.duration_min % 60}m · {f.stops === 0 ? "Non-stop" : `${f.stops} stop`}</div>
        <div className="text-right"><div className="font-bold text-foreground">{f.arrive}</div><div className="text-xs text-muted-foreground">{f.to}</div></div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <div>Baggage {f.baggage} · {f.refundable ? "Refundable" : "Non-refundable"}</div>
        <div className="flex gap-2">
          <a href={f.external_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1.5 text-xs font-bold text-background hover:opacity-90">
            One-tap book <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

function TrainRow({ t, best }: { t: TrainOption; best: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 transition ${best ? "border-foreground/30 bg-brand-soft" : "border-border bg-background hover:border-foreground/20"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-foreground">{t.train_no} · {t.name}</span>
          <span className="text-xs text-muted-foreground">{t.class}</span>
          {best && <Badge>Best price</Badge>}
        </div>
        <div className="font-display text-lg font-bold text-foreground">₹{t.price_inr.toLocaleString("en-IN")}</div>
      </div>
      <div className="mt-2 grid grid-cols-3 text-sm">
        <div><div className="font-bold text-foreground">{t.depart}</div><div className="text-xs text-muted-foreground">{t.from}</div></div>
        <div className="text-center text-xs text-muted-foreground">{Math.floor(t.duration_min / 60)}h {t.duration_min % 60}m · {t.availability}</div>
        <div className="text-right"><div className="font-bold text-foreground">{t.arrive}</div><div className="text-xs text-muted-foreground">{t.to}</div></div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <a href={t.external_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1.5 text-xs font-bold text-background hover:opacity-90">
          Book on IRCTC <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

function HotelRow({ h, nights, best }: { h: HotelOption; nights: number; best: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 transition ${best ? "border-foreground/30 bg-brand-soft" : "border-border bg-background hover:border-foreground/20"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-bold text-foreground">{h.name} <span className="text-xs text-muted-foreground">· {h.area}</span></div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span>{"★".repeat(h.stars)}</span>
            <Star className="h-3 w-3 fill-foreground text-foreground" />
            <span>{h.rating}</span>
            <span>· {h.amenities.join(" · ")}</span>
          </div>
          {best && <div className="mt-1"><Badge>Best price</Badge></div>}
        </div>
        <div className="text-right">
          <div className="font-display text-lg font-bold text-foreground">₹{h.price_per_night_inr.toLocaleString("en-IN")}<span className="text-xs font-normal text-muted-foreground">/night</span></div>
          <div className="text-xs text-muted-foreground">₹{(h.price_per_night_inr * nights).toLocaleString("en-IN")} total</div>
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <a href={h.external_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1.5 text-xs font-bold text-background hover:opacity-90">
          Book on Booking.com <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{msg}</div>;
}

function FlexSearchPanel() {
  const [origin, setOrigin] = useState("DEL");
  const [dest, setDest] = useState("GOI");
  const today = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  }, []);
  const [date, setDate] = useState(today);
  const [flex, setFlex] = useState(3);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<any>(null);

  async function run() {
    setBusy(true);
    try {
      const r = await api.flexSearch({ origin: origin.toUpperCase(), destination: dest.toUpperCase(), date, flex_days: flex, travelers: 1 });
      setData(r);
    } catch {
      setData({ hint: "Backend offline — start uvicorn to use live flex search." });
    } finally { setBusy(false); }
  }

  return (
    <section className="mx-auto max-w-7xl px-4 pb-10">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-7">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand" />
          <h3 className="font-display font-bold text-foreground">Cheapest-day finder · ±{flex} days</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-5">
          <Field label="Origin IATA"><input className={inp} value={origin} onChange={(e) => setOrigin(e.target.value)} maxLength={3} /></Field>
          <Field label="Dest IATA"><input className={inp} value={dest} onChange={(e) => setDest(e.target.value)} maxLength={3} /></Field>
          <Field label="Date"><input type="date" className={inp} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label={`Flex ±${flex}`}><input type="range" min={1} max={5} value={flex} onChange={(e) => setFlex(+e.target.value)} className="w-full accent-[var(--brand)]" /></Field>
          <div className="flex items-end">
            <button onClick={run} disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />} Search
            </button>
          </div>
        </div>
        {data && (
          <div className="mt-5 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Cheapest fare by day</div>
              {data.results?.length ? <FlexPriceLine data={data.results} /> : <div className="py-6 text-center text-sm text-muted-foreground">No live offers in this window.</div>}
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 text-emerald-900">
                <TrendingDown className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">AI suggestion</span>
              </div>
              {data.best && (
                <div className="mt-2 font-display text-2xl font-bold text-emerald-900">
                  ₹{data.best.cheapest_inr?.toLocaleString("en-IN")}
                  <span className="ml-1 text-xs font-normal text-emerald-900/70">on {data.best.date}</span>
                </div>
              )}
              <p className="mt-2 text-sm text-emerald-900/85">{data.hint}</p>
              {data.best?.top?.length > 0 && (
                <div className="mt-3 space-y-1.5 text-xs text-emerald-900/80">
                  {data.best.top.slice(0, 3).map((o: any) => (
                    <div key={o.id} className="flex items-center justify-between border-t border-emerald-200 pt-1.5">
                      <span>{o.airline} {o.flight_number} · {o.stops}stop · ⭐{o.airline_rating}</span>
                      <span className="font-bold">₹{o.price_inr?.toLocaleString("en-IN")}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ---------- Multi-leg connecting search ----------
type Leg = { id: string; from: string; to: string; date: string };

function savedDestChain(trip: any): string[] {
  const chain: string[] = [];
  const seed = trip?.selectedDestination?.id as string | undefined;
  if (seed) {
    const d = DESTINATIONS.find((x) => x.id === seed);
    if (d?.nearest_airport_iata) chain.push(d.nearest_airport_iata);
  }
  const savedTrips = trip?.savedTrips || [];
  for (const s of savedTrips) {
    const dest = s?.itinerary?.destination;
    if (dest?.nearest_airport_iata && !chain.includes(dest.nearest_airport_iata)) {
      chain.push(dest.nearest_airport_iata);
    }
  }
  return chain;
}

function MultiLegPanel({ defaultOrigin, savedDests }: { defaultOrigin: string; savedDests: string[] }) {
  const today = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  }, []);

  const initialLegs = useMemo<Leg[]>(() => {
    const chain = [defaultOrigin, ...savedDests];
    const legs: Leg[] = [];
    for (let i = 0; i < Math.max(1, chain.length - 1); i++) {
      legs.push({
        id: `leg-${i}`,
        from: chain[i] || defaultOrigin,
        to: chain[i + 1] || "GOI",
        date: today,
      });
    }
    return legs;
  }, [defaultOrigin, savedDests.join(","), today]);

  const [legs, setLegs] = useState<Leg[]>(initialLegs);
  const [results, setResults] = useState<Record<string, { flights: any[]; trains: any[]; loading: boolean }>>({});

  useEffect(() => { setLegs(initialLegs); }, [initialLegs]);

  function updateLeg(id: string, patch: Partial<Leg>) {
    setLegs((arr) => arr.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }
  function addLeg() {
    const last = legs[legs.length - 1];
    setLegs((arr) => [...arr, { id: `leg-${Date.now()}`, from: last?.to || "DEL", to: "GOI", date: last?.date || today }]);
  }
  function removeLeg(id: string) {
    setLegs((arr) => (arr.length <= 1 ? arr : arr.filter((l) => l.id !== id)));
  }

  async function searchAll() {
    const next: typeof results = { ...results };
    legs.forEach((l) => (next[l.id] = { flights: [], trains: [], loading: true }));
    setResults(next);

    await Promise.all(legs.map(async (l) => {
      const [flightsRes, trainsRes] = await Promise.all([
        api.flexSearch({ origin: l.from, destination: l.to, date: l.date, flex_days: 1, travelers: 1 }).catch(() => ({ results: [] })),
        api.trains({ origin: IATA_TO_CITY_NAME[l.from] || l.from, destination: IATA_TO_CITY_NAME[l.to] || l.to, travelers: 1 }).catch(() => ({ results: [] })),
      ]);
      const flights = (flightsRes as any).results?.flatMap((d: any) => d.top || []).slice(0, 3) || [];
      const trains = ((trainsRes as any).results || []).slice(0, 3);
      setResults((cur) => ({ ...cur, [l.id]: { flights, trains, loading: false } }));
    }));
  }

  const totalCheapest = Object.values(results).reduce((s, r) => {
    const f = r.flights[0]?.price_inr;
    const t = r.trains[0]?.price_inr;
    const best = [f, t].filter(Boolean).sort((a: number, b: number) => a - b)[0];
    return s + (best || 0);
  }, 0);

  return (
    <section className="mx-auto max-w-7xl px-4 pb-10">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-7">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-brand" />
            <h3 className="font-display font-bold text-foreground">Multi-city trip · connecting flights & trains</h3>
          </div>
          <div className="flex gap-2">
            <button onClick={addLeg} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary">
              <Plus className="h-3 w-3" /> Add leg
            </button>
            <button onClick={searchAll} className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1.5 text-xs font-bold text-background hover:opacity-90">
              <Sparkles className="h-3 w-3" /> Search all
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {legs.map((leg, i) => {
            const r = results[leg.id];
            return (
              <div key={leg.id} className="rounded-xl border border-border bg-background p-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-secondary px-2 py-0.5 font-bold text-foreground">Leg {i + 1}</span>
                  <select value={leg.from} onChange={(e) => updateLeg(leg.id, { from: e.target.value })} className="rounded-md border border-input bg-background px-2 py-1">
                    {ORIGIN_CITIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                    {!ORIGIN_CITIES.some((c) => c.code === leg.from) && <option value={leg.from}>{leg.from}</option>}
                  </select>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <input
                    value={leg.to}
                    onChange={(e) => updateLeg(leg.id, { to: e.target.value.toUpperCase().slice(0, 3) })}
                    className="w-20 rounded-md border border-input bg-background px-2 py-1 font-mono uppercase"
                    placeholder="IATA"
                    maxLength={3}
                  />
                  <input type="date" value={leg.date} onChange={(e) => updateLeg(leg.id, { date: e.target.value })} className="rounded-md border border-input bg-background px-2 py-1" />
                  {legs.length > 1 && (
                    <button onClick={() => removeLeg(leg.id)} className="ml-auto rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-destructive">
                      <XIcon className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {r && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-lg border border-border bg-secondary/30 p-2">
                      <div className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        <Plane className="h-3 w-3" /> Flights {r.loading && <Loader2 className="h-3 w-3 animate-spin" />}
                      </div>
                      {r.flights.length === 0 && !r.loading && <div className="text-xs text-muted-foreground">No live offer.</div>}
                      {r.flights.map((f: any) => (
                        <div key={f.id} className="flex items-center justify-between border-t border-border py-1 text-xs">
                          <span>{f.airline} {f.flight_number} · {f.stops}stop</span>
                          <b className="text-foreground">₹{f.price_inr?.toLocaleString("en-IN")}</b>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-lg border border-border bg-secondary/30 p-2">
                      <div className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        <Train className="h-3 w-3" /> Trains {r.loading && <Loader2 className="h-3 w-3 animate-spin" />}
                      </div>
                      {r.trains.length === 0 && !r.loading && <div className="text-xs text-muted-foreground">No daily service on file.</div>}
                      {r.trains.map((t: any) => (
                        <div key={t.train_no} className="flex items-center justify-between border-t border-border py-1 text-xs">
                          <span>{t.train_no} · {t.name} · {t.best_class}</span>
                          <b className="text-foreground">₹{t.price_inr?.toLocaleString("en-IN")}</b>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {totalCheapest > 0 && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            <b>Cheapest connecting total (1 traveler):</b>{" "}
            <span className="font-display text-lg font-bold">₹{totalCheapest.toLocaleString("en-IN")}</span>
            <span className="ml-2 text-xs text-emerald-900/70">summed across {legs.length} leg{legs.length > 1 ? "s" : ""} · picks whichever of flight/train is cheaper per leg</span>
          </div>
        )}
      </div>
    </section>
  );
}


