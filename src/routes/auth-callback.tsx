import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { getSupabase } from "@/lib/supabase/client";

export const Route = createFileRoute("/auth-callback")({
  head: () => ({
    meta: [
      { title: "Signing in — VeriPolicy" },
      { name: "description", content: "Processing authentication callback." },
    ],
  }),
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const supabase = getSupabase();
        // Parse and persist the session from the URL (if present).
        // @ts-ignore - getSessionFromUrl exists on supabase-js v2
        await supabase.auth.getSessionFromUrl();
      } catch (e) {
        // ignore
      } finally {
        // Redirect to home after processing the callback
        navigate({ to: "/home" });
      }
    })();
  }, [navigate]);

  return <div className="min-h-screen flex items-center justify-center">Processing sign-in…</div>;
}
