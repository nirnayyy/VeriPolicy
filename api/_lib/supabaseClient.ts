// Server-only Supabase client used by the Vercel serverless functions.
//
// This is a copy of the *factory* from src/lib/supabase/client.ts, but it
// lives inside /api/_lib so @vercel/node bundles it into each function.
// The client SPA keeps its own src/lib/supabase/client.ts (which uses
// import.meta.env + browser auth persistence); we intentionally do NOT share
// the module across the boundary because the env-access and auth-persistence
// needs differ and bundling a shared file across the boundary is exactly what
// breaks in production.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

function resolveEnv(): { url: string; anonKey: string } {
  // process.env is the canonical source in Vercel serverless (the VITE_ prefix
  // is preserved because the project already exposes these as VITE_ vars).
  const env = (typeof process !== "undefined" && process.env) || {};
  const url = env.VITE_SUPABASE_URL;
  const anonKey = env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your Vercel project env.",
    );
  }
  return { url, anonKey };
}

/**
 * Default client — uses project anon key, no user session. Used by admin
 * endpoints (policy-sync, generate-*-impact-brief) that act server-side.
 */
export function getSupabase(): SupabaseClient<Database> {
  const { url, anonKey } = resolveEnv();
  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Request-scoped client that forwards the caller's Supabase access token so
 * RLS evaluates as the calling user.
 */
export function getSupabaseForUser(accessToken: string): SupabaseClient<Database> {
  const { url, anonKey } = resolveEnv();
  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}
