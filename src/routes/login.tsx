import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { Eye, EyeOff, Shield, Globe, Zap, Moon, Sun, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BackgroundPathsEffect } from "@/components/ui/background-paths";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/contexts/auth-provider";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — VeriPolicy" },
      { name: "description", content: "Sign in to your VeriPolicy workspace." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { signIn, signInWithGoogle, configured } = useAuth();
  const [showPw, setShowPw] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { theme, toggle } = useTheme();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configured) {
      toast.error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env");
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      toast.error(error);
      return;
    }

    toast.success("Signed in successfully");
    navigate({ to: "/home" });
  };

  const googleSignIn = async () => {
    if (!configured) {
      toast.error("Supabase is not configured.");
      return;
    }

    const { error } = await signInWithGoogle();
    if (error) toast.error(error);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <BackgroundPathsEffect />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.12),_transparent_30%)] pointer-events-none" />
      <div className="absolute top-4 right-4 z-20">
        <button onClick={toggle} aria-label="Toggle theme"
          className="grid h-9 w-9 place-items-center rounded-md border border-border bg-background/80 text-muted-foreground hover:text-foreground backdrop-blur-sm transition">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>

      <div className="relative z-20 mx-auto grid min-h-screen max-w-6xl items-center gap-12 px-6 py-12 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}
          className="hidden lg:block"
        >
          <h1 className="font-display text-5xl font-bold leading-tight tracking-tight xl:text-6xl">
            Policy shifts.<br />
            The world responds.<br />
            <span style={{ color: "var(--accent-cyan)" }}>Be the first to know.</span>
          </h1>
          <p className="mt-6 max-w-md text-muted-foreground">
            Analyst-grade foresight briefs grounded in real SIPRI and OWID historical data — generated in under two seconds.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {[
              { icon: Shield, label: "Defence Intel" },
              { icon: Globe, label: "Climate Signals" },
              { icon: Zap, label: "Strategic Tech" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="glass flex items-center gap-2 rounded-full px-4 py-2 text-xs font-mono-data">
                <Icon className="h-3.5 w-3.5" style={{ color: "var(--accent-cyan)" }} />
                {label}
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
          className="glass mx-auto w-full max-w-md rounded-2xl p-8 shadow-2xl"
        >
          <div className="font-display text-2xl font-bold" style={{ color: "var(--accent-cyan)" }}>VeriPolicy</div>
          <h2 className="mt-6 font-display text-2xl font-semibold">Sign in to your workspace</h2>
          <p className="mt-1 text-sm text-muted-foreground">Welcome back. Pick up where you left off.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <label className="font-mono-data text-xs uppercase tracking-wider text-muted-foreground">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="analyst@veripolicy.io"
                required
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <label className="font-mono-data text-xs uppercase tracking-wider text-muted-foreground">Password</label>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="bg-background pr-10"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full font-display font-semibold"
              style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" className="w-full gap-2" disabled={loading} onClick={googleSignIn}>
            <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </Button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
