import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

let client: SupabaseClient<Database> | null = null;

export function getSupabase(): SupabaseClient<Database> {
  const supabaseUrl =
    import.meta.env?.VITE_SUPABASE_URL ??
    (typeof process !== "undefined" ? process.env.VITE_SUPABASE_URL : undefined);
  const supabaseAnonKey =
    import.meta.env?.VITE_SUPABASE_ANON_KEY ??
    (typeof process !== "undefined" ? process.env.VITE_SUPABASE_ANON_KEY : undefined);

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env",
    );
  }

  if (!client) {
    client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return client;
}

export function isSupabaseConfigured(): boolean {
  const supabaseUrl =
    import.meta.env?.VITE_SUPABASE_URL ??
    (typeof process !== "undefined" ? process.env.VITE_SUPABASE_URL : undefined);
  const supabaseAnonKey =
    import.meta.env?.VITE_SUPABASE_ANON_KEY ??
    (typeof process !== "undefined" ? process.env.VITE_SUPABASE_ANON_KEY : undefined);
  return Boolean(supabaseUrl && supabaseAnonKey);
}
