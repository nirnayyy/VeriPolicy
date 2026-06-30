import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Newspaper, RefreshCw, Search, Maximize2 } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { PolicyFeed } from "@/lib/supabase/types";
import { getPolicies } from "@/services/policyService";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

import { requireAuth } from "@/lib/auth-guard";

export const Route = createFileRoute("/tracker")({
  head: () => ({
    meta: [
      { title: "Policy Tracker — VeriPolicy" },
      { name: "description", content: "Live policy news from Reuters and AP with AI-generated Impact Briefs." },
    ],
  }),
  beforeLoad: requireAuth,
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
  const category = getPolicyCategory(policy.title || "", policy.summary);
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

const COUNTRIES = [
  "All",
  "United States",
  "China",
  "India",
  "Germany",
  "United Kingdom",
  "Saudi Arabia",
  "Sweden"
] as const;

function TrackerPage() {
  const [filter, setFilter] = useState<Filter>("All");
  const [countryFilter, setCountryFilter] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selected, setSelected] = useState<PolicyItem | null>(null);
  const [policies, setPolicies] = useState<PolicyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const handleSyncFeed = async () => {
    setSyncing(true);
    try {
      const response = await fetch("/api/policy-sync", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || "Sync failed");
      toast.success(`Feed updated! Ingested ${result.inserted || 0} new policy events.`);
      
      const rows = await getPolicies();
      const mapped = rows.map(mapPolicy);
      setPolicies(mapped);
      if (mapped.length > 0) {
        setSelected(mapped[0]);
      }
    } catch (e: any) {
      toast.error(e.message || "Feed sync failed");
    } finally {
      setSyncing(false);
    }
  };

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
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (isSupabaseConfigured()) {
        const supabase = getSupabase();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        }
      }

      const response = await fetch("/api/generate-impact-brief", {
        method: "POST",
        headers,
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

  const visible = policies.filter((a) => {
    const matchesCategory = filter === "All" || a.category === filter.toLowerCase();
    const matchesCountry = countryFilter === "All" || 
      a.headline.toLowerCase().includes(countryFilter.toLowerCase()) || 
      a.brief.what.toLowerCase().includes(countryFilter.toLowerCase());
    const matchesSearch = !debouncedSearchTerm.trim() || 
      a.headline.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) || 
      a.brief.what.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
    return matchesCategory && matchesCountry && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
        className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="font-mono-data text-xs uppercase tracking-widest text-muted-foreground">Policy Tracker</div>
            <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">Recent Policy Activity</h1>
          </div>
          <Button
            onClick={handleSyncFeed}
            disabled={syncing}
            size="sm"
            className="h-9 rounded-sm bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[color-mix(in_oklab,var(--primary)_85%,black)] font-mono-data text-[11px] uppercase tracking-wider gap-2 shadow-sm cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync Live Feed"}
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[35fr_65fr]">
          {/* LEFT */}
          <div>
            <div className="mb-4 space-y-3 bg-muted/30 border border-border/60 p-4 rounded-2xl">
              <div className="font-mono-data text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                Filter & Search Feed
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search keywords..."
                  className="w-full h-8 pl-9 pr-3 rounded-lg border border-border bg-background text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-[var(--primary)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-mono-data text-[9px] uppercase tracking-wider text-muted-foreground block">Category</label>
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as Filter)}
                    className="w-full h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground focus:outline-none"
                  >
                    {FILTERS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-mono-data text-[9px] uppercase tracking-wider text-muted-foreground block">Country</label>
                  <select
                    value={countryFilter}
                    onChange={(e) => setCountryFilter(e.target.value)}
                    className="w-full h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground focus:outline-none"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="mb-3 font-mono-data text-[10px] uppercase tracking-widest text-muted-foreground">
              Live Feed Results ({visible.length})
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

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 font-mono-data text-[11px] text-muted-foreground">
                        <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent-cyan)" }} />
                        Llama 3.3 (Groq)
                      </div>
                      {selected.brief.confidence !== "N/A" && (
                        <div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 font-mono-data text-[11px] text-muted-foreground">
                          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent-green)" }} />
                          Confidence: {selected.brief.confidence}
                        </div>
                      )}
                    </div>
                    {selected.brief.confidence !== "N/A" && (
                      <Button onClick={() => setIsDetailOpen(true)} variant="outline" className="h-8 rounded-sm font-mono-data text-[10px] uppercase tracking-wider gap-2 cursor-pointer">
                        <Maximize2 className="h-3.5 w-3.5" /> Maximize Dossier View
                      </Button>
                    )}
                  </div>

                  <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                    <DialogContent className="max-w-2xl bg-card border-border rounded-2xl shadow-2xl p-6 overflow-y-auto max-h-[85vh]">
                      <DialogHeader className="border-b border-border/80 pb-4">
                        <div className="flex items-center justify-between text-[9px] font-mono-data text-muted-foreground uppercase tracking-widest">
                          <span>OFFICE OF POLICY INTELLIGENCE · BRIEFING DOSSIER</span>
                          <span>{selected?.date}</span>
                        </div>
                        <DialogTitle className="font-display text-2xl font-semibold text-foreground mt-3 leading-snug">
                          {selected?.headline}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="mt-6 space-y-6 text-sm text-foreground">
                        <div>
                          <span className="font-mono-data text-[9px] uppercase tracking-[0.2em] text-muted-foreground block mb-1">Ingestion Source</span>
                          <span className="font-semibold text-xs uppercase bg-muted px-2.5 py-1 rounded text-foreground">{selected?.source}</span>
                        </div>

                        <div className="divide-y divide-border/60">
                          {[
                            { label: "Executive Summary", body: selected?.brief.what },
                            { label: "Immediate Operational Impact (0–6 Months)", body: selected?.brief.immediate },
                            { label: "Geopolitical & Second-Order Consequences", body: selected?.brief.second },
                            { label: "Standing Open Inquiries", body: selected?.brief.open },
                          ].map((s) => (
                            <div key={s.label} className="py-4 first:pt-0">
                              <span className="font-mono-data text-[9px] uppercase tracking-[0.2em] text-[var(--primary)] block mb-1.5">{s.label}</span>
                              <p className="leading-relaxed text-foreground/90 font-sans text-sm">{s.body}</p>
                            </div>
                          ))}
                        </div>

                        <div className="border-t border-border pt-4 flex flex-col gap-2 font-mono-data text-[10px] text-muted-foreground uppercase tracking-wider">
                          <div className="flex items-center justify-between">
                            <span>Confidence: {selected?.brief.confidence}</span>
                            <span>Model: Llama 3.3 70B (Groq)</span>
                          </div>
                          <div className="text-[9px] text-center text-muted-foreground/80 mt-3 italic">
                            "This document contains strategic policy signal summaries for authorized analyst review."
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

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
