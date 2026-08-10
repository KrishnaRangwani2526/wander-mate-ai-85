import { useEffect, useMemo, useRef } from "react";
import type { Destination } from "@/data/destinations";

export type Poi = {
  id: string;
  name: string;
  category: "tourist" | "viewpoint" | "food" | "stay" | "transport" | "saved";
  lat: number;
  lng: number;
};

type Props = {
  stops: Destination[];
  active: number;
  onPick: (i: number) => void;
  pois?: Poi[];
  selectedPoiIds?: string[];
  onTogglePoi?: (id: string) => void;
  poiRouteOrder?: string[]; // ordered list of selected POI ids for polyline
  cityFocus?: boolean;
  heightClass?: string;
};

const CATEGORY_COLORS: Record<string, string> = {
  tourist: "#7c3aed",
  viewpoint: "#0284c7",
  food: "#dc2626",
  stay: "#059669",
  transport: "#374151",
  saved: "#e07a3c",
};

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(x)));
}

export default function LeafletMap({
  stops, active, onPick, pois = [], selectedPoiIds = [], onTogglePoi, poiRouteOrder = [], cityFocus = false, heightClass = "h-[480px]",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layersRef = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);
  const onPickRef = useRef(onPick);
  const onToggleRef = useRef(onTogglePoi);
  onPickRef.current = onPick;
  onToggleRef.current = onTogglePoi;

  const selectedSet = useMemo(() => new Set(selectedPoiIds), [selectedPoiIds]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;
      const map = L.map(containerRef.current, { zoomControl: true, scrollWheelZoom: false }).setView([22.5, 79], 5);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      mapRef.current = map;
      renderAll();
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function renderAll() {
    const map = mapRef.current;
    if (!map) return;
    const L = (await import("leaflet")).default;

    for (const layer of layersRef.current) map.removeLayer(layer);
    layersRef.current = [];
    markersRef.current = [];

    if (stops.length === 0 && pois.length === 0) return;

    // Multi-city route line
    if (stops.length > 1 && !cityFocus) {
      const line = L.polyline(stops.map((s) => [s.lat, s.lng] as [number, number]), { color: "#e07a3c", weight: 4, opacity: 0.85, dashArray: "8 6" }).addTo(map);
      layersRef.current.push(line);
    }

    // Stop markers
    stops.forEach((s, i) => {
      const isActive = i === active;
      const html = `<div style="display:flex;align-items:center;justify-content:center;width:${isActive ? 34 : 28}px;height:${isActive ? 34 : 28}px;border-radius:9999px;background:${isActive ? "#e07a3c" : "white"};color:${isActive ? "white" : "#e07a3c"};border:3px solid #e07a3c;font-weight:700;font-size:12px;box-shadow:0 4px 10px rgba(0,0,0,0.18);">${i + 1}</div>`;
      const icon = L.divIcon({ html, className: "wc-stop-marker", iconSize: [isActive ? 34 : 28, isActive ? 34 : 28], iconAnchor: [isActive ? 17 : 14, isActive ? 17 : 14] });
      const marker = L.marker([s.lat, s.lng], { icon }).addTo(map).bindPopup(`<b>${i + 1}. ${s.name}</b><br/><small>${s.state}</small>`).on("click", () => onPickRef.current(i));
      layersRef.current.push(marker);
      markersRef.current.push(marker);
    });

    // POI markers
    for (const p of pois) {
      const selected = selectedSet.has(p.id);
      const color = CATEGORY_COLORS[p.category] || "#666";
      const size = selected ? 22 : 16;
      const html = `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:${selected ? 3 : 2}px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);"></div>`;
      const icon = L.divIcon({ html, className: "wc-poi-marker", iconSize: [size, size], iconAnchor: [size/2, size/2] });
      const marker = L.marker([p.lat, p.lng], { icon }).addTo(map).bindPopup(`<b>${p.name}</b><br/><small>${p.category}</small><br/><button onclick="window.dispatchEvent(new CustomEvent('wc:poi:toggle',{detail:'${p.id}'}))" style="margin-top:6px;padding:4px 8px;background:#111;color:#fff;border-radius:9999px;border:0;font-size:11px;cursor:pointer;">${selected ? "Remove from route" : "Add to route"}</button>`);
      layersRef.current.push(marker);
    }

    // POI route polyline (shortest path from ordered list)
    if (poiRouteOrder.length >= 2) {
      const points = poiRouteOrder.map((id) => pois.find((p) => p.id === id)).filter(Boolean) as Poi[];
      if (points.length >= 2) {
        let totalKm = 0;
        for (let i = 1; i < points.length; i++) totalKm += haversineKm(points[i-1], points[i]);
        const line = L.polyline(points.map((p) => [p.lat, p.lng] as [number, number]), { color: "#111827", weight: 3, opacity: 0.9 }).addTo(map);
        line.bindTooltip(`${totalKm} km · ${points.length} stops`, { permanent: false, sticky: true });
        layersRef.current.push(line);
      }
    }

    // Fit
    const all: [number, number][] = [
      ...stops.map((s) => [s.lat, s.lng] as [number, number]),
      ...(cityFocus ? pois.map((p) => [p.lat, p.lng] as [number, number]) : []),
    ];
    if (all.length === 1) map.setView(all[0], cityFocus ? 13 : 9);
    else if (all.length > 1) map.fitBounds(L.latLngBounds(all), { padding: [40, 40] });
  }

  useEffect(() => { renderAll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [stops, active, pois, selectedPoiIds, poiRouteOrder, cityFocus]);

  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      onToggleRef.current?.(id);
    };
    window.addEventListener("wc:poi:toggle", handler);
    return () => window.removeEventListener("wc:poi:toggle", handler);
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !stops[active]) return;
    const s = stops[active];
    map.panTo([s.lat, s.lng], { animate: true });
    const marker = markersRef.current[active];
    if (marker) marker.openPopup();
  }, [active, stops]);

  return <div ref={containerRef} className={`${heightClass} w-full`} style={{ background: "#dfeaf2" }} />;
}
