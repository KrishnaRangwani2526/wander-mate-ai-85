import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Send, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { addComment, listComments, timeAgo, type Comment } from "@/lib/social";

export function Comments({ postId, authorName }: { postId: string; authorName: string }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void listComments(postId).then((c) => {
      if (alive) setItems(c);
    });
    return () => {
      alive = false;
    };
  }, [postId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !body.trim()) return;
    setBusy(true);
    try {
      await addComment(postId, user.id, authorName, body.trim());
      setBody("");
      setItems(await listComments(postId));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <ul className="space-y-2.5">
        {items.length === 0 && <li className="text-xs text-muted-foreground">No comments yet — be the first.</li>}
        {items.map((c) => (
          <li key={c.id} className="text-sm leading-snug">
            <span className="font-semibold text-foreground">{c.author_name}</span>{" "}
            <span className="text-foreground/85">{c.body}</span>{" "}
            <span className="text-[11px] text-muted-foreground">{timeAgo(c.created_at)}</span>
          </li>
        ))}
      </ul>

      {user ? (
        <form onSubmit={submit} className="mt-3 flex items-center gap-2">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add a comment…"
            className="flex-1 rounded-full border border-border bg-secondary/40 px-3 py-2 text-sm outline-none focus:border-foreground/30"
          />
          <button
            type="submit"
            disabled={busy || !body.trim()}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-foreground text-background disabled:opacity-50"
            aria-label="Post comment"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          <Link to="/auth" className="font-semibold text-foreground hover:underline">
            Sign in
          </Link>{" "}
          to comment.
        </p>
      )}
    </div>
  );
}
