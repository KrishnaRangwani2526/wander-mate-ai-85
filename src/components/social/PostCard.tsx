import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Heart, MessageCircle, MapPin, BadgeCheck, Play } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toggleLike, timeAgo, compact, type Post } from "@/lib/social";
import { Comments } from "./Comments";

export function PostCard({
  post,
  likeCount,
  commentCount,
  likedInitially,
}: {
  post: Post;
  likeCount: number;
  commentCount: number;
  likedInitially: boolean;
}) {
  const { user, displayName } = useAuth();
  const [liked, setLiked] = useState(likedInitially);
  const [count, setCount] = useState(likeCount + post.likes);
  const [showComments, setShowComments] = useState(false);

  async function onLike() {
    if (!user) return;
    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    try {
      await toggleLike(post.id, user.id, liked);
    } catch {
      setLiked(!next);
      setCount((c) => c + (next ? -1 : 1));
    }
  }

  const c = post.creator;

  return (
    <article className="overflow-hidden rounded-3xl border border-border bg-background shadow-card">
      <div className="flex items-center gap-3 px-4 py-3">
        <Link to="/social/$handle" params={{ handle: c?.handle ?? "" }} className="shrink-0">
          <img
            src={c?.avatar_url ?? ""}
            alt={c?.name ?? "creator"}
            loading="lazy"
            className="h-9 w-9 rounded-full object-cover ring-2 ring-brand/40"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            to="/social/$handle"
            params={{ handle: c?.handle ?? "" }}
            className="flex items-center gap-1 text-sm font-semibold text-foreground hover:underline"
          >
            <span className="truncate">{c?.name}</span>
            {c?.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-brand" />}
          </Link>
          <p className="truncate text-[11px] text-muted-foreground">
            {c?.kind === "vendor" ? `${c?.category} · ${c?.city}` : `@${c?.handle}`} · {timeAgo(post.created_at)}
          </p>
        </div>
        {post.kind === "reel" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-foreground">
            <Play className="h-3 w-3" /> Reel
          </span>
        )}
      </div>

      <Link to="/social/p/$id" params={{ id: post.id }} className="block bg-secondary/40">
        <img
          src={post.media_url}
          alt={post.caption ?? "travel post"}
          loading="lazy"
          className={`w-full object-cover ${post.kind === "reel" ? "aspect-[4/5]" : "aspect-square"}`}
        />
      </Link>

      <div className="px-4 py-3">
        <div className="flex items-center gap-4">
          <button
            onClick={onLike}
            disabled={!user}
            title={user ? "Like" : "Sign in to like"}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground disabled:opacity-60"
          >
            <Heart className={`h-5 w-5 ${liked ? "fill-rose-500 text-rose-500" : ""}`} />
            {compact(count)}
          </button>
          <button
            onClick={() => setShowComments((s) => !s)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground"
          >
            <MessageCircle className="h-5 w-5" />
            {commentCount}
          </button>
          {post.place_name && (
            <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {post.place_name}
            </span>
          )}
        </div>

        {post.caption && (
          <p className="mt-2 text-sm leading-relaxed text-foreground">
            <span className="font-semibold">@{c?.handle}</span> {post.caption}
          </p>
        )}

        {post.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {post.tags.map((t) => (
              <span key={t} className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-foreground/80">
                #{t}
              </span>
            ))}
          </div>
        )}

        {showComments && (
          <div className="mt-3 border-t border-border pt-3">
            <Comments postId={post.id} authorName={displayName} />
          </div>
        )}
      </div>
    </article>
  );
}
