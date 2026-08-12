/**
 * Social layer (Instagram-style) for travel: creators, reels/stories/posts,
 * comments, likes, follows, business reviews and creator itineraries.
 * Reads are public (anon policies); writes require a signed-in user.
 */
import { supabase } from "@/integrations/supabase/client";

export interface Creator {
  id: string;
  user_id: string | null;
  handle: string;
  name: string;
  kind: "influencer" | "vendor";
  category: string | null;
  city: string;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  verified: boolean;
  followers: number;
  phone: string | null;
  address: string | null;
  price_level: string | null;
  rating: number | null;
  lat: number | null;
  lng: number | null;
  maps_url: string | null;
  website: string | null;
}

export interface Post {
  id: string;
  creator_id: string;
  kind: "reel" | "story" | "post";
  media_url: string;
  video_url: string | null;
  caption: string | null;
  place_name: string | null;
  lat: number | null;
  lng: number | null;
  tags: string[];
  likes: number;
  created_at: string;
  creator?: Creator | null;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string | null;
  author_name: string;
  body: string;
  created_at: string;
}

export interface Review {
  id: string;
  creator_id: string;
  user_id: string | null;
  author_name: string;
  rating: number;
  body: string | null;
  created_at: string;
}

export interface CreatorItinerary {
  id: string;
  creator_id: string;
  title: string;
  summary: string | null;
  city: string;
  budget_inr: number | null;
  days: Array<{
    day: number;
    stops: Array<{ time?: string; title: string; note?: string; cost?: number }>;
  }>;
}

const CREATOR_COLS = "*";
const POST_SELECT = `*, creator:creators(${CREATOR_COLS})`;

export async function listCreators(kind?: "influencer" | "vendor"): Promise<Creator[]> {
  let q = supabase.from("creators").select(CREATOR_COLS).order("followers", { ascending: false });
  if (kind) q = q.eq("kind", kind);
  const { data } = await q;
  return (data ?? []) as unknown as Creator[];
}

export async function getCreator(handle: string): Promise<Creator | null> {
  const { data } = await supabase.from("creators").select(CREATOR_COLS).eq("handle", handle).maybeSingle();
  return (data as unknown as Creator) ?? null;
}

export async function listPosts(opts?: { kind?: Post["kind"]; creatorId?: string; limit?: number }) {
  let q = supabase.from("posts").select(POST_SELECT).order("created_at", { ascending: false });
  if (opts?.kind) q = q.eq("kind", opts.kind);
  if (opts?.creatorId) q = q.eq("creator_id", opts.creatorId);
  if (opts?.limit) q = q.limit(opts.limit);
  const { data } = await q;
  return (data ?? []) as unknown as Post[];
}

export async function getPost(id: string): Promise<Post | null> {
  const { data } = await supabase.from("posts").select(POST_SELECT).eq("id", id).maybeSingle();
  return (data as unknown as Post) ?? null;
}

export async function listComments(postId: string): Promise<Comment[]> {
  const { data } = await supabase
    .from("post_comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  return (data ?? []) as unknown as Comment[];
}

export async function addComment(postId: string, userId: string, authorName: string, body: string) {
  const { error } = await supabase
    .from("post_comments")
    .insert({ post_id: postId, user_id: userId, author_name: authorName, body });
  if (error) throw error;
}

export async function commentCounts(postIds: string[]): Promise<Record<string, number>> {
  if (!postIds.length) return {};
  const { data } = await supabase.from("post_comments").select("post_id").in("post_id", postIds);
  const out: Record<string, number> = {};
  for (const row of (data ?? []) as Array<{ post_id: string }>) {
    out[row.post_id] = (out[row.post_id] ?? 0) + 1;
  }
  return out;
}

export async function listMyLikes(userId: string): Promise<string[]> {
  const { data } = await supabase.from("post_likes").select("post_id").eq("user_id", userId);
  return ((data ?? []) as Array<{ post_id: string }>).map((r) => r.post_id);
}

export async function toggleLike(postId: string, userId: string, liked: boolean) {
  if (liked) {
    await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", userId);
  } else {
    await supabase.from("post_likes").insert({ post_id: postId, user_id: userId });
  }
}

export async function likeCounts(postIds: string[]): Promise<Record<string, number>> {
  if (!postIds.length) return {};
  const { data } = await supabase.from("post_likes").select("post_id").in("post_id", postIds);
  const out: Record<string, number> = {};
  for (const row of (data ?? []) as Array<{ post_id: string }>) {
    out[row.post_id] = (out[row.post_id] ?? 0) + 1;
  }
  return out;
}

export async function listMyFollows(userId: string): Promise<string[]> {
  const { data } = await supabase.from("follows").select("creator_id").eq("user_id", userId);
  return ((data ?? []) as Array<{ creator_id: string }>).map((r) => r.creator_id);
}

export async function toggleFollow(creatorId: string, userId: string, following: boolean) {
  if (following) {
    await supabase.from("follows").delete().eq("creator_id", creatorId).eq("user_id", userId);
  } else {
    await supabase.from("follows").insert({ creator_id: creatorId, user_id: userId });
  }
}

export async function listItineraries(creatorId?: string): Promise<CreatorItinerary[]> {
  let q = supabase.from("creator_itineraries").select("*").order("created_at", { ascending: false });
  if (creatorId) q = q.eq("creator_id", creatorId);
  const { data } = await q;
  return (data ?? []) as unknown as CreatorItinerary[];
}

export async function listReviews(creatorId?: string): Promise<Review[]> {
  let q = supabase.from("reviews").select("*").order("created_at", { ascending: false });
  if (creatorId) q = q.eq("creator_id", creatorId);
  const { data } = await q;
  return (data ?? []) as unknown as Review[];
}

export async function addReview(
  creatorId: string,
  userId: string,
  authorName: string,
  rating: number,
  body: string,
) {
  const { error } = await supabase
    .from("reviews")
    .insert({ creator_id: creatorId, user_id: userId, author_name: authorName, rating, body });
  if (error) throw error;
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 60) return `${Math.max(1, m)}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

export function compact(n: number): string {
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}
