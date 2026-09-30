import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BadgeCheck, MapPin, Star } from "lucide-react";
import { listCreators, listReviews, type Creator, type Review } from "@/lib/social";

export const Route = createFileRoute("/vendors")({
  head: () => ({
    meta: [
      { title: "Udaipur hotels, cafes & guides | WanderCompanion" },
      { name: "description", content: "Browse verified Udaipur hotels, restaurants, cafes and guides with traveller reviews." },
      { property: "og:title", content: "Udaipur hotels, cafes & guides | WanderCompanion" },
      { property: "og:description", content: "Verified local businesses in Udaipur with real traveller reviews." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VendorsPage,
});

function VendorsPage() {
  const [vendors, setVendors] = useState<Creator[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [cat, setCat] = useState("all");

  useEffect(() => {
    listCreators("vendor").then(setVendors);
    listReviews().then(setReviews);
  }, []);

  const cats = ["all", ...Array.from(new Set(vendors.map((v) => v.category ?? "other")))];
  const shown = cat === "all" ? vendors : vendors.filter((v) => (v.category ?? "other") === cat);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold">Local businesses in Udaipur</h1>
      <p className="text-sm text-muted-foreground">Hotels, restaurants, cafes and guides reviewed by travellers and creators.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`rounded-full border border-border px-3 py-1 text-xs capitalize ${cat === c ? "bg-foreground text-background" : ""}`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {shown.map((v) => {
          const rs = reviews.filter((r) => r.creator_id === v.id);
          const avg = rs.length ? rs.reduce((a, r) => a + r.rating, 0) / rs.length : v.rating ?? 0;
          return (
            <Link
              key={v.id}
              to="/social/$handle"
              params={{ handle: v.handle }}
              className="overflow-hidden rounded-2xl border border-border hover:shadow-md"
            >
              {v.cover_url && <img src={v.cover_url} alt={v.name} className="h-40 w-full object-cover" loading="lazy" />}
              <div className="p-4">
                <div className="flex items-center gap-1 font-semibold">
                  {v.name} {v.verified && <BadgeCheck className="h-4 w-4 text-primary" />}
                </div>
                <div className="text-xs capitalize text-muted-foreground">{v.category} {v.price_level ? `· ${v.price_level}` : ""}</div>
                <div className="mt-2 flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-primary text-primary" />{Number(avg).toFixed(1)} ({rs.length})</span>
                  {v.address && <span className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{v.address}</span>}
                </div>
                {rs[0]?.body && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">"{rs[0].body}" — {rs[0].author_name}</p>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
