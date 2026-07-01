import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState, useMemo } from "react";
import {
  ArrowRight,
  FileText,
  ScrollText,
  Database,
  Globe2,
  ShieldCheck,
  BarChart3,
  Zap,
  Activity,
  TrendingUp,
  Clock,
  Sparkles,
  ArrowUpRight,
  Newspaper,
  Target,
  Radar,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-provider";
import { CrowdCanvas } from "@/components/CrowdCanvas";
import { useCountUp, useInView } from "@/hooks/use-animations";
import { fetchBriefs, fetchActivity } from "@/lib/supabase/dashboard";
import { getPolicies } from "@/services/policyService";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "VeriPolicy — Office of Policy Intelligence" },
      { name: "description", content: "Decision-ready foresight briefs on defence, climate, and strategic technology — grounded in primary-source historical record." },
    ],
  }),
  component: HomePage,
});

/* ═══════════════════════════════════════════════
   SHARED COMPONENTS
   ═══════════════════════════════════════════════ */

const SCENARIOS = [
  "India increases defence spending by 15%, cuts fossil fuel subsidies by 20%…",
  "Germany raises renewables target while maintaining NATO commitments at 2.5% GDP…",
  "United States reallocates climate budget toward semiconductor and AI infrastructure…",
];

function Typewriter() {
  const [text, setText] = useState("");
  const [i, setI] = useState(0);
  useEffect(() => {
    const full = SCENARIOS[i];
    let idx = 0;
    let typing = true;
    const tick = () => {
      if (typing) {
        idx++; setText(full.slice(0, idx));
        if (idx >= full.length) { typing = false; setTimeout(tick, 2200); return; }
      } else {
        idx--; setText(full.slice(0, idx));
        if (idx <= 0) { setI((p) => (p + 1) % SCENARIOS.length); return; }
      }
      setTimeout(tick, typing ? 36 : 18);
    };
    const t = setTimeout(tick, 80);
    return () => clearTimeout(t);
  }, [i]);
  return <span className="cursor-blink">{text}</span>;
}

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function Ornament({ label }: { label: string }) {
  return (
    <div className="ornament my-3 font-mono-data text-[10px] uppercase tracking-[0.32em]">
      <span>◆ {label} ◆</span>
    </div>
  );
}

function GeometryBackdrop() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <pattern id="vp-grid" width="56" height="56" patternUnits="userSpaceOnUse">
          <path d="M56 0H0V56" fill="none" stroke="currentColor" strokeOpacity="0.08" />
        </pattern>
        <radialGradient id="vp-glow" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#efa3a0" stopOpacity="0.55" />
          <stop offset="55%" stopColor="#f8dec7" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#fbecd5" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#vp-glow)" />
      <rect width="100%" height="100%" fill="url(#vp-grid)" className="text-[var(--primary)]" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════
   ANIMATED STAT CARD
   ═══════════════════════════════════════════════ */

function AnimatedStat({
  label,
  value,
  suffix = "",
  prefix = "",
  icon: Icon,
  delay = 0,
}: {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  icon: React.ElementType;
  delay?: number;
}) {
  const { ref, inView } = useInView();
  const { value: animatedValue } = useCountUp(value, {
    enabled: inView,
    duration: 2200,
    decimals: value < 10 ? 1 : 0,
  });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:shadow-[var(--shadow-elegant)] hover:-translate-y-0.5"
    >
      <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full opacity-10" style={{ background: "var(--primary)" }} />
      <div className="flex items-center gap-3">
        <div
          className="grid h-10 w-10 place-items-center rounded-xl transition-transform group-hover:scale-110"
          style={{ background: "color-mix(in oklab, var(--primary) 12%, transparent)", color: "var(--primary)" }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="font-mono-data text-[9px] uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
          <div className="font-display text-3xl font-semibold tabular-nums tracking-tight text-foreground">
            {prefix}{animatedValue}{suffix}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════
   LIVE PULSE DOT
   ═══════════════════════════════════════════════ */

function PulseDot({ color = "var(--accent-cyan)" }: { color?: string }) {
  return (
    <span className="relative flex h-2 w-2">
      <span
        className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
        style={{ background: color }}
      />
      <span
        className="relative inline-flex h-2 w-2 rounded-full"
        style={{ background: color }}
      />
    </span>
  );
}

/* ═══════════════════════════════════════════════
   QUICK ACTION CARD
   ═══════════════════════════════════════════════ */

function QuickActionCard({
  title,
  description,
  icon: Icon,
  to,
  accentColor,
  imageUrl,
  delay = 0,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  to: string;
  accentColor: string;
  imageUrl?: string;
  delay?: number;
}) {
  return (
    <Reveal delay={delay}>
      <Link to={to}>
        <div className="group relative h-full overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:shadow-[var(--shadow-elegant)] hover:-translate-y-1 cursor-pointer flex flex-col">
          {/* Hover gradient reveal */}
          <div
            className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 z-10"
            style={{ background: `linear-gradient(135deg, color-mix(in oklab, ${accentColor} 6%, transparent), transparent)` }}
          />

          {imageUrl && (
            <div className="relative h-36 w-full overflow-hidden border-b border-border">
              <img
                src={imageUrl}
                alt={title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent opacity-75" />
            </div>
          )}

          <div className="relative p-6 flex-1 flex flex-col justify-between z-20">
            <div>
              <div
                className="mb-4 grid h-12 w-12 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-110"
                style={{ background: `color-mix(in oklab, ${accentColor} 12%, transparent)`, color: accentColor }}
              >
                <Icon className="h-6 w-6" />
              </div>

              <h3 className="font-display text-xl font-semibold text-foreground">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
            </div>

            <div className="mt-5 flex items-center gap-1.5 font-mono-data text-[11px] uppercase tracking-wider transition-colors group-hover:text-foreground" style={{ color: accentColor }}>
              Open <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </div>
        </div>
      </Link>
    </Reveal>
  );
}

/* ═══════════════════════════════════════════════
   RECENT BRIEF ROW
   ═══════════════════════════════════════════════ */

function BriefRow({ title, status, date, refId }: { title: string; status: string; date: string; refId: string }) {
  const statusColors: Record<string, string> = {
    Draft: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    "In Review": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    Published: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    Archived: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800/40 dark:text-zinc-400",
  };

  return (
    <div className="group flex items-center gap-4 rounded-xl px-4 py-3 transition-colors hover:bg-muted/40">
      <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg" style={{ background: "color-mix(in oklab, var(--primary) 10%, transparent)" }}>
        <FileText className="h-4 w-4" style={{ color: "var(--primary)" }} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground">{title}</div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="font-mono-data text-[10px] text-muted-foreground">{refId}</span>
          <span className="text-muted-foreground/40">·</span>
          <span className="font-mono-data text-[10px] text-muted-foreground">{date}</span>
        </div>
      </div>
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${statusColors[status] ?? statusColors.Draft}`}>
        {status}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   POLICY PULSE TICKER ITEM
   ═══════════════════════════════════════════════ */

function PolicyPulseItem({ headline, category, time }: { headline: string; category: string; time: string }) {
  const categoryColors: Record<string, string> = {
    defence: "text-red-400",
    climate: "text-emerald-400",
    energy: "text-amber-400",
    other: "text-blue-400",
  };

  return (
    <div className="flex items-start gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-muted/40">
      <PulseDot color={category === "defence" ? "#f87171" : category === "climate" ? "#34d399" : category === "energy" ? "#fbbf24" : "#60a5fa"} />
      <div className="min-w-0 flex-1">
        <div className="text-sm leading-snug text-foreground line-clamp-2">{headline}</div>
        <div className="mt-1 flex items-center gap-2">
          <span className={`font-mono-data text-[9px] uppercase tracking-wider ${categoryColors[category] ?? categoryColors.other}`}>
            {category}
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span className="font-mono-data text-[9px] text-muted-foreground">{time}</span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SYSTEM HEALTH INDICATOR
   ═══════════════════════════════════════════════ */

function SystemHealthBar() {
  const systems = [
    { name: "Inference Engine", status: "operational" as const },
    { name: "Vector DB", status: "operational" as const },
    { name: "Policy Feed", status: "operational" as const },
    { name: "Auth Service", status: "operational" as const },
  ];

  return (
    <div className="flex flex-wrap items-center gap-4">
      {systems.map((sys) => (
        <div key={sys.name} className="flex items-center gap-2">
          <PulseDot color={sys.status === "operational" ? "#34d399" : "#f87171"} />
          <span className="font-mono-data text-[10px] uppercase tracking-wider text-muted-foreground">
            {sys.name}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   AUTHENTICATED DASHBOARD
   ═══════════════════════════════════════════════ */

function IntelligenceDashboard() {
  const { user } = useAuth();
  const [briefs, setBriefs] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [loadingBriefs, setLoadingBriefs] = useState(true);
  const [loadingPolicies, setLoadingPolicies] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchBriefs(user.id)
      .then((b) => setBriefs(b))
      .catch(() => {})
      .finally(() => setLoadingBriefs(false));
  }, [user]);

  useEffect(() => {
    getPolicies()
      .then((p) => setPolicies(p))
      .catch(() => {})
      .finally(() => setLoadingPolicies(false));
  }, []);

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Analyst";
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const recentBriefs = briefs.slice(0, 4);
  const recentPolicies = policies.slice(0, 5);
  const activeDrafts = briefs.filter((b) => b.status === "Draft" || b.status === "In Review").length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ── HEADER ── */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="paper absolute inset-0 opacity-40" />
        <div className="relative mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="font-mono-data text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                Intelligence Operations Center
              </div>
              <h1 className="mt-2 font-display text-4xl font-medium tracking-tight text-foreground sm:text-5xl">
                {greeting}, <span className="font-serif-italic" style={{ color: "var(--primary)" }}>{displayName}</span>.
              </h1>
              <p className="mt-3 max-w-lg text-base text-muted-foreground">
                Your intelligence desk is active. All systems operational.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <SystemHealthBar />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── ANIMATED STATS BAR ── */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8 -mt-6 relative z-10">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <AnimatedStat label="Briefs Generated" value={briefs.length} icon={FileText} delay={0} />
          <AnimatedStat label="Active Drafts" value={activeDrafts} icon={Target} delay={0.08} />
          <AnimatedStat label="Policy Events" value={policies.length} icon={Newspaper} delay={0.16} />
          <AnimatedStat label="Countries Indexed" value={20} icon={Globe2} delay={0.24} />
        </div>
      </section>

      {/* ── MAIN GRID ── */}
      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* LEFT: Quick Actions + Recent Briefs */}
          <div className="space-y-6">
            {/* Quick Action Cards */}
            <div>
              <div className="mb-4 font-mono-data text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Quick Actions</div>
              <div className="grid gap-4 sm:grid-cols-2">
                <QuickActionCard
                  title="Scenario Simulator"
                  description="Generate analyst-grade foresight memos from any policy scenario in under 2 seconds."
                  icon={Zap}
                  to="/simulator"
                  accentColor="var(--primary)"
                  imageUrl="/images/scenario-simulator.png"
                  delay={0}
                />
                <QuickActionCard
                  title="Policy Tracker"
                  description="Monitor live defence, climate, and energy policy developments across 47 jurisdictions."
                  icon={Radar}
                  to="/tracker"
                  accentColor="var(--accent-cyan)"
                  imageUrl="/images/policy-tracker.png"
                  delay={0.06}
                />
                <QuickActionCard
                  title="Data Comparison"
                  description="Compare CO₂ emissions and military expenditure trends across nations and epochs."
                  icon={BarChart3}
                  to="/comparison"
                  accentColor="var(--accent)"
                  imageUrl="/images/data-comparison.png"
                  delay={0.12}
                />
                <QuickActionCard
                  title="Analyst Dossier"
                  description="View your credentials, performance metrics, archived drafts, and session controls."
                  icon={ShieldCheck}
                  to="/profile"
                  accentColor="var(--primary)"
                  imageUrl="/images/analyst-dossier.png"
                  delay={0.18}
                />
              </div>
            </div>

            {/* Recent Briefs */}
            <Reveal delay={0.1}>
              <Card className="border-border bg-card overflow-hidden">
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" style={{ color: "var(--primary)" }} />
                    <span className="font-mono-data text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Recent Briefs</span>
                  </div>
                  <Link to="/profile" className="font-mono-data text-[10px] uppercase tracking-wider hover:text-foreground transition-colors" style={{ color: "var(--primary)" }}>
                    View All →
                  </Link>
                </div>
                <div className="divide-y divide-border/40">
                  {loadingBriefs ? (
                    <div className="space-y-3 p-5">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-4">
                          <div className="h-9 w-9 rounded-lg bg-muted animate-pulse" />
                          <div className="flex-1 space-y-2">
                            <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
                            <div className="h-2.5 w-1/3 rounded bg-muted animate-pulse" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : recentBriefs.length > 0 ? (
                    recentBriefs.map((brief) => (
                      <BriefRow
                        key={brief.id}
                        title={brief.title}
                        status={brief.status}
                        refId={brief.ref_id}
                        date={new Date(brief.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      />
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="grid h-14 w-14 place-items-center rounded-2xl" style={{ background: "color-mix(in oklab, var(--primary) 10%, transparent)" }}>
                        <Sparkles className="h-7 w-7" style={{ color: "var(--primary)" }} />
                      </div>
                      <p className="mt-4 text-sm font-medium text-foreground">No briefs yet</p>
                      <p className="mt-1 text-xs text-muted-foreground">Open the Scenario Simulator to draft your first foresight memo.</p>
                      <Link to="/simulator">
                        <Button size="sm" className="mt-4 gap-1.5" style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
                          <Zap className="h-3.5 w-3.5" /> Start Drafting
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </Card>
            </Reveal>
          </div>

          {/* RIGHT SIDEBAR: Policy Pulse + Activity */}
          <div className="space-y-6">
            {/* Live Policy Pulse */}
            <Reveal delay={0.08}>
              <Card className="border-border bg-card overflow-hidden">
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4" style={{ color: "var(--accent-cyan)" }} />
                    <span className="font-mono-data text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Policy Pulse</span>
                    <PulseDot />
                  </div>
                  <Link to="/tracker" className="font-mono-data text-[10px] uppercase tracking-wider hover:text-foreground transition-colors" style={{ color: "var(--accent-cyan)" }}>
                    Full Feed →
                  </Link>
                </div>
                <div className="max-h-[360px] overflow-y-auto divide-y divide-border/30">
                  {loadingPolicies ? (
                    <div className="space-y-3 p-5">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className="mt-1 h-2 w-2 rounded-full bg-muted animate-pulse" />
                          <div className="flex-1 space-y-2">
                            <div className="h-3 w-full rounded bg-muted animate-pulse" />
                            <div className="h-2.5 w-1/4 rounded bg-muted animate-pulse" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : recentPolicies.length > 0 ? (
                    recentPolicies.map((p: any, idx: number) => (
                      <PolicyPulseItem
                        key={p.id || idx}
                        headline={p.title || p.headline || "Untitled policy event"}
                        category={p.category || "other"}
                        time={p.published_date ? new Date(p.published_date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Recent"}
                      />
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                      <Newspaper className="h-8 w-8 text-muted-foreground/40" />
                      <p className="mt-3 text-sm text-muted-foreground">No policy events yet. Sync the live feed from the Policy Tracker.</p>
                    </div>
                  )}
                </div>
              </Card>
            </Reveal>

            {/* Platform Capabilities */}
            <Reveal delay={0.14}>
              <Card className="border-border bg-card p-5">
                <div className="font-mono-data text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-4">Platform Capabilities</div>
                <div className="space-y-3">
                  {[
                    { icon: Database, label: "20 historical analogies indexed", color: "var(--primary)" },
                    { icon: Globe2, label: "47 jurisdictions monitored", color: "var(--accent-cyan)" },
                    { icon: TrendingUp, label: "RAG-grounded precision scoring", color: "var(--accent)" },
                    { icon: Clock, label: "Sub-2 second memo generation", color: "var(--primary)" },
                  ].map((cap) => (
                    <div key={cap.label} className="flex items-center gap-3">
                      <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg" style={{ background: `color-mix(in oklab, ${cap.color} 12%, transparent)`, color: cap.color }}>
                        <cap.icon className="h-4 w-4" />
                      </div>
                      <span className="text-sm text-muted-foreground">{cap.label}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <Footer />
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MARKETING PAGE (UNAUTHENTICATED)
   ═══════════════════════════════════════════════ */

function MarketingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ░░ HERO ░░ */}
      <section className="relative overflow-hidden">
        <GeometryBackdrop />
        <div className="pointer-events-none absolute inset-0">
          <div className="float-slow absolute left-[6%] top-[18%] h-24 w-24 rounded-full border border-[var(--primary)]/30" style={{ ['--r' as any]: '0deg' }} />
          <div className="float-slow absolute right-[8%] top-[12%] h-16 w-16 rotate-45 border border-[var(--accent)]/60" style={{ ['--r' as any]: '45deg', animationDelay: '-3s' }} />
          <div className="float-slow absolute left-[14%] bottom-[14%] h-2 w-2 rounded-full bg-[var(--primary)]" />
          <svg className="absolute right-[14%] bottom-[20%] h-32 w-32 text-[var(--accent-cyan)] opacity-25" viewBox="0 0 100 100" aria-hidden>
            <polygon points="50,4 96,28 96,72 50,96 4,72 4,28" fill="none" stroke="currentColor" strokeWidth="0.6" />
            <polygon points="50,18 82,34 82,66 50,82 18,66 18,34" fill="none" stroke="currentColor" strokeWidth="0.6" />
            <polygon points="50,32 68,42 68,58 50,68 32,58 32,42" fill="none" stroke="currentColor" strokeWidth="0.6" />
          </svg>
        </div>

        <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-28 sm:pt-28 sm:pb-36">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="inline-flex items-center gap-3 rounded-full border border-border bg-card/60 px-4 py-1.5 font-mono-data text-[10px] uppercase tracking-[0.28em] text-muted-foreground backdrop-blur">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                Vol. VII · Bulletin 2026 / 06
              </div>

              <h1 className="mt-6 font-display text-5xl font-medium leading-[1.02] tracking-tight text-foreground sm:text-6xl md:text-7xl">
                From raw record to
                <br />
                <span className="font-serif-italic" style={{ color: "var(--primary)" }}>decision-ready</span>{" "}
                intelligence.
              </h1>

              <p className="mt-7 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                VeriPolicy is the in-house foresight desk for analysts working at the intersection of defence, climate, and strategic technology. Submit a scenario; receive a referenced, structured brief in under two seconds.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link to="/signup">
                  <Button size="lg" className="h-11 gap-2 rounded-sm bg-[var(--primary)] px-6 font-mono-data text-[11px] uppercase tracking-[0.2em] text-[var(--primary-foreground)] shadow-[var(--shadow-elegant)] hover:bg-[color-mix(in_oklab,var(--primary)_88%,black)]">
                    Get Started <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline" className="h-11 rounded-sm border-[var(--primary)] px-6 font-mono-data text-[11px] uppercase tracking-[0.2em] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)]">
                    Sign In
                  </Button>
                </Link>
              </div>

              <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 font-mono-data text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                <div className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-[var(--primary)]" /> SIPRI-grounded</div>
                <div className="flex items-center gap-2"><Globe2 className="h-3.5 w-3.5 text-[var(--primary)]" /> 47 jurisdictions</div>
                <div className="flex items-center gap-2"><Database className="h-3.5 w-3.5 text-[var(--primary)]" /> 2.1M records indexed</div>
              </div>
            </div>

            {/* Brief specimen card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              <div className="absolute -inset-4 -z-10 rounded-sm bg-[var(--accent)]/20 blur-2xl" />
              <div className="relative overflow-hidden rounded-sm border border-border bg-card shadow-[var(--shadow-elegant)]">
                <div className="flex items-center justify-between border-b border-border bg-[var(--surface)] px-5 py-3">
                  <div className="flex items-center gap-2 font-mono-data text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />
                    Foresight Memo · Specimen
                  </div>
                  <span className="font-mono-data text-[10px] text-muted-foreground">VP-2026-0617-A</span>
                </div>
                <div className="px-6 pt-6">
                  <div className="font-mono-data text-[10px] uppercase tracking-[0.28em] text-[var(--primary)]">Subject</div>
                  <h3 className="mt-1 font-display text-2xl font-medium leading-tight text-foreground">
                    Indo-Pacific defence procurement and the renewables-subsidy reallocation question.
                  </h3>
                </div>
                <div className="px-6 pb-2 pt-4">
                  <Ornament label="Scenario Input" />
                  <div className="rounded-sm border border-border bg-[var(--surface)] px-4 py-3 font-mono-data text-xs leading-relaxed text-foreground/80">
                    <span style={{ color: "var(--primary)" }}>→ </span><Typewriter />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-px bg-border">
                  {[
                    { k: "Confidence", v: "0.82", note: "n = 14 analogues" },
                    { k: "Time horizon", v: "0–24 mo", note: "Q3'26 → Q3'28" },
                    { k: "Primary domain", v: "Defence ×", note: "Energy policy" },
                    { k: "Generated in", v: "1.4 s", note: "Llama 3.3 / Groq" },
                  ].map((m) => (
                    <div key={m.k} className="bg-card px-5 py-4">
                      <div className="font-mono-data text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{m.k}</div>
                      <div className="mt-1 font-display text-xl text-foreground">{m.v}</div>
                      <div className="font-mono-data text-[10px] text-muted-foreground">{m.note}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ░░ MANDATE ░░ */}
      <section className="border-t border-border bg-[var(--surface)] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal>
            <div className="grid gap-10 md:grid-cols-[1fr_2fr]">
              <div>
                <div className="font-mono-data text-[10px] uppercase tracking-[0.28em] text-muted-foreground">§ 01 · Mandate</div>
                <h2 className="mt-3 font-display text-4xl font-medium leading-tight text-foreground">
                  Built for the desks that<br />
                  <span className="font-serif-italic" style={{ color: "var(--primary)" }}>cannot afford to guess</span>.
                </h2>
              </div>
              <div className="space-y-5 border-l border-border pl-8 text-base leading-relaxed text-muted-foreground">
                <p>
                  VeriPolicy was assembled for analysts inside ministries, multilateral secretariats, and policy research desks — staff who write the brief that the principal will sign.
                </p>
                <p>
                  Every claim is anchored to a primary source: SIPRI armament transfers, OWID emissions and energy data, and the public regulatory record across 47 jurisdictions. No synthetic citations. No speculative chains of inference. The model retrieves, the analyst decides.
                </p>
                <p className="font-serif-italic text-foreground/80">
                  &ldquo;The discipline of the brief is the discipline of the evidence.&rdquo;
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ░░ METHOD ░░ */}
      <section className="border-t border-border py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <div className="font-mono-data text-[10px] uppercase tracking-[0.28em] text-muted-foreground">§ 02 · Method</div>
            <h2 className="mt-2 font-display text-4xl font-medium text-foreground">A four-stage protocol</h2>
            <Ornament label="In Strict Sequence" />
          </div>

          <div className="grid gap-px overflow-hidden rounded-sm border border-border bg-border md:grid-cols-4">
            {[
              { n: "I", t: "Scenario intake", d: "The analyst describes a policy change in natural language. No schema, no taxonomy." },
              { n: "II", t: "Evidence retrieval", d: "Vector search across SIPRI, OWID, and the regulatory corpus surfaces the closest historical analogues." },
              { n: "III", t: "Synthesis", d: "Llama 3.3 70B drafts a structured memo: summary, trajectory, second-order effects, open questions." },
              { n: "IV", t: "Brief delivery", d: "Export as a referenced .txt or .pdf, ready for the principal's binder." },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 0.08}>
                <div className="h-full bg-card p-7">
                  <div className="font-display text-5xl font-medium leading-none" style={{ color: "var(--primary)" }}>{s.n}</div>
                  <div className="mt-4 font-mono-data text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Stage {s.n}</div>
                  <h3 className="mt-1 font-display text-xl font-medium text-foreground">{s.t}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ░░ CAPABILITIES ░░ */}
      <section className="relative border-t border-border bg-[var(--surface)] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14">
            <div className="font-mono-data text-[10px] uppercase tracking-[0.28em] text-muted-foreground">§ 03 · Capabilities</div>
            <h2 className="mt-2 font-display text-4xl font-medium text-foreground">Two tools. One intelligence desk.</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {[
              {
                badge: "Scenario Simulator",
                icon: FileText,
                accent: "var(--primary)",
                imageUrl: "/images/scenario-simulator.png",
                title: "Generate analyst-grade foresight memos from policy scenarios.",
                lines: [
                  "Vector search across historical analogues",
                  "Confidence scoring from SIPRI and OWID data",
                  "Structured memo in under 2 seconds",
                  "Export as .txt or .pdf for circulation",
                ],
              },
              {
                badge: "Policy Tracker",
                icon: Globe2,
                accent: "var(--accent-cyan)",
                imageUrl: "/images/policy-tracker.png",
                title: "Real-time monitoring of defence and climate policy developments.",
                lines: [
                  "Live policy feed across 47 jurisdictions",
                  "Impact brief generation on demand",
                  "Scenario simulation on tracked policies",
                  "Saved items for offline review",
                ],
              },
            ].map((d, i) => (
              <Reveal key={d.badge} delay={i * 0.08}>
                <div className="group relative h-full overflow-hidden rounded-sm border border-border bg-card transition-shadow hover:shadow-[var(--shadow-elegant)] flex flex-col">
                  {d.imageUrl && (
                    <div className="relative h-44 w-full overflow-hidden border-b border-border">
                      <img
                        src={d.imageUrl}
                        alt={d.badge}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent opacity-60" />
                    </div>
                  )}
                  <div className="p-7 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-sm"
                        style={{ background: `color-mix(in oklab, ${d.accent} 18%, transparent)`, color: d.accent }}>
                        <d.icon className="h-4 w-4" />
                      </span>
                      <span className="font-mono-data text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{d.badge}</span>
                    </div>
                    <h3 className="mt-5 font-display text-2xl font-medium leading-snug text-foreground">{d.title}</h3>
                    <ul className="mt-5 space-y-2 border-t border-border pt-4">
                      {d.lines.map((l) => (
                        <li key={l} className="flex items-start gap-3 text-sm text-muted-foreground">
                          <span className="mt-2 inline-block h-1 w-3" style={{ background: d.accent }} />
                          {l}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ░░ CTA ░░ */}
      <section className="relative overflow-hidden border-t border-border py-28">
        <div className="paper absolute inset-0 opacity-60" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <ScrollText className="mx-auto h-7 w-7" style={{ color: "var(--primary)" }} />
          <Ornament label="Standing Order" />
          <h2 className="font-display text-4xl font-medium leading-tight text-foreground sm:text-5xl">
            Write the brief that the principal will <span className="font-serif-italic" style={{ color: "var(--primary)" }}>actually read</span>.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
            VeriPolicy is in active service across policy desks. Open the Scenario Simulator to draft your first foresight memo.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link to="/signup">
              <Button size="lg" className="h-11 gap-2 rounded-sm bg-[var(--primary)] px-7 font-mono-data text-[11px] uppercase tracking-[0.2em] text-[var(--primary-foreground)] shadow-[var(--shadow-elegant)]">
                Get Started <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="ghost" className="h-11 rounded-sm font-mono-data text-[11px] uppercase tracking-[0.2em] text-[var(--primary)] hover:bg-transparent hover:underline">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

/* ═══════════════════════════════════════════════
   PROFESSIONAL FOOTER
   ═══════════════════════════════════════════════ */

function Footer() {
  return (
    <footer className="relative border-t border-border bg-[var(--surface)] overflow-hidden">
      {/* Background Crowd Canvas */}
      <div className="absolute inset-0 pointer-events-none opacity-20 dark:opacity-10 select-none">
        <CrowdCanvas src="/images/peeps/all-peeps.png" rows={15} cols={7} />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-5 py-12 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5">
              <svg viewBox="0 0 40 40" className="h-7 w-7 text-[var(--primary)]" aria-hidden>
                <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="0.8" />
                <circle cx="20" cy="20" r="14" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1 2" />
                <path d="M20 6 L24 20 L20 34 L16 20 Z" fill="currentColor" opacity="0.85" />
                <circle cx="20" cy="20" r="2.4" fill="var(--background)" />
              </svg>
              <span className="font-display text-lg font-semibold text-foreground">VeriPolicy</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              AI-powered policy intelligence for analysts who cannot afford to guess.
            </p>
          </div>

          {/* Product */}
          <div>
            <div className="font-mono-data text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">Product</div>
            <div className="space-y-2">
              {[
                { label: "Scenario Simulator", to: "/simulator" },
                { label: "Policy Tracker", to: "/tracker" },
                { label: "Data Comparison", to: "/comparison" },
                { label: "Analyst Dossier", to: "/profile" },
              ].map((link) => (
                <Link key={link.to} to={link.to} className="block text-sm text-muted-foreground transition-colors hover:text-foreground">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Company */}
          <div>
            <div className="font-mono-data text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">Company</div>
            <div className="space-y-2">
              {[
                { label: "About Us", to: "/about" },
                { label: "Terms of Service", to: "/terms" },
              ].map((link) => (
                <Link key={link.to} to={link.to} className="block text-sm text-muted-foreground transition-colors hover:text-foreground">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Powered By */}
          <div>
            <div className="font-mono-data text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">Powered By</div>
            <div className="flex flex-wrap gap-2">
              {["Gemini", "Groq", "SIPRI", "OWID", "Supabase"].map((tech) => (
                <span
                  key={tech}
                  className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 font-mono-data text-[10px] uppercase tracking-wider text-muted-foreground"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-8 sm:flex-row">
          <div className="font-mono-data text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            © {new Date().getFullYear()} VeriPolicy · Office of Policy Intelligence
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="font-mono-data text-[10px] uppercase tracking-wider text-muted-foreground">
              All systems operational
            </span>
          </div>
          <div className="font-mono-data text-[10px] text-muted-foreground">
            v2.0.0
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════════
   ROUTER SWITCH
   ═══════════════════════════════════════════════ */

function HomePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-10 w-10">
            <div className="absolute inset-0 animate-ping rounded-full opacity-25" style={{ background: "var(--primary)" }} />
            <div className="relative h-10 w-10 rounded-full grid place-items-center" style={{ background: "color-mix(in oklab, var(--primary) 15%, transparent)" }}>
              <Zap className="h-5 w-5" style={{ color: "var(--primary)" }} />
            </div>
          </div>
          <span className="font-mono-data text-[10px] uppercase tracking-wider text-muted-foreground">Initializing Intelligence Desk…</span>
        </div>
      </div>
    );
  }

  return user ? <IntelligenceDashboard /> : <MarketingPage />;
}
