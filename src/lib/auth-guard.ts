import { redirect } from "@tanstack/react-router";
import { getSupabase, isSupabaseConfigured } from "./supabase/client";

/**
 * Global auth guard for TanStack Router routes.
 * Centralizes authentication checks to prevent code duplication.
 */
export async function requireAuth() {
  if (!isSupabaseConfigured()) {
    throw redirect({ to: "/login" });
  }

  const supabase = getSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    throw redirect({ to: "/login" });
  }

  return session;
}
