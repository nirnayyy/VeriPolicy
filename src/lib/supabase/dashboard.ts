import { getSupabase } from "@/lib/supabase/client";
import type { ActivityEntry, Brief, Profile } from "@/lib/supabase/types";

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await getSupabase()
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function fetchBriefs(userId: string): Promise<Brief[]> {
  const { data, error } = await getSupabase()
    .from("briefs")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function fetchActivity(userId: string, limit = 10): Promise<ActivityEntry[]> {
  const { data, error } = await getSupabase()
    .from("activity_log")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function logActivity(userId: string, note: string): Promise<void> {
  const { error } = await getSupabase()
    .from("activity_log")
    .insert({ user_id: userId, note });

  if (error) throw error;
}

export async function syncProfileMetrics(userId: string): Promise<void> {
  // Manually sync profile metrics (triggers handle auto-sync on brief changes)
  const briefs = await fetchBriefs(userId);
  
  const briefsCount = briefs.length;
  const citationsCount = briefs.reduce((sum, brief) => sum + (brief.citations_count ?? 0), 0);
  
  // Calculate forecast accuracy: average of all published briefs' accuracy scores
  const publishedBriefs = briefs.filter(b => b.status === "Published");
  const forecastAccuracy = publishedBriefs.length > 0 
    ? publishedBriefs.reduce((sum, brief) => sum + (brief.forecast_accuracy ?? 0), 0) / publishedBriefs.length
    : 0;

  const { error } = await getSupabase()
    .from("profiles")
    .update({
      briefs_count: briefsCount,
      citations_count: citationsCount,
      forecast_accuracy: Math.round(forecastAccuracy * 100) / 100,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) throw error;
}

export async function seedWelcomeBrief(userId: string): Promise<void> {
  const { count, error: countError } = await getSupabase()
    .from("briefs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (countError) throw countError;
  if ((count ?? 0) > 0) return;

  const year = new Date().getFullYear();
  const { error } = await getSupabase().from("briefs").insert({
    user_id: userId,
    ref_id: `FB-${year}-0001`,
    title: "Welcome brief — explore the Scenario Simulator",
    status: "Draft",
    tag: "Onboarding",
    pages: 1,
    accent_color: "var(--primary)",
  });

  if (error) throw error;

  await logActivity(userId, "Workspace provisioned · Welcome brief created");
  await syncProfileMetrics(userId);
}

export async function upsertProfile(
  userId: string,
  updates: Partial<{ full_name: string; organization: string | null; role: string | null; station: string | null }>,
  email?: string,
): Promise<void> {
  const payload = { id: userId, ...updates } as any;
  if (email) payload.email = email;
  const { error } = await getSupabase()
    .from("profiles")
    .upsert(payload, { returning: "minimal" });

  if (error) throw error;
}

/**
 * Create a new brief with optional metric fields
 */
export async function createBrief(
  userId: string,
  data: {
    ref_id: string;
    title: string;
    status?: string;
    tag?: string | null;
    pages?: number;
    accent_color?: string | null;
    content?: Record<string, unknown> | null;
    citations_count?: number;
    forecast_accuracy?: number;
  }
): Promise<Brief> {
  // Prepare the insert data with safe defaults
  const insertData: any = {
    user_id: userId,
    ref_id: data.ref_id,
    title: data.title,
    status: data.status ?? "Draft",
    tag: data.tag ?? null,
    pages: Math.max(1, Math.floor(data.pages ?? 1)), // Ensure it's a positive integer
    accent_color: data.accent_color ?? "var(--primary)",
    content: data.content ?? null,
  };

  // Add optional metric fields if provided
  if (data.citations_count !== undefined) {
    insertData.citations_count = Math.max(0, Math.floor(data.citations_count));
  }
  if (data.forecast_accuracy !== undefined) {
    // Ensure forecast_accuracy is between 0 and 1
    insertData.forecast_accuracy = Math.max(0, Math.min(1, data.forecast_accuracy));
  }

  const { data: brief, error } = await getSupabase()
    .from("briefs")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error("Supabase insert error:", error);
    throw error;
  }
  return brief;
}

/**
 * Update an existing brief and its metrics
 */
export async function updateBrief(
  briefId: string,
  updates: Partial<Brief>
): Promise<Brief> {
  const { data: brief, error } = await getSupabase()
    .from("briefs")
    .update(updates)
    .eq("id", briefId)
    .select()
    .single();

  if (error) throw error;
  return brief;
}

/**
 * Delete a brief
 */
export async function deleteBrief(briefId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("briefs")
    .delete()
    .eq("id", briefId);

  if (error) throw error;
}

