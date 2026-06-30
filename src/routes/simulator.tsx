import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
import { motion } from "framer-motion";
import { FileText, Loader2, Download, Check, Share2, Volume2, BarChart3, Calendar } from "lucide-react";
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
import { toast } from "sonner";
import { requireAuth } from "@/lib/auth-guard";

export const Route = createFileRoute("/simulator")({
  head: () => ({
    meta: [
      { title: "Scenario Simulator — VeriPolicy" },
      { name: "description", content: "Simulate defense spending and carbon reallocations dynamically." },
    ],
  }),
  beforeLoad: requireAuth,
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

const POLICY_SCENARIO_KEYWORDS = [
  "defence",
  "defense",
  "climate",
  "emissions",
  "renewable",
  "renewables",
  "subsidy",
  "subsidies",
  "fossil",
  "budget",
  "spending",
  "procurement",
  "security",
  "regulation",
  "tax",
  "tariff",
  "green",
  "infrastructure",
  "policy",
  "legislation",
  "sanction",
  "trade",
  "industrial",
  "energy",
  "transport",
  "migration",
] as const;

const INVALID_POLICY_ERROR = "The scenario entered is not related to policy.";

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

function isLikelyPolicyScenario(input: string): boolean {
  const normalized = input.toLowerCase();
  return POLICY_SCENARIO_KEYWORDS.some((keyword) => normalized.includes(keyword));
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

function calculateGeopoliticalRiskScore(scenario: string): number {
  const norm = scenario.toLowerCase();
  let score = 25;
  if (norm.includes("defense") || norm.includes("defence")) score += 20;
  if (norm.includes("spend") || norm.includes("budget")) score += 10;
  if (norm.includes("cut") || norm.includes("reduce")) score += 15;
  if (norm.includes("sanction") || norm.includes("tariff") || norm.includes("restrict") || norm.includes("trade war")) score += 25;
  if (norm.includes("carbon tax") || norm.includes("co2") || norm.includes("emission")) score += 10;
  if (norm.includes("subsidy") || norm.includes("subsidies")) score += 10;

  const percentMatch = norm.match(/(\d+)%/);
  if (percentMatch) {
    score += Math.min(25, Number(percentMatch[1]));
  }
  return Math.min(95, Math.max(10, score));
}

function parsePercentageFromScenario(scenario: string, domain: "defense" | "emissions" | "subsidy"): string {
  const norm = scenario.toLowerCase();
  const match = norm.match(new RegExp(`(\\d+)%\\s*(?:increase|decrease|more|less|cut|add|growth)?\\s*(?:in\\s*)?${domain}`));
  if (match) return `${match[1]}%`;
  const general = norm.match(/(\d+)%/g);
  if (general && general.length > 0) {
    if (domain === "defense") return general[0];
    if (domain === "subsidy" && general.length > 1) return general[1];
    return general[0];
  }
  return "N/A";
}

function renderBodyWithCitations(bodyText: string, matches: { country: string; period: string; similarity: number }[]) {
  const parts = bodyText.split(/(\[\d+\])/g);
  return parts.map((part, index) => {
    const matchResult = part.match(/^\[(\d+)\]$/);
    if (matchResult) {
      const matchIndex = parseInt(matchResult[1], 10) - 1;
      const match = matches[matchIndex];
      if (match) {
        return (
          <span key={index} className="group relative inline-block mx-0.5 select-none">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[var(--primary)]/20 font-mono-data text-[9px] font-semibold text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-colors cursor-help">
              {matchIndex + 1}
            </span>
            <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 rounded-lg bg-zinc-950 p-2.5 text-[10px] leading-relaxed text-zinc-100 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 shadow-xl border border-zinc-800 z-30 text-left">
              <span className="font-semibold block">{match.country}</span>
              <span className="text-[9px] text-zinc-400 block uppercase tracking-wider mt-0.5">{match.period}</span>
              <span className="text-[9px] block text-[var(--primary)] mt-1">Similarity: {(match.similarity * 100).toFixed(1)}%</span>
            </span>
          </span>
        );
      }
    }
    return part;
  });
}

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
  const [isTypingExample, setIsTypingExample] = useState(false);
  const [speakingSection, setSpeakingSection] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"narrative" | "charts" | "timeline" | "exports">("narrative");

  const handleSpeakSection = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (speakingSection === text) {
      window.speechSynthesis.cancel();
      setSpeakingSection(null);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.replace(/\*\*/g, ""));
      utterance.onend = () => setSpeakingSection(null);
      utterance.onerror = () => setSpeakingSection(null);
      setSpeakingSection(text);
      window.speechSynthesis.speak(utterance);
    }
  };

  const riskScore = useMemo(() => calculateGeopoliticalRiskScore(input), [input]);

  const typingIntervalRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
    };
  }, []);

  const handleExampleClick = (exText: string) => {
    if (state === "loading") return;
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
    }
    setIsTypingExample(true);
    setInput("");
    
    let currentIdx = 0;
    typingIntervalRef.current = setInterval(() => {
      setInput(exText.slice(0, currentIdx + 1));
      currentIdx++;
      if (currentIdx >= exText.length) {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
        setIsTypingExample(false);
      }
    }, 12);
  };

  const chartCountries = useMemo(() => {
    const extracted = getCountriesFromScenario(input);
    return extracted.length > 0 ? extracted : [...AVAILABLE_ANALYTICS_COUNTRIES];
  }, [input]);

  const isInvalidPolicyError = error === INVALID_POLICY_ERROR;

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const params = new URL(window.location.href).searchParams;
      const qScenario = params.get("scenario");
      if (qScenario) {
        setInput(decodeURIComponent(qScenario));
      }
    } catch (e) {
      // ignore
    }
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
    if (!isLikelyPolicyScenario(input)) {
      setError(INVALID_POLICY_ERROR);
      setState("idle");
      setMarkdown(null);
      setHistoricalMatches([]);
      setConfidence(null);
      return;
    }

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
      setActiveTab("narrative");
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

  const downloadPdfBrief = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      // Page border
      doc.setDrawColor(241, 215, 205);
      doc.rect(5, 5, 200, 287);

      // Title/Header
      doc.setFont("Garamond", "normal");
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      doc.text("VERIPOLICY OFFICE OF POLICY INTELLIGENCE", 15, 20);
      doc.text("FORESIGHT MEMO", 155, 20);

      doc.setDrawColor(226, 149, 120);
      doc.setLineWidth(0.5);
      doc.line(15, 23, 195, 23);

      // Subject/Scenario
      doc.setTextColor(43, 29, 24);
      doc.setFontSize(14);
      doc.text("SUBJECT: SCENARIO FORESIGHT MEMO", 15, 34);

      doc.setFontSize(10);
      doc.setFont("Courier", "italic");
      doc.text("SCENARIO STATEMENT:", 15, 42);
      
      const splitScenario = doc.splitTextToSize(input, 175);
      doc.text(splitScenario, 15, 47);
      
      let currentY = 47 + (splitScenario.length * 5) + 6;
      doc.line(15, currentY, 195, currentY);
      currentY += 8;

      // Render Memo Sections
      doc.setFont("Helvetica", "normal");
      for (const section of memoSections) {
        if (currentY > 260) {
          doc.addPage();
          doc.setDrawColor(241, 215, 205);
          doc.rect(5, 5, 200, 287);
          currentY = 20;
        }

        doc.setFontSize(11);
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(226, 149, 120);
        doc.text(section.title.toUpperCase(), 15, currentY);
        currentY += 5;

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(43, 29, 24);
        
        const cleanBody = section.body.replace(/\*\*/g, "");
        const splitBody = doc.splitTextToSize(cleanBody, 175);
        doc.text(splitBody, 15, currentY);
        currentY += (splitBody.length * 4.8) + 8;
      }

      // Analyst signature block
      if (currentY > 240) {
        doc.addPage();
        doc.setDrawColor(241, 215, 205);
        doc.rect(5, 5, 200, 287);
        currentY = 20;
      }
      
      currentY += 10;
      doc.setFont("Courier", "italic");
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      doc.text("PREPARED AND CERTIFIED BY THE FORESIGHT DESK", 15, currentY);
      
      doc.line(15, currentY + 12, 80, currentY + 12);
      doc.text("AUTHORIZED ANALYST SIGNATURE", 15, currentY + 17);

      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", session.user.id)
          .maybeSingle();
        if (profile?.full_name) {
          doc.setFont("Courier", "bold");
          doc.setTextColor(20, 20, 20);
          doc.text(profile.full_name, 20, currentY + 9);
        }
      }

      doc.save(`veripolicy-memo-${Date.now().toString().slice(-6)}.pdf`);
    } catch (e) {
      console.error("PDF generation failed", e);
    }
  };

  const generateShareLink = () => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.origin + "/simulator");
    url.searchParams.set("scenario", input);
    navigator.clipboard.writeText(url.toString());
    toast.success("Shareable scenario link copied to clipboard!");
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
                      onClick={() => handleExampleClick(EXAMPLE_FULL[ex])}
                      className="rounded-2xl border border-border bg-muted px-4 py-3 text-left text-sm text-muted-foreground transition hover:border-[var(--accent-cyan)] hover:text-foreground cursor-pointer disabled:opacity-50"
                      disabled={isTypingExample || state === "loading"}
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
                <Card className="border-border bg-card overflow-hidden shadow-lg rounded-2xl">
                  <div className="grid md:grid-cols-[220px_1fr] min-h-[550px]">
                    {/* Left Navigation Sidebar */}
                    <div className="border-r border-border bg-muted/30 p-5 space-y-6">
                      <div>
                        <span className="font-mono-data text-[9px] uppercase tracking-widest text-muted-foreground block">Intelligence Desk</span>
                        <span className="text-[11px] font-semibold text-foreground block mt-0.5">Scenario Analyser</span>
                      </div>
                      
                      <div className="space-y-1">
                        {[
                          { id: "narrative", label: "Executive Brief", icon: FileText, desc: "Narrative memo report" },
                          { id: "charts", label: "Quantitative Charts", icon: BarChart3, desc: "Reallocations & Gauge" },
                          { id: "timeline", label: "Archived Precedents", icon: Calendar, desc: "Historical timelines" },
                          { id: "exports", label: "Export & Sharing", icon: Share2, desc: "PDF, Excel & Links" },
                        ].map((tab) => {
                          const Icon = tab.icon;
                          const active = activeTab === tab.id;
                          return (
                            <button
                              key={tab.id}
                              onClick={() => setActiveTab(tab.id as any)}
                              className={`w-full text-left rounded-lg p-2.5 transition-colors cursor-pointer block ${
                                active ? "bg-muted text-foreground border-l-2 border-[var(--primary)] font-semibold shadow-sm" : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4" />
                                <span className="text-xs">{tab.label}</span>
                              </div>
                              <span className="text-[9px] text-muted-foreground/80 block pl-6 mt-0.5">{tab.desc}</span>
                            </button>
                          );
                        })}
                      </div>
                      
                      <div className="border-t border-border pt-4 text-[9px] font-mono-data text-muted-foreground uppercase leading-relaxed">
                        <div>REF ID: {savedBriefId ? savedBriefId.slice(0, 8) : "DRAFT"}</div>
                        <div className="mt-1">Confidence: {confidence ?? "Medium"}</div>
                      </div>
                    </div>

                    {/* Right Content Panel */}
                    <div className="p-6 overflow-y-auto max-h-[70vh]">
                      {activeTab === "narrative" && (
                        <div className="space-y-5">
                          <div className="rounded-3xl border border-border bg-muted/50 p-4">
                            <div className="text-sm font-semibold text-foreground">Narrative summary</div>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                              The memo below synthesizes your scenario with relevant historical matches and confidence scoring for analyst-ready review.
                            </p>
                          </div>

                          <div className="grid gap-4">
                            {memoSections.map((section) => (
                              <Card key={section.title} className="relative group/section border-border bg-background p-4 shadow-sm">
                                <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
                                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground font-mono-data">
                                    {section.title}
                                  </div>
                                  <button 
                                    onClick={() => handleSpeakSection(section.body)}
                                    className={`p-1 rounded hover:bg-muted transition-colors cursor-pointer ${speakingSection === section.body ? "text-primary" : "text-muted-foreground opacity-0 group-hover/section:opacity-100"}`}
                                    title={speakingSection === section.body ? "Stop reading" : "Read section aloud"}
                                  >
                                    <Volume2 className="h-3 w-3" />
                                  </button>
                                </div>
                                <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">
                                  {renderBodyWithCitations(section.body, historicalMatches)}
                                </div>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}

                      {activeTab === "charts" && (
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

                          <div className="mt-6 grid grid-cols-2 gap-4">
                            <div className="rounded-3xl border border-border bg-background p-5 flex flex-col justify-between">
                              <div>
                                <div className="text-[10px] font-mono-data uppercase tracking-[0.22em] text-muted-foreground">Confidence Score</div>
                                <div className="mt-3 text-2xl font-semibold text-foreground">{confidence ?? "Low"}</div>
                              </div>
                              <span className="text-[9px] font-mono-data text-muted-foreground block mt-1 uppercase tracking-wider">Calibration Factor</span>
                            </div>

                            <div className="rounded-3xl border border-border bg-background p-5 flex items-center justify-between">
                              <div className="flex-1">
                                <div className="text-[10px] font-mono-data uppercase tracking-[0.22em] text-muted-foreground">Geopolitical Shift</div>
                                <div className="mt-2 text-2xl font-semibold text-foreground">{riskScore}%</div>
                                <span className="text-[9px] font-mono-data text-muted-foreground block mt-1 uppercase tracking-wider">Shift Intensity</span>
                              </div>
                              <div className="relative h-14 w-14 flex-shrink-0">
                                <svg className="h-full w-full -rotate-90">
                                  <defs>
                                    <linearGradient id="riskGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                      <stop offset="0%" stopColor="var(--primary)" />
                                      <stop offset="100%" stopColor={riskScore > 70 ? "var(--destructive)" : "var(--accent-cyan)"} />
                                    </linearGradient>
                                  </defs>
                                  <circle cx="28" cy="28" r="23" fill="none" stroke="var(--border)" strokeWidth="3.5" />
                                  <circle 
                                    cx="28" 
                                    cy="28" 
                                    r="23" 
                                    fill="none" 
                                    stroke="url(#riskGradient)" 
                                    strokeWidth="3.5" 
                                    strokeDasharray={2 * Math.PI * 23} 
                                    strokeDashoffset={2 * Math.PI * 23 * (1 - riskScore / 100)} 
                                    strokeLinecap="round"
                                    className="transition-all duration-1000 ease-out"
                                  />
                                </svg>
                                <span className="absolute inset-0 flex items-center justify-center font-mono-data text-[9px] font-bold">
                                  {riskScore > 70 ? "HIGH" : riskScore > 40 ? "MED" : "LOW"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="rounded-3xl border border-border bg-background p-5 mt-6">
                            <div className="text-[10px] font-mono-data uppercase tracking-[0.22em] text-muted-foreground mb-3">
                              Calibration Calibration: Scenario vs History
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs border-b border-border pb-2 mb-2 font-mono-data text-muted-foreground uppercase tracking-wider">
                              <div>Parameter</div>
                              <div>Your Scenario</div>
                              <div>Historical Match</div>
                            </div>
                            <div className="space-y-3.5 text-xs">
                              <div className="grid grid-cols-3 gap-2">
                                <div className="font-semibold text-foreground">Defense Shift</div>
                                <div className="text-[var(--primary)] font-semibold">{parsePercentageFromScenario(input, "defense")}</div>
                                <div className="text-muted-foreground truncate">{historicalMatches[0]?.defense_trend || "N/A"}</div>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <div className="font-semibold text-foreground">Emissions / Energy</div>
                                <div className="text-[var(--accent-cyan)] font-semibold">{parsePercentageFromScenario(input, "subsidy")}</div>
                                <div className="text-muted-foreground truncate">{historicalMatches[0]?.emissions_trend || "N/A"}</div>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <div className="font-semibold text-foreground">Key Jurisdiction</div>
                                <div className="text-foreground truncate">{getCountriesFromScenario(input)[0] || "Global"}</div>
                                <div className="text-muted-foreground font-semibold truncate">{historicalMatches[0]?.country || "N/A"} ({historicalMatches[0]?.period || "N/A"})</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeTab === "timeline" && (
                        <div className="space-y-5">
                          <div className="rounded-3xl border border-border bg-background p-5">
                            <div className="text-[10px] font-mono-data uppercase tracking-[0.22em] text-muted-foreground mb-4">
                              Historical Precedent Timeline
                            </div>
                            <div className="relative border-l border-border pl-6 ml-3 space-y-6">
                              {historicalMatches.slice(0, 3).map((match, idx) => (
                                <div key={`${match.country}-${match.period}`} className="relative group">
                                  <div className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full border-2 border-background" style={{ backgroundColor: ["var(--primary)", "var(--accent-cyan)", "var(--accent-violet)"][idx % 3] }} />
                                  <div className="flex items-center justify-between text-xs font-mono-data text-muted-foreground uppercase tracking-wider">
                                    <span>{match.period}</span>
                                    <span className="bg-muted px-1.5 py-0.5 rounded text-[9px] text-foreground font-semibold">
                                      {(match.similarity * 100).toFixed(0)}% Similarity
                                    </span>
                                  </div>
                                  <div className="mt-1 font-display text-base font-semibold text-foreground leading-snug">{match.country}</div>
                                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                    Grounded baseline for emissions outputs and geopolitical shifts during this epoch.
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {activeTab === "exports" && (
                        <div className="space-y-5">
                          <div className="rounded-3xl border border-border bg-muted/50 p-5">
                            <div className="text-sm font-semibold text-foreground">Export Panel</div>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                              Extract your brief report as structured text, PDF format, or share the interactive parameters.
                            </p>
                          </div>

                          <div className="flex flex-col gap-2.5">
                            {saving && (
                              <div className="rounded-2xl border border-border bg-blue-50/50 p-4 text-blue-700 dark:text-blue-300 flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-sm font-medium">Saving memo to drafts...</span>
                              </div>
                            )}
                            {savedBriefId && !saving && (
                              <div className="rounded-2xl border border-border bg-green-50/50 p-4 text-green-700 dark:text-green-300 flex items-center gap-2">
                                <Check className="h-4 w-4" />
                                <span className="text-sm font-medium font-mono-data text-xs">Saved to Past Drafts (ID: {savedBriefId.slice(0, 8)})</span>
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-2">
                              <Button onClick={downloadBrief} variant="outline" className="w-full gap-2 text-xs font-mono-data uppercase tracking-wider h-10 rounded-sm">
                                <Download className="h-4 w-4" /> Download (.txt)
                              </Button>
                              <Button onClick={downloadPdfBrief} variant="outline" className="w-full gap-2 text-xs font-mono-data uppercase tracking-wider h-10 rounded-sm">
                                <Download className="h-4 w-4" /> Export (.pdf)
                              </Button>
                            </div>
                            <Button onClick={generateShareLink} variant="secondary" className="w-full gap-2 text-xs font-mono-data uppercase tracking-wider h-10 rounded-sm cursor-pointer">
                              <Share2 className="h-4 w-4" /> Copy Shareable Link
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
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
                {isInvalidPolicyError ? (
                  <div>{INVALID_POLICY_ERROR}</div>
                ) : (
                  <>
                    <div className="font-semibold">Error</div>
                    <div>{error}</div>
                  </>
                )}
              </Card>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

