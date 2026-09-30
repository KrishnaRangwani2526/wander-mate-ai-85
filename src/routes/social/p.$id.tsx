import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { commentCounts, getPost, likeCounts, listMyLikes, type Post } from "@/lib/social";
import { PostCard } from "@/components/social/PostCard";

export const Route = createFileRoute("/social/p/$id")({
  head: () => ({
    meta: [
      { title: "Post | WanderCompanion Social" },
      { name: "description", content: "A travel post from a Udaipur creator or local business." },
      { property: "og:title", content: "Post | WanderCompanion Social" },
      { property: "og:description", content: "A travel post from a Udaipur creator or local business." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PostPage,
});

function PostPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null | undefined>(undefined);
  const [likes, setLikes] = useState(0);
  const [comments, setComments] = useState(0);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await getPost(id);
      setPost(p);
      if (!p) return;
      const [l, c] = await Promise.all([likeCounts([id]), commentCounts([id])]);
      setLikes(l[id] ?? 0);
      setComments(c[id] ?? 0);
      if (user) setLiked((await listMyLikes(user.id)).includes(id));
    })();
  }, [id, user]);

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <Link to="/social" className="text-sm text-muted-foreground hover:text-foreground">← Back to feed</Link>
      <div className="mt-4">
        {post === undefined && <p className="text-sm text-muted-foreground">Loading…</p>}
        {post === null && <p className="text-sm text-muted-foreground">Post not found.</p>}
        {post && <PostCard key={String(liked)} post={post} likeCount={likes} commentCount={comments} likedInitially={liked} />}
      </div>
    </div>
  );
}
