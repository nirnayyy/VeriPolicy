import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { logActivity, seedWelcomeBrief } from "@/lib/supabase/dashboard";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    metadata: { full_name: string; organization: string; role: string },
  ) => Promise<{ error: string | null; needsEmailConfirmation: boolean }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    const supabase = getSupabase();

    // Handle OAuth redirect flow: parse session from URL if present
    // then fall back to reading the current session. This ensures
    // that after redirecting back from Google OAuth the client
    // captures and persists the session immediately.
    let subscription: { unsubscribe: () => void } | undefined;

    (async () => {
      try {
        // Try to retrieve a session encoded in the URL (OAuth redirect)
        // `getSessionFromUrl` will parse and store the session if present.
        // If it returns a session, we can initialize state from it.
        // If not available, continue to get the current session.
        // Note: some runtimes may not support this method; ignore errors.
        // @ts-ignore - method available on supabase-js v2 client
        const fromUrl = await supabase.auth.getSessionFromUrl();
        if (fromUrl?.data?.session) {
          setSession(fromUrl.data.session);
          setUser(fromUrl.data.session.user ?? null);
          setLoading(false);
        }
      } catch (e) {
        // ignore - fall through to normal session check
      }

      // Ensure we read any existing persisted session
      try {
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
        setUser(data.session?.user ?? null);
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }

      try {
        const {
          data: { subscription: sub },
        } = supabase.auth.onAuthStateChange((_event, nextSession) => {
          setSession(nextSession);
          setUser(nextSession?.user ?? null);
          setLoading(false);
        });
        subscription = sub;
      } catch (e) {
        // ignore
      }
    })();

    return () => subscription?.unsubscribe?.();
  }, [configured]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };

    if (data.user) {
      await logActivity(data.user.id, "Signed in to workspace").catch(() => undefined);
    }

    return { error: null };
  }, []);

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      metadata: { full_name: string; organization: string; role: string },
    ) => {
      const { data, error } = await getSupabase().auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/home` : undefined,
        },
      });

      if (error) return { error: error.message, needsEmailConfirmation: false };

      const needsEmailConfirmation = !data.session;

      if (data.user && data.session) {
        await seedWelcomeBrief(data.user.id).catch(() => undefined);
        await logActivity(data.user.id, "Account created · Workspace provisioned").catch(() => undefined);
      }

      return { error: null, needsEmailConfirmation };
    },
    [],
  );

  const signInWithGoogle = useCallback(async () => {
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider: "google",
      options: {
        // Use a dedicated callback route so the app can parse the
        // OAuth response from the URL before client-side routing runs.
        redirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth-callback` : undefined,
      },
    });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut();
  }, []);

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      configured,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
    }),
    [user, session, loading, configured, signIn, signUp, signInWithGoogle, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
