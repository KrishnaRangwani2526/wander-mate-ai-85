import { useState } from "react";
import { Star } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { addReview, listReviews, timeAgo, type Review } from "@/lib/social";

export function ReviewBlock({
  creatorId,
  reviews,
  authorName,
  onChange,
}: {
  creatorId: string;
  reviews: Review[];
  authorName: string;
  onChange: (r: Review[]) => void;
}) {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const avg = reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !body.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      await addReview(creatorId, user.id, authorName || "Traveller", rating, body.trim());
      setBody("");
      onChange(await listReviews(creatorId));
    } catch (e: any) {
      setErr(e?.message ?? "Could not post review");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <Star className="h-4 w-4 fill-primary text-primary" />
        <span className="font-semibold">{avg.toFixed(1)}</span>
        <span className="text-muted-foreground">· {reviews.length} reviews</span>
      </div>
      {user ? (
        <form onSubmit={submit} className="space-y-2 rounded-xl border border-border p-3">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button type="button" key={n} onClick={() => setRating(n)} aria-label={`${n} stars`}>
                <Star className={`h-5 w-5 ${n <= rating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
              </button>
            ))}
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share your experience…"
            className="w-full rounded-lg border border-border bg-background p-2 text-sm"
            rows={3}
          />
          {err && <p className="text-xs text-destructive">{err}</p>}
          <button disabled={busy} className="rounded-full bg-foreground px-4 py-1.5 text-xs font-semibold text-background disabled:opacity-50">
            {busy ? "Posting…" : "Post review"}
          </button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">Sign in to leave a review.</p>
      )}
      <ul className="space-y-3">
        {reviews.map((r) => (
          <li key={r.id} className="rounded-xl border border-border p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">{r.author_name}</span>
              <span className="text-xs text-muted-foreground">{timeAgo(r.created_at)}</span>
            </div>
            <div className="my-1 flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
              ))}
            </div>
            {r.body && <p className="text-sm">{r.body}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
