import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BadgeCheck,
  MapPin,
  Phone,
  Star,
  UserPlus,
  UserCheck,
  Film,
  Grid3X3,
  Route as RouteIcon,
  MessageSquare,
  ExternalLink,
  IndianRupee,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  compact,
  getCreator,
  listItineraries,
  listMyFollows,
  listPosts,
  listReviews,
  toggleFollow,
  type Creator,
  type CreatorItinerary,
  type Post,
  type Review,
} from "@/lib/social";
import { ReviewBlock } from "@/components/social/ReviewBlock";

export const Route = createFileRoute("/social/$handle")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.handle} — Udaipur travel profile` },
      {
        name: "description",
        content: `Reels, stories, tagged places, itineraries and reviews from @${params.handle} on the Udaipur travel feed.`,
      },
      { property: "og:title", content: `@${params.handle} — Udaipur travel profile` },
      {
        property: "og:description",
        content: `See what @${params.handle} posts, plans and recommends around Udaipur.`,
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

type Tab = "posts" | "reels" | "itineraries" | "reviews";

function ProfilePage() {
  const { handle } = Route.useParams();
  const { user, displayName } = useAuth();
  const [creator, setCreator] = useState<Creator | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [itins, setItins] = useState<CreatorItinerary[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [following, setFollowing] = useState(false);
  const [tab, setTab] = useState<Tab>("posts");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void (async () => {
      const c = await getCreator(handle);
      if (!alive) return;
      setCreator(c);
      if (!c) return setLoading(false);
      const [p, it, rv] = await Promise.all([
        listPosts({ creatorId: c.id, limit: 60 }),
        listItineraries(c.id),
        listReviews(c.id),
      ]);
      if (!alive) return;
      setPosts(p);
      setItins(it);
      setReviews(rv);
      setTab(c.kind === "vendor" ? "posts" : "posts");
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [handle]);

  useEffect(() => {
    if (!user || !creator) return setFollowing(false);
    void listMyFollows(user.id).then((ids) => setFollowing(ids.includes(creator.id)));
  }, [user, creator]);

  async function onFollow() {
    if (!user || !creator) return;
    const next = !following;
    setFollowing(next);
    try {
      await toggleFollow(creator.id, user.id, following);
    } catch {
      setFollowing(!next);
    }
  }

  if (loading) return <p className="mx-auto max-w-5xl px-4 py-12 text-sm text-muted-foreground">Loading profile…</p>;
  if (!creator)
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <h1 className="font-display text-2xl font-bold">Profile not found</h1>
        <Link to="/social" className="mt-3 inline-block text-sm font-semibold text-foreground hover:underline">
          Back to the feed
        </Link>
      </div>
    );

  const isVendor = creator.kind === "vendor";
  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : creator.rating?.toFixed(1) ?? null;
  const tabs: Tab[] = isVendor ? ["posts", "reviews"] : ["posts", "reels", "itineraries"];
  const grid = tab === "reels" ? posts.filter((p) => p.kind === "reel") : posts.filter((p) => p.kind !== "story");

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-12">
      <div className="relative -mx-4 h-40 overflow-hidden sm:mx-0 sm:mt-6 sm:h-56 sm:rounded-3xl">
        <img src={creator.cover_url ?? ""} alt="" className="h-full w-full object-cover" />
      </div>

      <div className="-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end">
        <img
          src={creator.avatar_url ?? ""}
          alt={creator.name}
          className="h-24 w-24 rounded-2xl border-4 border-background object-cover shadow-card"
        />
        <div className="flex-1">
          <h1 className="flex items-center gap-1.5 font-display text-2xl font-bold tracking-tight text-foreground">
            {creator.name}
            {creator.verified && <BadgeCheck className="h-5 w-5 text-brand" />}
          </h1>
          <p className="text-sm text-muted-foreground">
            @{creator.handle} · {isVendor ? creator.category : creator.category} · {creator.city}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onFollow}
            disabled={!user}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold transition disabled:opacity-60 ${
              following ? "border border-border bg-background text-foreground" : "bg-foreground text-background"
            }`}
          >
            {following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {following ? "Following" : "Follow"}
          </button>
          {creator.maps_url && (
            <a
              href={creator.maps_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-[13px] font-semibold text-foreground hover:bg-secondary"
            >
              <MapPin className="h-4 w-4" /> Map
            </a>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-5 text-sm">
        <Stat label="Posts" value={String(posts.length)} />
        <Stat label="Followers" value={compact(creator.followers)} />
        {avgRating && <Stat label="Rating" value={`${avgRating}★`} />}
        {creator.price_level && <Stat label="Price" value={creator.price_level} />}
      </div>

      {creator.bio && <p className="mt-4 max-w-2xl text-sm leading-relaxed text-foreground/85">{creator.bio}</p>}

      {isVendor && (
        <div className="mt-4 flex flex-wrap gap-3 text-[12.5px] text-muted-foreground">
          {creator.address && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {creator.address}
            </span>
          )}
          {creator.phone && (
            <a href={`tel:${creator.phone}`} className="inline-flex items-center gap-1 hover:text-foreground">
              <Phone className="h-3.5 w-3.5" /> {creator.phone}
            </a>
          )}
          {creator.website && (
            <a
              href={creator.website}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Website
            </a>
          )}
        </div>
      )}

      <div className="mt-6 flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-[13px] font-semibold capitalize transition ${
              tab === t ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "posts" && <Grid3X3 className="h-3.5 w-3.5" />}
            {t === "reels" && <Film className="h-3.5 w-3.5" />}
            {t === "itineraries" && <RouteIcon className="h-3.5 w-3.5" />}
            {t === "reviews" && <MessageSquare className="h-3.5 w-3.5" />}
            {t}
          </button>
        ))}
      </div>

      {(tab === "posts" || tab === "reels") && (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
          {grid.map((p) => (
            <Link
              key={p.id}
              to="/social/p/$id"
              params={{ id: p.id }}
              className="group relative overflow-hidden rounded-2xl bg-secondary"
            >
              <img
                src={p.media_url}
                alt={p.caption ?? ""}
                loading="lazy"
                className="aspect-square w-full object-cover transition group-hover:scale-105"
              />
              {p.kind === "reel" && (
                <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                  Reel
                </span>
              )}
            </Link>
          ))}
          {grid.length === 0 && <p className="text-sm text-muted-foreground">Nothing here yet.</p>}
        </div>
      )}

      {tab === "itineraries" && (
        <div className="mt-4 space-y-4">
          {itins.map((it) => (
            <ItineraryCard key={it.id} it={it} />
          ))}
          {itins.length === 0 && <p className="text-sm text-muted-foreground">No published itineraries yet.</p>}
        </div>
      )}

      {tab === "reviews" && (
        <div className="mt-4">
          <ReviewBlock creatorId={creator.id} reviews={reviews} authorName={displayName} onChange={setReviews} />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex flex-col">
      <span className="font-display text-lg font-bold leading-none text-foreground">{value}</span>
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
    </span>
  );
}

function ItineraryCard({ it }: { it: CreatorItinerary }) {
  return (
    <article className="rounded-3xl border border-border bg-background p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-lg font-bold text-foreground">{it.title}</h3>
          {it.summary && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{it.summary}</p>}
        </div>
        {it.budget_inr != null && (
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-[12px] font-bold text-foreground">
            <IndianRupee className="h-3.5 w-3.5" />
            {it.budget_inr.toLocaleString("en-IN")}
          </span>
        )}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {it.days.map((d) => (
          <div key={d.day} className="rounded-2xl border border-border bg-secondary/30 p-3">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Day {d.day}</p>
            <ul className="space-y-2">
              {d.stops.map((s, i) => (
                <li key={i} className="text-[13px] leading-snug">
                  <span className="font-semibold text-foreground">{s.time ? `${s.time} · ` : ""}{s.title}</span>
                  {s.note && <span className="block text-[11.5px] text-muted-foreground">{s.note}</span>}
                  {s.cost ? <span className="text-[11.5px] text-muted-foreground">₹{s.cost}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <Link
        to="/plan"
        search={{ dest: "udaipur", name: "Udaipur" }}
        className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-[12.5px] font-semibold text-background hover:opacity-90"
      >
        <Star className="h-3.5 w-3.5" /> Plan my own version
      </Link>
    </article>
  );
}
