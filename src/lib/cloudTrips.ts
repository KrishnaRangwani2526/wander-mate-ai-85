/**
 * Per-user trip + chat persistence in Lovable Cloud.
 * Falls back silently when the visitor is signed out (sessionStorage still works).
 */
import { supabase } from "@/integrations/supabase/client";

export interface CloudTrip {
  id: string;
  name: string;
  data: any;
  updated_at: string;
}

export async function listCloudTrips(): Promise<CloudTrip[]> {
  const { data, error } = await supabase
    .from("saved_trips")
    .select("id,name,data,updated_at")
    .order("updated_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as CloudTrip[];
}

export async function upsertCloudTrip(userId: string, name: string, data: any, id?: string) {
  const row: Record<string, unknown> = { user_id: userId, name, data };
  if (id) row.id = id;
  const { data: res, error } = await supabase
    .from("saved_trips")
    .upsert(row as any)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return res?.id as string | undefined;
}

export async function deleteCloudTrip(id: string) {
  await supabase.from("saved_trips").delete().eq("id", id);
}

export async function logChat(userId: string, role: "user" | "assistant", content: string) {
  try {
    await supabase.from("chat_messages").insert({ user_id: userId, role, content });
  } catch {
    /* non-blocking */
  }
}

export async function loadChatHistory(limit = 50) {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("role,content,created_at")
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as Array<{ role: "user" | "assistant"; content: string; created_at: string }>;
}
