import { redirect } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";

/**
 * Guard function for protected routes.
 * Checks if user is authenticated; redirects to /login if not.
 * Use in route's beforeLoad hook.
 */
export async function requireAuth(user: User | null, loading: boolean) {
  if (loading) {
    // Still loading auth state, let it proceed and check again
    return;
  }
  if (!user) {
    throw redirect({ to: "/login" });
  }
}
