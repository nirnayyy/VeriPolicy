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
import type { Database } from "./types.js";

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
 * Default client — uses project anon key, no user session.
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
 * Admin client — bypasses RLS via the service role key. Required for
 * server-side policy_feed reads/writes because the table is restricted to
 * authenticated users and the anon key cannot see rows.
 */
export function getSupabaseAdmin(): SupabaseClient<Database> {
  const env = (typeof process !== "undefined" && process.env) || {};
  const url = env.VITE_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing Supabase admin env vars. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in server env.",
    );
  }

  return createClient<Database>(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Resolves the best Supabase client for shared policy_feed operations:
 * 1. Service role (production admin endpoints)
 * 2. Caller's access token (preview/dev when service role is unavailable)
 * 3. Anon key (last resort)
 */
export function getSupabaseForPolicyFeed(request?: Request): SupabaseClient<Database> {
  const env = (typeof process !== "undefined" && process.env) || {};
  if (env.SUPABASE_SERVICE_ROLE_KEY && env.VITE_SUPABASE_URL) {
    return getSupabaseAdmin();
  }

  if (request) {
    const authHeader = request.headers.get("authorization") ?? "";
    const accessToken = authHeader.match(/^Bearer\s+(.+)$/i)?.[1];
    if (accessToken) {
      return getSupabaseForUser(accessToken);
    }
  }

  return getSupabase();
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
