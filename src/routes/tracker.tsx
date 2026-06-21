import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Newspaper } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { PolicyFeed } from "@/lib/supabase/types";
import { getPolicies } from "@/services/policyService";

export const Route = createFileRoute("/tracker")({
  head: () => ({
    meta: [
      { title: "Policy Tracker — VeriPolicy" },
      { name: "description", content: "Live policy news from Reuters and AP with AI-generated Impact Briefs." },
    ],
  }),
  beforeLoad: async () => {
    // Check if user is authenticated before loading route
    if (!isSupabaseConfigured()) {
      throw redirect({ to: "/login" });
    }
    
    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      throw redirect({ to: "/login" });
    }
  },
  component: TrackerPage,
});

type PolicyItem = {
  id: string;
  source: string;
  headline: string;
  date: string;
  tags: { label: string; color: string }[];
  category: "defence" | "climate" | "energy" | "other";
  brief: { what: string; immediate: string; second: string; open: string; confidence: string };
};

const C = {
  defence: "var(--accent-violet)",
  climate: "var(--accent-green)",
  green: "var(--accent-green)",
  energy: "var(--accent-amber)",
  amber: "var(--accent-amber)",
  cyan: "var(--accent-cyan)",
};

const policyKeywords = {
  defence: /defence|defense|military|missile|security|NATO|DoD|army|naval|air force|drone/i,
  climate: /climate|emission|carbon|deforestation|net zero|COP|climate market|CBAM|ETS/i,
  energy: /energy|LNG|nuclear|renewable|grid|electricity|gas|oil|fuel|power/i,
};

function getPolicyCategory(headline: string, summary?: string | null) {
  const text = `${headline} ${summary ?? ""}`;
  if (policyKeywords.defence.test(text)) return "defence";
  if (policyKeywords.climate.test(text)) return "climate";
  if (policyKeywords.energy.test(text)) return "energy";
  return "other";
}

function getPolicyTags(source: string, category: PolicyItem["category"]) {
  const tags = [{ label: source || "Policy", color: C.cyan }];
  if (category !== "other") {
    tags.push({ label: category, color: C[category] });
  }
  return tags;
}

function isValidStoredImpactBrief(value: unknown): value is NonNullable<PolicyFeed["impact_brief"]> {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.impact_brief === "string" &&
    typeof candidate.immediate_impacts === "string" &&
    typeof candidate.second_order_effects === "string" &&
    typeof candidate.open_questions === "string" &&
    typeof candidate.confidence === "string" &&
    ["High", "Medium", "Low"].includes(candidate.confidence)
  );
}

function normalizePolicyImpactBrief(value: unknown) {
  if (isValidStoredImpactBrief(value)) {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (isValidStoredImpactBrief(parsed)) return parsed;
    } catch {
      // ignore invalid stored string
    }
  }

  return null;
}

function mapPolicy(policy: PolicyFeed): PolicyItem {
  const category = getPolicyCategory(policy.title, policy.summary);
  const publishedAt = policy.published_date || policy.created_at;
  const date = publishedAt
    ? new Date(publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Unknown date";

  const impact = normalizePolicyImpactBrief(policy.impact_brief);
  const shortSummary = policy.summary || "No summary is available for this policy item.";
  return {
    id: policy.id,
    source: policy.source || "Policy Feed",
    headline: policy.title || "Untitled policy item",
    date,
    category,
    tags: getPolicyTags(policy.source || "Policy", category),
    brief: impact
      ? {
          what: impact.impact_brief,
          immediate: impact.immediate_impacts,
          second: impact.second_order_effects,
          open: impact.open_questions,
          confidence: impact.confidence,
        }
      : {
          what: shortSummary,
          immediate: "Immediate impacts are not available in this feed.",
          second: "Second-order effects are not available in this feed.",
          open: policy.url ? `Read more: ${policy.url}` : "No external link is available.",
          confidence: "N/A",
        },
  };
}

const FILTERS = ["All", "Defence", "Climate", "Energy"] as const;
type Filter = (typeof FILTERS)[number];

function TrackerPage() {
  const [filter, setFilter] = useState<Filter>("All");
  const [selected, setSelected] = useState<PolicyItem | null>(null);
  const [policies, setPolicies] = useState<PolicyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPolicies() {
      setLoading(true);
      setError(null);

      try {
        const rows = await getPolicies();
        if (!isMounted) return;

        const mapped = rows.map(mapPolicy);
        setPolicies(mapped);
        setSelected(mapped[0] ?? null);
      } catch (err: any) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    }

    loadPolicies();

    return () => {
      isMounted = false;
    };
  }, []);

  const select = (a: PolicyItem) => {
    if (selected?.id === a.id) return;
    setSelected(null);
    setLoading(true);
    setTimeout(() => {
      setSelected(a);
      setLoading(false);
    }, 700);
  };

  const updatePolicyBrief = (policyId: string, brief: PolicyItem["brief"]) => {
    setPolicies((current) => current.map((item) => (item.id === policyId ? { ...item, brief } : item)));
    setSelected((current) => (current?.id === policyId ? { ...current, brief } : current));
  };

  const generateSelectedBrief = async (policy: PolicyItem) => {
    setGenerationError(null);
    setIsGeneratingBrief(true);

    try {
      const response = await fetch("/api/generate-impact-brief", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ policyId: policy.id }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || `Failed to generate brief (${response.status})`);
      }

      const brief = {
        what: result.impactBrief.impact_brief,
        immediate: result.impactBrief.immediate_impacts,
        second: result.impactBrief.second_order_effects,
        open: result.impactBrief.open_questions,
        confidence: result.impactBrief.confidence,
      };

      updatePolicyBrief(policy.id, brief);
    } catch (err: any) {
      setGenerationError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsGeneratingBrief(false);
    }
  };

  const visible = filter === "All" ? policies : policies.filter((a) => a.category === filter.toLowerCase());

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
        className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <div className="mb-8">
          <div className="font-mono-data text-xs uppercase tracking-widest text-muted-foreground">Policy Tracker</div>
          <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">Recent Policy Activity</h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-[35fr_65fr]">
          {/* LEFT */}
          <div>
            <div className="mb-3 font-mono-data text-[11px] uppercase tracking-widest text-muted-foreground">
              Live Policy Feed
            </div>
            <div className="mb-4 flex flex-wrap gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-full border px-3 py-1 font-mono-data text-xs transition-colors ${
                    filter === f
                      ? "border-transparent text-[var(--primary-foreground)]"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                  style={filter === f ? { background: "var(--accent-cyan)" } : undefined}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-2">
              {visible.map((a) => {
                const active = selected?.id === a.id;
                return (
                  <button
                    key={a.id}
                    onClick={() => select(a)}
                    className={`w-full rounded-lg border p-4 text-left transition-all hover:scale-[1.01] ${
                      active ? "bg-card" : "border-border bg-card/40"
                    }`}
                    style={active ? { borderLeft: "3px solid var(--accent-cyan)", borderColor: "var(--border)" } : undefined}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded px-2 py-0.5 font-mono-data text-[10px] uppercase tracking-wider"
                        style={{ background: "color-mix(in oklab, var(--accent-cyan) 18%, transparent)", color: "var(--accent-cyan)" }}>
                        {a.source}
                      </span>
                      <span className="font-mono-data text-[11px] text-muted-foreground">{a.date}</span>
                    </div>
                    <h3 className="mt-2 text-sm font-semibold leading-snug text-foreground">{a.headline}</h3>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {a.tags.map((t) => (
                        <span key={t.label} className="rounded-full px-2 py-0.5 font-mono-data text-[10px]"
                          style={{ background: `color-mix(in oklab, ${t.color} 18%, transparent)`, color: t.color }}>
                          {t.label}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT */}
          <div>
            {error && (
              <Card className="border-border bg-card p-6">
                <div className="text-sm font-semibold text-destructive">Unable to load policy feed</div>
                <p className="mt-2 text-sm text-muted-foreground">{error}</p>
              </Card>
            )}

            {!error && !selected && !loading && (
              <Card className="flex h-full min-h-[400px] flex-col items-center justify-center border-2 border-dashed bg-transparent p-8 text-center"
                style={{ borderColor: "color-mix(in oklab, var(--accent-violet) 40%, transparent)" }}>
                <Newspaper className="h-8 w-8" style={{ color: "var(--accent-violet)" }} />
                <p className="mt-3 text-sm text-muted-foreground">Select a story to generate an Impact Brief</p>
              </Card>
            )}

            {loading && (
              <Card className="border-border bg-card p-6">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="mt-2 h-3 w-1/3" />
                <div className="mt-6 space-y-5">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-3 w-1/3" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-5/6" />
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {selected && !loading && !error && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <Card className="border-border bg-card p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded px-2 py-0.5 font-mono-data text-[10px] uppercase tracking-wider"
                      style={{ background: "color-mix(in oklab, var(--accent-cyan) 18%, transparent)", color: "var(--accent-cyan)" }}>
                      {selected.source}
                    </span>
                    <span className="font-mono-data text-[11px] text-muted-foreground">{selected.date}</span>
                  </div>
                  <h2 className="mt-3 font-display text-xl font-bold leading-snug">{selected.headline}</h2>

                  <div className="mt-5 inline-flex items-center gap-2 rounded-md px-2 py-1 font-mono-data text-xs uppercase tracking-wider"
                    style={{ background: "color-mix(in oklab, var(--accent-violet) 18%, transparent)", color: "var(--accent-violet)" }}>
                    Impact Brief
                  </div>

                  <div className="mt-5 divide-y divide-border">
                    {[
                      { label: "What was decided", body: selected.brief.what },
                      { label: "Immediate impacts (0–6 months)", body: selected.brief.immediate },
                      { label: "Second-order effects", body: selected.brief.second },
                      { label: "Open questions", body: selected.brief.open },
                    ].map((s) => (
                      <div key={s.label} className="py-4 first:pt-0">
                        <div className="font-mono-data text-[11px] uppercase tracking-widest text-muted-foreground">
                          {s.label}
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-foreground/90">{s.body}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 grid gap-3 sm:flex sm:items-center sm:gap-4">
                    <div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 font-mono-data text-[11px] text-muted-foreground">
                      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent-cyan)" }} />
                      Generated by Llama 3.3 70B via Groq
                    </div>
                    {selected.brief.confidence !== "N/A" && (
                      <div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 font-mono-data text-[11px] text-muted-foreground">
                        <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent-green)" }} />
                        Confidence: {selected.brief.confidence}
                      </div>
                    )}
                  </div>

                  {selected.brief.confidence === "N/A" && (
                    <div className="mt-5 flex flex-col gap-3">
                      <div className="rounded-md border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
                        This policy story does not yet have an AI Impact Brief stored in the feed.
                      </div>
                      <button
                        onClick={() => generateSelectedBrief(selected)}
                        disabled={isGeneratingBrief}
                        className="inline-flex items-center justify-center rounded-md border border-transparent bg-[var(--accent-cyan)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[color-mix(in oklab, var(--accent-cyan) 80%, black)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isGeneratingBrief ? "Generating brief…" : "Generate Impact Brief"}
                      </button>
                      {generationError && (
                        <div className="text-sm text-destructive">{generationError}</div>
                      )}
                    </div>
                  )}
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
