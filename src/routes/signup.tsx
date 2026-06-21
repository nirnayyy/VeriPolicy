import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  Eye,
  EyeOff,
  ShieldCheck,
  Globe2,
  Database,
  Moon,
  Sun,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/contexts/auth-provider";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create account — VeriPolicy" },
      {
        name: "description",
        content:
          "Request access to the VeriPolicy analyst workspace — decision-ready foresight briefs grounded in primary-source data.",
      },
    ],
  }),
  component: SignupPage,
});

function GeometryBackdrop() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <pattern id="signup-grid" width="56" height="56" patternUnits="userSpaceOnUse">
          <path d="M56 0H0V56" fill="none" stroke="currentColor" strokeOpacity="0.08" />
        </pattern>
        <radialGradient id="signup-glow" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#efa3a0" stopOpacity="0.55" />
          <stop offset="55%" stopColor="#f8dec7" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#fbecd5" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#signup-glow)" />
      <rect width="100%" height="100%" fill="url(#signup-grid)" className="text-[var(--primary)]" />
    </svg>
  );
}

function SignupPage() {
  const navigate = useNavigate();
  const { signUp, signInWithGoogle, configured } = useAuth();
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const { theme, toggle } = useTheme();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!configured) {
      toast.error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    const { error, needsEmailConfirmation } = await signUp(email, password, {
      full_name: fullName,
      organization,
      role,
    });
    setLoading(false);

    if (error) {
      toast.error(error);
      return;
    }

    if (needsEmailConfirmation) {
      toast.success("Check your email to confirm your account before signing in.");
      navigate({ to: "/login" });
      return;
    }

    toast.success("Account created successfully");
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
    <div className="relative min-h-screen overflow-hidden bg-background">
      <GeometryBackdrop />
      <div className="dot-grid absolute inset-0 opacity-40" />

      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={toggle}
          aria-label="Toggle theme"
          className="grid h-9 w-9 place-items-center rounded-sm border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-12 px-6 py-12 lg:grid-cols-2">
        {/* Left */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="hidden lg:block"
        >
          <div className="inline-flex items-center gap-3 rounded-full border border-border bg-card/60 px-4 py-1.5 font-mono-data text-[10px] uppercase tracking-[0.28em] text-muted-foreground backdrop-blur">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            Vol. VII · Access Request
          </div>

          <h1 className="mt-6 font-display text-5xl font-medium leading-[1.02] tracking-tight xl:text-6xl">
            Join the desks that
            <br />
            <span className="font-serif-italic" style={{ color: "var(--primary)" }}>
              cannot afford to guess
            </span>
            .
          </h1>

          <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
            VeriPolicy is the in-house foresight desk for analysts working at the intersection of defence, climate, and strategic technology. Create your workspace to submit scenarios and receive referenced briefs in under two seconds.
          </p>

          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 font-mono-data text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-[var(--primary)]" />
              SIPRI-grounded
            </div>
            <div className="flex items-center gap-2">
              <Globe2 className="h-3.5 w-3.5 text-[var(--primary)]" />
              47 jurisdictions
            </div>
            <div className="flex items-center gap-2">
              <Database className="h-3.5 w-3.5 text-[var(--primary)]" />
              2.1M records indexed
            </div>
          </div>
        </motion.div>

        {/* Right */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="glass mx-auto w-full max-w-md rounded-sm p-8 shadow-[var(--shadow-elegant)]"
        >
          <div className="font-display text-2xl font-semibold tracking-tight text-primary">
            VeriPolicy
          </div>
          <p className="font-mono-data text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Office of Policy Intelligence
          </p>

          <h2 className="mt-6 font-display text-2xl font-medium">Create your workspace</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            For analysts, researchers, and policy professionals.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <label className="font-mono-data text-xs uppercase tracking-wider text-muted-foreground">
                Full name
              </label>
              <Input
                type="text"
                placeholder="Dr. Ananya Sharma"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="rounded-sm bg-background"
              />
            </div>

            <div className="space-y-2">
              <label className="font-mono-data text-xs uppercase tracking-wider text-muted-foreground">
                Work email
              </label>
              <Input
                type="email"
                placeholder="analyst@ministry.gov"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-sm bg-background"
              />
            </div>

            <div className="space-y-2">
              <label className="font-mono-data text-xs uppercase tracking-wider text-muted-foreground">
                Organization
              </label>
              <Input
                type="text"
                placeholder="Ministry of External Affairs"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                required
                className="rounded-sm bg-background"
              />
            </div>

            <div className="space-y-2">
              <label className="font-mono-data text-xs uppercase tracking-wider text-muted-foreground">
                Role
              </label>
              <Select value={role} onValueChange={setRole} required>
                <SelectTrigger className="rounded-sm bg-background">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="policy-analyst">Policy Analyst</SelectItem>
                  <SelectItem value="researcher">Researcher</SelectItem>
                  <SelectItem value="advisor">Senior Advisor</SelectItem>
                  <SelectItem value="diplomat">Diplomat / Foreign Service</SelectItem>
                  <SelectItem value="journalist">Journalist / Editor</SelectItem>
                  <SelectItem value="academic">Academic</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="font-mono-data text-xs uppercase tracking-wider text-muted-foreground">
                Password
              </label>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="rounded-sm bg-background pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="font-mono-data text-xs uppercase tracking-wider text-muted-foreground">
                Confirm password
              </label>
              <div className="relative">
                <Input
                  type={showConfirmPw ? "text" : "password"}
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className="rounded-sm bg-background pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw(!showConfirmPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-start gap-3 pt-1">
              <Checkbox
                id="terms"
                checked={acceptedTerms}
                onCheckedChange={(v) => setAcceptedTerms(v === true)}
                required
              />
              <label htmlFor="terms" className="text-xs leading-relaxed text-muted-foreground">
                I agree to the
                <Link to="/terms" className="font-medium text-primary hover:underline">
                  Terms of Service
                </Link>
                and
                <Link to="/terms" className="font-medium text-primary hover:underline">
                  Data Use Policy
                </Link>
                .
              </label>
            </div>

            <Button
              type="submit"
              disabled={!acceptedTerms || !role || loading}
              className="h-11 w-full rounded-sm font-mono-data text-[11px] uppercase tracking-[0.2em] shadow-[var(--shadow-elegant)]"
              style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Account"}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            variant="outline"
            disabled={loading}
            className="h-11 w-full gap-2 rounded-sm border-[var(--primary)] font-mono-data text-[11px] uppercase tracking-[0.18em] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)]"
            onClick={googleSignIn}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
