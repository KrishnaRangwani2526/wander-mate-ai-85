import { createFileRoute } from "@tanstack/react-router";

// Overpass QL categories -> icon color hints (consumed by frontend)
const CATEGORY_QUERY: Record<string, string> = {
  tourist: 'nwr["tourism"~"attraction|museum|artwork|gallery|monument"]',
  viewpoint: 'nwr["tourism"~"viewpoint"]',
  food: 'nwr["amenity"~"restaurant|cafe|fast_food|food_court"]',
  stay: 'nwr["tourism"~"hotel|hostel|guest_house|apartment"]',
  transport: 'nwr["amenity"~"bus_station"]["public_transport"!="stop_position"];nwr["railway"~"station"]',
};

async function overpass(query: string) {
  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
  ];
  let lastErr = "";
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "WanderCompanion/1.0 (travel-app)",
          Accept: "application/json",
        },
        body: `data=${encodeURIComponent(query)}`,
      });
      if (res.ok) return (await res.json()) as { elements: any[] };
      lastErr = `${url} → ${res.status}`;
    } catch (e: any) {
      lastErr = `${url} → ${e?.message || "fetch failed"}`;
    }
  }
  throw new Error(`Overpass unavailable (${lastErr})`);
}

function elementCenter(el: any): [number, number] | null {
  if (typeof el.lat === "number" && typeof el.lon === "number") return [el.lat, el.lon];
  if (el.center) return [el.center.lat, el.center.lon];
  return null;
}

export const Route = createFileRoute("/api/places")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json().catch(() => ({}));
        const lat = Number(body.lat);
        const lng = Number(body.lng);
        const radius = Math.min(15000, Math.max(500, Number(body.radius) || 4000));
        const categories: string[] = Array.isArray(body.categories) && body.categories.length
          ? body.categories.filter((c: string) => CATEGORY_QUERY[c])
          : Object.keys(CATEGORY_QUERY);
        if (!isFinite(lat) || !isFinite(lng)) {
          return Response.json({ error: "lat/lng required" }, { status: 400 });
        }
        try {
          const parts = categories.map((cat) => {
            const q = CATEGORY_QUERY[cat];
            return q.split(";").map((sub) => `${sub}(around:${radius},${lat},${lng});`).join("");
          });
          const query = `[out:json][timeout:20];(${parts.join("")});out center 60;`;
          const data = await overpass(query);
          const seen = new Set<string>();
          const items: any[] = [];
          for (const el of data.elements || []) {
            const c = elementCenter(el);
            if (!c) continue;
            const name = el.tags?.name || el.tags?.["name:en"];
            if (!name) continue;
            const key = `${name}|${c[0].toFixed(3)}|${c[1].toFixed(3)}`;
            if (seen.has(key)) continue;
            seen.add(key);
            let category: string = "tourist";
            const t = el.tags || {};
            if (t.tourism === "viewpoint") category = "viewpoint";
            else if (t.tourism === "hotel" || t.tourism === "hostel" || t.tourism === "guest_house" || t.tourism === "apartment") category = "stay";
            else if (t.amenity === "restaurant" || t.amenity === "cafe" || t.amenity === "fast_food" || t.amenity === "food_court") category = "food";
            else if (t.amenity === "bus_station" || t.railway === "station") category = "transport";
            items.push({
              id: `${el.type}/${el.id}`,
              name,
              category,
              lat: c[0],
              lng: c[1],
              cuisine: t.cuisine,
              stars: t.stars,
              website: t.website || t["contact:website"],
            });
            if (items.length >= 200) break;
          }
          return Response.json({ items, radius, center: { lat, lng } });
        } catch (e: any) {
          return Response.json({ items: [], error: e?.message || "overpass failed" }, { status: 200 });
        }
      },
    },
  },
});
