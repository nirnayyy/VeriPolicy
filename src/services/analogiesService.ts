import { getSupabase } from "../lib/supabase/client";
import type { HistoricalAnalogy } from "../lib/supabase/types";

type NewAnalogy = Omit<HistoricalAnalogy, "id" | "created_at">;

export async function getAllAnalogies(): Promise<HistoricalAnalogy[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("historical_analogies")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data as HistoricalAnalogy[];
  } catch (err: any) {
    throw new Error(`getAllAnalogies error: ${err.message || String(err)}`);
  }
}

export async function getAnalogyByCountry(country: string): Promise<HistoricalAnalogy[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("historical_analogies")
      .select("*")
      .ilike("country", country)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data as HistoricalAnalogy[];
  } catch (err: any) {
    throw new Error(`getAnalogyByCountry error: ${err.message || String(err)}`);
  }
}

export async function createAnalogy(data: NewAnalogy): Promise<HistoricalAnalogy> {
  try {
    const supabase = getSupabase();
    const { data: inserted, error } = await supabase
      .from("historical_analogies")
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return inserted as HistoricalAnalogy;
  } catch (err: any) {
    throw new Error(`createAnalogy error: ${err.message || String(err)}`);
  }
}

export async function updateAnalogy(id: string, changes: Partial<NewAnalogy>): Promise<HistoricalAnalogy> {
  try {
    const supabase = getSupabase();
    const { data: updated, error } = await supabase
      .from("historical_analogies")
      .update(changes)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return updated as HistoricalAnalogy;
  } catch (err: any) {
    throw new Error(`updateAnalogy error: ${err.message || String(err)}`);
  }
}

export async function deleteAnalogy(id: string): Promise<boolean> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from("historical_analogies").delete().eq("id", id);
    if (error) throw error;
    return true;
  } catch (err: any) {
    throw new Error(`deleteAnalogy error: ${err.message || String(err)}`);
  }
}

const analogiesService = {
  getAllAnalogies,
  getAnalogyByCountry,
  createAnalogy,
  updateAnalogy,
  deleteAnalogy,
};

export default analogiesService;
