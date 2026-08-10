/**
 * Keeps the session-scoped trip store in sync with the signed-in user's
 * cloud trips: pulls on sign-in, pushes on change. Signed-out visitors keep
 * working purely from sessionStorage.
 */
import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getTrip, patchTrip, useTrip } from "@/lib/tripStore";
import { listCloudTrips, upsertCloudTrip, deleteCloudTrip } from "@/lib/cloudTrips";

export function TripSync() {
  const { user } = useAuth();
  const [trip] = useTrip();
  const hydrated = useRef(false);
  const lastPush = useRef<string>("");

  // Pull on sign-in, merging any locally-saved trips upward.
  useEffect(() => {
    if (!user) {
      hydrated.current = false;
      return;
    }
    let cancelled = false;
    (async () => {
      const cloud = await listCloudTrips();
      const local = getTrip().savedTrips ?? [];
      const cloudIds = new Set(cloud.map((c) => c.id));
      for (const l of local) {
        if (!cloudIds.has(l.id)) {
          try {
            await upsertCloudTrip(user.id, l.name, l.itinerary, l.id);
          } catch {
            /* ignore */
          }
        }
      }
      const merged = [
        ...cloud.map((c) => ({
          id: c.id,
          name: c.name,
          saved_at: new Date(c.updated_at).getTime(),
          itinerary: c.data,
        })),
        ...local.filter((l) => !cloudIds.has(l.id)),
      ];
      if (cancelled) return;
      hydrated.current = true;
      lastPush.current = JSON.stringify(merged);
      patchTrip({ savedTrips: merged });
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Push local changes up.
  useEffect(() => {
    if (!user || !hydrated.current) return;
    const saved = trip.savedTrips ?? [];
    const snapshot = JSON.stringify(saved);
    if (snapshot === lastPush.current) return;
    const prev: any[] = JSON.parse(lastPush.current || "[]");
    lastPush.current = snapshot;
    (async () => {
      for (const s of saved) {
        const before = prev.find((p) => p.id === s.id);
        if (!before || JSON.stringify(before) !== JSON.stringify(s)) {
          try {
            await upsertCloudTrip(user.id, s.name, s.itinerary, s.id);
          } catch {
            /* ignore */
          }
        }
      }
      for (const p of prev) {
        if (!saved.find((s) => s.id === p.id)) await deleteCloudTrip(p.id);
      }
    })();
  }, [trip.savedTrips, user]);

  return null;
}
