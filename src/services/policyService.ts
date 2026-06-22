import { getSupabase } from "@/lib/supabase/client";
import type { PolicyFeed } from "@/lib/supabase/types";

type NewPolicy = Omit<PolicyFeed, "id" | "created_at" | "updated_at">;

type PolicyUpdate = Partial<NewPolicy>;

export async function getPolicies(): Promise<PolicyFeed[]> {
  try {
    const supabase = getSupabase();
    const cutoff = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("policy_feed")
      .select("*")
      .or(`published_date.gte.${cutoff},and(published_date.is.null,created_at.gte.${cutoff})`)
      .order("published_date", { ascending: false });

    // Debugging logs: returned rows count and rows
    try {
      const rowCount = Array.isArray(data) ? data.length : 0;
      console.log("getPolicies: Returned Rows Count:", rowCount);
      console.log("getPolicies: Returned Rows:", data);
    } catch (logErr) {
      // swallow logging errors
      console.error("getPolicies: logging failure", logErr);
    }

    if (error) {
      console.error("getPolicies: Supabase Error:", error);
      throw error;
    }

    return data as PolicyFeed[];
  } catch (err: any) {
    // Log unexpected errors as well
    console.error("getPolicies: Unexpected Error:", err);
    throw new Error(`getPolicies error: ${err.message || String(err)}`);
  }
}

export async function getPolicy(id: string): Promise<PolicyFeed | null> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("policy_feed")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return data as PolicyFeed | null;
  } catch (err: any) {
    throw new Error(`getPolicy error: ${err.message || String(err)}`);
  }
}

export async function createPolicy(policy: NewPolicy): Promise<PolicyFeed> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("policy_feed")
      .insert(policy)
      .select()
      .single();

    if (error) throw error;
    return data as PolicyFeed;
  } catch (err: any) {
    throw new Error(`createPolicy error: ${err.message || String(err)}`);
  }
}

export async function updatePolicy(id: string, data: PolicyUpdate): Promise<PolicyFeed> {
  try {
    const supabase = getSupabase();
    const { data: updated, error } = await supabase
      .from("policy_feed")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return updated as PolicyFeed;
  } catch (err: any) {
    throw new Error(`updatePolicy error: ${err.message || String(err)}`);
  }
}

export async function deletePolicy(id: string): Promise<boolean> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from("policy_feed").delete().eq("id", id);
    if (error) throw error;
    return true;
  } catch (err: any) {
    throw new Error(`deletePolicy error: ${err.message || String(err)}`);
  }
}

const policyService = {
  getPolicies,
  getPolicy,
  createPolicy,
  updatePolicy,
  deletePolicy,
};

export default policyService;
