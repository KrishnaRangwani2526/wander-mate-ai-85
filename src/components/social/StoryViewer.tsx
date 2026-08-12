import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { timeAgo, type Post } from "@/lib/social";

export function StoryViewer({
  stories,
  startIndex,
  onClose,
}: {
  stories: Post[];
  startIndex: number;
  onClose: () => void;
}) {
  const [i, setI] = useState(startIndex);
  const story = stories[i];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setI((v) => Math.min(v + 1, stories.length - 1));
      if (e.key === "ArrowLeft") setI((v) => Math.max(v - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, stories.length]);

  if (!story) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-3 py-6">
      <button
        onClick={onClose}
        aria-label="Close stories"
        className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white"
      >
        <X className="h-5 w-5" />
      </button>

      <button
        onClick={() => setI((v) => Math.max(v - 1, 0))}
        disabled={i === 0}
        aria-label="Previous story"
        className="absolute left-2 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white disabled:opacity-30 sm:left-8"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={() => setI((v) => Math.min(v + 1, stories.length - 1))}
        disabled={i === stories.length - 1}
        aria-label="Next story"
        className="absolute right-2 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white disabled:opacity-30 sm:right-8"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div className="w-full max-w-sm">
        <div className="mb-2 flex gap-1">
          {stories.map((s, idx) => (
            <span key={s.id} className={`h-0.5 flex-1 rounded-full ${idx <= i ? "bg-white" : "bg-white/30"}`} />
          ))}
        </div>
        <div className="mb-3 flex items-center gap-2">
          <img src={story.creator?.avatar_url ?? ""} alt="" className="h-8 w-8 rounded-full object-cover" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">@{story.creator?.handle}</p>
            <p className="text-[11px] text-white/70">{timeAgo(story.created_at)} ago</p>
          </div>
        </div>
        <img src={story.media_url} alt={story.caption ?? "story"} className="aspect-[9/16] w-full rounded-2xl object-cover" />
        <p className="mt-3 text-sm text-white/90">{story.caption}</p>
        {story.place_name && (
          <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-white/70">
            <MapPin className="h-3.5 w-3.5" /> {story.place_name}
          </p>
        )}
      </div>
    </div>
  );
}
