import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Film, Compass, Store, Sparkles } from "lucide-react";
import {
  commentCounts,
  compact,
  likeCounts,
  listCreators,
  listMyLikes,
  listPosts,
  type Creator,
  type Post,
} from "@/lib/social";
import { useAuth } from "@/hooks/useAuth";
import { PostCard } from "@/components/social/PostCard";
import { StoryViewer } from "@/components/social/StoryViewer";

export const Route = createFileRoute("/social/")({
  head: () => ({
    meta: [
      { title: "Udaipur travel feed — reels, stories & local creators" },
      {
        name: "description",
        content:
          "Scroll Udaipur reels and stories from travel creators, read real reviews of hotels, cafes and guides, and follow the itineraries locals actually use.",
      },
      { property: "og:title", content: "Udaipur travel feed — reels, stories & local creators" },
      {
        property: "og:description",
        content: "A social feed for travel: creator reels, stories, tagged places and verified local businesses in Udaipur.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SocialFeed,
});

type Tab = "feed" | "reels";

function SocialFeed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Post[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [likes, setLikes] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, number>>({});
  const [myLikes, setMyLikes] = useState<string[]>([]);
  const [tab, setTab] = useState<Tab>("feed");
  const [storyAt, setStoryAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [all, st, cr] = await Promise.all([
        listPosts({ limit: 60 }),
        listPosts({ kind: "story", limit: 30 }),
        listCreators(),
      ]);
      if (!alive) return;
      const feed = all.filter((p) => p.kind !== "story");
      setPosts(feed);
      setStories(st);
      setCreators(cr);
      setLoading(false);
      const ids = feed.map((p) => p.id);
      const [lc, cc] = await Promise.all([likeCounts(ids), commentCounts(ids)]);
      if (!alive) return;
      setLikes(lc);
      setComments(cc);
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setMyLikes([]);
      return;
    }
    void listMyLikes(user.id).then(setMyLikes);
  }, [user]);

  const shown = useMemo(() => (tab === "reels" ? posts.filter((p) => p.kind === "reel") : posts), [posts, tab]);
  const influencers = creators.filter((c) => c.kind === "influencer");
  const vendors = creators.filter((c) => c.kind === "vendor");

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-10">
      <header className="mb-6">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-foreground">
          <Sparkles className="h-3.5 w-3.5" /> Now targeting Udaipur
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          The travel feed
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Reels, stories and tagged places from Udaipur creators — plus registered hotels, cafes, restaurants and
          guides you can review.
        </p>
      </header>

      {/* Stories */}
      <section className="mb-6">
        <div className="flex gap-4 overflow-x-auto pb-2">
          {stories.map((s, i) => (
            <button key={s.id} onClick={() => setStoryAt(i)} className="w-16 shrink-0 text-center">
              <span className="block rounded-full bg-gradient-to-tr from-rose-500 via-orange-400 to-amber-300 p-[2px]">
                <img
                  src={s.creator?.avatar_url ?? ""}
                  alt={s.creator?.name ?? "story"}
                  loading="lazy"
                  className="h-16 w-16 rounded-full border-2 border-background object-cover"
                />
              </span>
              <span className="mt-1 block truncate text-[10.5px] font-medium text-foreground">
                {s.creator?.handle}
              </span>
            </button>
          ))}
          {stories.length === 0 && !loading && <p className="text-sm text-muted-foreground">No stories yet.</p>}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <div className="mb-4 inline-flex rounded-full border border-border bg-background p-1">
            {(["feed", "reels"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-semibold capitalize transition ${
                  tab === t ? "bg-foreground text-background" : "text-foreground/70 hover:bg-secondary"
                }`}
              >
                {t === "reels" ? <Film className="h-3.5 w-3.5" /> : <Compass className="h-3.5 w-3.5" />}
                {t}
              </button>
            ))}
          </div>

          {loading && <p className="text-sm text-muted-foreground">Loading the feed…</p>}

          <div className="space-y-6">
            {shown.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                likeCount={likes[p.id] ?? 0}
                commentCount={comments[p.id] ?? 0}
                likedInitially={myLikes.includes(p.id)}
              />
            ))}
          </div>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <Panel title="Udaipur creators to follow" icon={<BadgeCheck className="h-4 w-4" />}>
            {influencers.map((c) => (
              <CreatorRow key={c.id} c={c} />
            ))}
          </Panel>
          <Panel title="Registered businesses" icon={<Store className="h-4 w-4" />}>
            {vendors.map((c) => (
              <CreatorRow key={c.id} c={c} />
            ))}
            <Link
              to="/vendors"
              className="mt-2 inline-flex w-full items-center justify-center rounded-full border border-border px-3 py-2 text-[12.5px] font-semibold text-foreground hover:bg-secondary"
            >
              Browse all & read reviews
            </Link>
          </Panel>
        </aside>
      </div>

      {storyAt !== null && (
        <StoryViewer stories={stories} startIndex={storyAt} onClose={() => setStoryAt(null)} />
      )}
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-border bg-background p-4 shadow-card">
      <h2 className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-wide text-foreground">
        {icon} {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function CreatorRow({ c }: { c: Creator }) {
  return (
    <Link
      to="/social/$handle"
      params={{ handle: c.handle }}
      className="flex items-center gap-3 rounded-xl px-1 py-1 hover:bg-secondary"
    >
      <img src={c.avatar_url ?? ""} alt={c.name} loading="lazy" className="h-9 w-9 rounded-full object-cover" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1 text-[13px] font-semibold text-foreground">
          <span className="truncate">{c.name}</span>
          {c.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-brand" />}
        </span>
        <span className="block truncate text-[11px] text-muted-foreground">
          {c.kind === "vendor" ? c.category : `${compact(c.followers)} followers`}
        </span>
      </span>
    </Link>
  );
}
