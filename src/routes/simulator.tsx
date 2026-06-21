import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FileText, Loader2, Download, Check } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { fetchSimulationHistory, generateForesightMemo } from "@/services/simulatorService";
import { createBrief } from "@/lib/supabase/dashboard";
import AnalyticsCharts from "@/components/AnalyticsCharts";

export const Route = createFileRoute("/simulator")({
  head: () => ({
    meta: [
      { title: "Scenario Simulator — VeriPolicy" },
      { name: "description", content: "Generate analyst-grade foresight memos from policy scenarios." },
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
  component: SimulatorPage,
});

const EXAMPLES = [
  "India: +15% defence, -20% fuel subsidies",
  "Germany: 3% GDP defence + renewables",
  "US: Climate budget → AI & semiconductors",
];

const EXAMPLE_FULL: Record<string, string> = {
  [EXAMPLES[0]]: "India increases defence spending by 15% over the next fiscal year while reducing fossil fuel subsidies by 20%, reallocating the savings toward renewable energy capacity and domestic semiconductor manufacturing.",
  [EXAMPLES[1]]: "Germany raises defence spending to 3% of GDP while simultaneously accelerating its renewables target to 80% of grid mix by 2030, financed through a mix of green bonds and reallocated industrial subsidies.",
  [EXAMPLES[2]]: "The United States redirects approximately $40bn from its climate adaptation budget toward AI infrastructure, semiconductor R&D, and quantum computing programmes administered by the DOE and DARPA.",
};

const AVAILABLE_ANALYTICS_COUNTRIES = [
  "United States",
  "Germany",
  "India",
  "China",
  "United Kingdom",
  "Saudi Arabia",
  "Sweden",
] as const;

const COUNTRY_SYNONYMS: Record<string, string> = {
  "united states": "United States",
  "united states of america": "United States",
  "usa": "United States",
  "us": "United States",
  "america": "United States",
  "germany": "Germany",
  "india": "India",
  "china": "China",
  "united kingdom": "United Kingdom",
  "britain": "United Kingdom",
  "uk": "United Kingdom",
  "saudi arabia": "Saudi Arabia",
  "sweden": "Sweden",
};

function getCountriesFromScenario(scenario: string): string[] {
  const normalized = scenario.toLowerCase();
  const found = new Set<string>();

  for (const [alias, country] of Object.entries(COUNTRY_SYNONYMS)) {
    const regex = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (regex.test(normalized)) {
      found.add(country);
    }
  }

  return [...found];
}
type MemoSection = {
  title: string;
  body: string;
};

function extractMemoSections(markdown: string): MemoSection[] {
  const lines = markdown.split(/\r?\n/);
  const sections: MemoSection[] = [];
  let current: MemoSection | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    const headingMatch = trimmed.match(/^#{1,6}\s*(.+)$/);
    if (headingMatch) {
      if (current) {
        sections.push({ title: current.title, body: current.body.trim() });
      }
      current = { title: headingMatch[1].trim(), body: "" };
      continue;
    }

    if (!current) {
      current = { title: "Summary", body: "" };
    }
    current.body += `${line}\n`;
  }

  if (current) {
    sections.push({ title: current.title, body: current.body.trim() });
  }

  if (sections.length === 0) {
    return [{ title: "Summary", body: markdown.trim() }];
  }

  return sections;
}
type SimulationHistoryItem = {
  id: string;
  scenario: string;
  created_at: string;
};

function SimulatorPage() {
  const [input, setInput] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<"High" | "Medium" | "Low" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [historicalMatches, setHistoricalMatches] = useState<{ country: string; period: string; similarity: number }[]>([]);
  const [history, setHistory] = useState<SimulationHistoryItem[]>([]);
  const [savedBriefId, setSavedBriefId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const chartCountries = useMemo(() => {
    const extracted = getCountriesFromScenario(input);
    return extracted.length > 0 ? extracted : [...AVAILABLE_ANALYTICS_COUNTRIES];
  }, [input]);

  const displayedCountries = useMemo(() => {
    if (state === "done" && historicalMatches.length > 0) {
      const fromMatches = historicalMatches.map((m) => m.country).filter(Boolean);
      return fromMatches.length > 0 ? fromMatches : chartCountries;
    }
    return chartCountries;
  }, [state, historicalMatches, chartCountries]);

  const memoSections = useMemo(() => {
    if (!markdown) return [{ title: "Summary", body: "No memo generated yet." }];
    return extractMemoSections(markdown);
  }, [markdown]);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const simulations = await fetchSimulationHistory();
        setHistory(simulations);
      } catch (err) {
        console.warn("Unable to load simulation history", err);
      }
    };

    loadHistory();
  }, []);

  const saveMemoAsBrief = async (scenario: string, memo: string, conf: "High" | "Medium" | "Low") => {
    if (!isSupabaseConfigured()) {
      throw new Error("Supabase is not configured");
    }
    
    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      throw new Error("No active session found");
    }

    // Generate a brief ID based on date and sequence
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    const day = String(new Date().getDate()).padStart(2, "0");
    const timestamp = Date.now() % 10000; // Last 4 digits of timestamp
    const ref_id = `FB-${year}${month}${day}-${String(timestamp).padStart(4, "0")}`;

    // Convert confidence to forecast accuracy score (0-1 decimal)
    const forecastAccuracyMap: Record<string, number> = {
      "High": 0.85,
      "Medium": 0.65,
      "Low": 0.45,
    };

    // Prepare brief data with proper types
    const briefData: any = {
      ref_id,
      title: scenario.substring(0, 100),
      status: "Draft",
      tag: "Scenario Simulator",
      pages: Math.max(1, Math.ceil(memo.length / 500)),
      accent_color: "var(--primary)",
      content: { memo, historicalMatches, confidence: conf },
      citations_count: historicalMatches.length,
      forecast_accuracy: forecastAccuracyMap[conf],
    };

    console.log("Creating brief with data:", briefData);

    try {
      const brief = await createBrief(session.user.id, briefData);
      return brief;
    } catch (err: any) {
      console.error("Create brief error details:", err);
      
      // If it's a 400 error about unknown columns, try without metric fields
      const errorMsg = err.message || "";
      if ((err.status === 400 || errorMsg.includes("column")) && 
          (errorMsg.includes("citations_count") || errorMsg.includes("forecast_accuracy"))) {
        console.warn("Metric columns may not exist - retrying without them");
        const fallbackData = { ...briefData };
        delete fallbackData.citations_count;
        delete fallbackData.forecast_accuracy;
        
        try {
          const brief = await createBrief(session.user.id, fallbackData);
          return brief;
        } catch (fallbackErr) {
          console.error("Fallback brief creation also failed:", fallbackErr);
          throw err; // Throw original error
        }
      }
      throw err;
    }
  };

  const generate = async () => {
    if (!input.trim()) return;
    console.log("TEXTAREA VALUE", input);
    console.log("STATE VALUE", input);
    setError(null);
    setMarkdown(null);
    setSavedBriefId(null);
    setState("loading");

    try {
      // Ensure user is logged in client-side and we have an access token
      if (!isSupabaseConfigured()) {
        throw new Error("Supabase is not configured. Please log in to generate a memo.");
      }
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("No active session found. Please sign in to generate a memo.");
      }

      const res = await generateForesightMemo(input);
      console.log("SERVICE INPUT", input);
      console.log("SERVICE RESPONSE", res);
      setMarkdown(res.memo);
      setHistoricalMatches(res.historicalMatches);
      setConfidence(res.confidence);

      // Automatically save the generated memo as a draft brief
      try {
        setSaving(true);
        const brief = await saveMemoAsBrief(input, res.memo, res.confidence);
        setSavedBriefId(brief.id);
        console.log("Memo saved as brief:", brief.id);
      } catch (saveErr) {
        console.warn("Unable to save memo as brief", saveErr);
        // Don't fail the whole operation if saving fails
      } finally {
        setSaving(false);
      }

      try {
        const simulations = await fetchSimulationHistory();
        setHistory(simulations);
      } catch (historyError) {
        console.warn("Unable to refresh simulation history", historyError);
      }
      setState("done");
    } catch (err: any) {
      console.error("GENERATE ERROR", err);
      setError(err.message || String(err));
      setState("idle");
    }
  };

  const downloadBrief = () => {
    const memoText = markdown ?? "";
    const text = `VERIPOLICY FORESIGHT MEMO\n========================\n\nScenario:\n${input}\n\n${memoText}\n\nGenerated by Llama 3.3 70B via Groq.\n`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "veripolicy-brief.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
        className="mx-auto max-w-7xl px-5 py-10 sm:px-8"
      >
        <div className="mb-8">
          <div className="font-mono-data text-xs uppercase tracking-widest text-muted-foreground">Scenario Simulator</div>
          <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">Generate a Foresight Memo</h1>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          {/* INPUT */}
          <div className="space-y-6 lg:col-span-3">
            <Card className="border-border bg-card p-6">
              <CardHeader>
                <CardTitle>Policy Scenario Input</CardTitle>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Enter a policy scenario to generate a concise, analyst-grade foresight memo. The analytics panel will show relevant country trends once you generate.
                </p>
              </CardHeader>
              <Textarea
                value={input}
                onChange={(e) => {
                  console.log("TEXTAREA VALUE", e.target.value);
                  setInput(e.target.value);
                }}
                placeholder="Describe a policy change... e.g. India increases defence spending by 15% and cuts fossil fuel subsidies by 20%"
                className="mt-3 min-h-[220px] resize-none bg-background font-sans text-sm"
              />
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  Current Scenario: {input.trim() ? input : "(empty)"}
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button
                    onClick={generate}
                    disabled={state === "loading" || !input.trim()}
                    className="w-full sm:w-auto font-display font-semibold"
                    style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
                  >
                    {state === "loading" ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analysing historical data...</>
                    ) : (
                      "Generate Foresight Memo"
                    )}
                  </Button>
                  <Button asChild variant="secondary" className="w-full sm:w-auto">
                    <Link to={`/comparison?countries=${chartCountries.map(encodeURIComponent).join(",")}`}>Current Scenario Comparison</Link>
                  </Button>
                </div>
              </div>

              <div className="mt-6 space-y-4 rounded-3xl border border-border bg-background p-5">
                <div className="font-mono-data text-[11px] uppercase tracking-widest text-muted-foreground">
                  Example scenarios
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      onClick={() => setInput(EXAMPLE_FULL[ex])}
                      className="rounded-2xl border border-border bg-muted px-4 py-3 text-left text-sm text-muted-foreground transition hover:border-[var(--accent-cyan)] hover:text-foreground"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* OUTPUT */}
          <div className="lg:col-span-2 space-y-6">
            {state === "idle" && (
              <Card className="flex h-full min-h-[400px] flex-col items-center justify-center border-2 border-dashed bg-transparent p-8 text-center"
                style={{ borderColor: "color-mix(in oklab, var(--accent-cyan) 40%, transparent)" }}>
                <FileText className="h-8 w-8" style={{ color: "var(--accent-cyan)" }} />
                <p className="mt-3 text-sm text-muted-foreground">Your Foresight Memo will appear here</p>
              </Card>
            )}

            {state === "loading" && (
              <Card className="border-border bg-card p-6">
                <Skeleton className="h-5 w-1/3" />
                <div className="mt-6 space-y-5">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-3 w-1/4" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-5/6" />
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {state === "done" && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                  <Card className="border-border bg-card p-0 overflow-hidden shadow-lg">
                    <Accordion type="single" collapsible defaultValue="analytics">
                      <AccordionItem value="analytics">
                        <AccordionTrigger className="bg-background/90 px-6 py-4 text-left text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                          Analytics overview
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-6">
                          <div className="space-y-5">
                            <div className="rounded-3xl border border-border bg-muted/50 p-4">
                              <div className="text-sm font-semibold text-foreground">Insights summary</div>
                              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                View country-level trend charts, context indicators, and how selected regions compare in historical defence and emissions data.
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {chartCountries.map((country) => (
                                <span key={country} className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground">
                                  {country}
                                </span>
                              ))}
                            </div>

                            <AnalyticsCharts countries={displayedCountries} />

                            <div className="mt-6 rounded-3xl border border-border bg-background p-4">
                              <div className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Confidence</div>
                              <div className="mt-3 text-2xl font-semibold text-foreground">
                                {confidence ?? "Low"}
                              </div>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </Card>

                  <Card className="border-border bg-card p-0 overflow-hidden shadow-lg">
                    <Accordion type="single" collapsible defaultValue="memo">
                      <AccordionItem value="memo">
                        <AccordionTrigger className="bg-background/90 px-6 py-4 text-left text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                          Foresight memo
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-6">
                          <div className="space-y-5">
                            <div className="rounded-3xl border border-border bg-muted/50 p-4">
                              <div className="text-sm font-semibold text-foreground">Narrative summary</div>
                              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                The memo below synthesizes your scenario with relevant historical matches and confidence scoring for analyst-ready review.
                              </p>
                            </div>

                            <div className="rounded-3xl border border-border bg-background p-4">
                              <div className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                                Historical matches
                              </div>
                              <div className="mt-3 space-y-3">
                                {historicalMatches.slice(0, 3).map((match) => (
                                  <div key={`${match.country}-${match.period}`} className="rounded-2xl border border-border bg-card p-3">
                                    <div className="text-sm font-semibold text-foreground">{match.country}</div>
                                    <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground mt-1">{match.period}</div>
                                    <div className="mt-2 text-sm text-foreground">
                                      Similarity: {(match.similarity * 100).toFixed(1)}%
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="grid gap-4">
                              {memoSections.map((section) => (
                                <Card key={section.title} className="border-border bg-background p-4 shadow-sm">
                                  <div className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                                    {section.title}
                                  </div>
                                  <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">
                                    {section.body}
                                  </div>
                                </Card>
                              ))}
                            </div>

                            <div className="flex flex-col gap-3">
                              {saving && (
                                <div className="rounded-2xl border border-border bg-blue-50 p-4 text-blue-700 flex items-center gap-2">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span className="text-sm font-medium">Saving memo to drafts...</span>
                                </div>
                              )}
                              {savedBriefId && !saving && (
                                <div className="rounded-2xl border border-border bg-green-50 p-4 text-green-700 flex items-center gap-2">
                                  <Check className="h-4 w-4" />
                                  <span className="text-sm font-medium">Saved to Past Drafts</span>
                                </div>
                              )}
                              <Button onClick={downloadBrief} variant="outline" className="w-full gap-2">
                                <Download className="h-4 w-4" /> Download Brief (.txt)
                              </Button>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </Card>
                </div>
              </motion.div>
            )}

            {history.length > 0 && (
              <Card className="mt-6 border-border bg-card p-6">
                <div className="font-mono-data text-[11px] uppercase tracking-widest text-muted-foreground">
                  Latest 10 Previous Simulations
                </div>
                <div className="mt-4 space-y-3">
                  {history.map((item) => (
                    <div key={item.id} className="rounded-xl border border-border bg-background p-4">
                      <div className="text-sm font-semibold text-foreground">{item.scenario}</div>
                      <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
                        {new Date(item.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {error && (
              <Card className="border-border bg-red-50 p-4 text-red-700">
                <div className="font-semibold">Error</div>
                <div>{error}</div>
              </Card>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

