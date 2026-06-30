import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Loader2,
  Download,
  Check,
  Share2,
  Volume2,
  BarChart3,
  Calendar,
  Compass,
  Sliders,
  Network,
  Play,
  RotateCcw,
  Sparkles,
  Command,
  Search,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { fetchSimulationHistory, generateForesightMemo } from "@/services/simulatorService";
import { createBrief } from "@/lib/supabase/dashboard";
import AnalyticsCharts from "@/components/AnalyticsCharts";
import { WorldMap } from "@/components/ui/map";
import { SimulationReportCharts } from "@/components/SimulationReportCharts";
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
  "defence", "defense", "climate", "emissions", "renewable", "renewables",
  "subsidy", "subsidies", "fossil", "budget", "spending", "procurement",
  "security", "regulation", "tax", "tariff", "green", "infrastructure",
  "policy", "legislation", "sanction", "trade", "industrial", "energy",
  "transport", "migration",
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
  const [loadingStep, setLoadingStep] = useState(0);
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<"High" | "Medium" | "Low" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [historicalMatches, setHistoricalMatches] = useState<{ country: string; period: string; similarity: number }[]>([]);
  const [history, setHistory] = useState<SimulationHistoryItem[]>([]);
  const [savedBriefId, setSavedBriefId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isTypingExample, setIsTypingExample] = useState(false);
  const [speakingSection, setSpeakingSection] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"narrative" | "charts" | "timeline" | "exports" | "networks">("narrative");

  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [paletteSearch, setPaletteSearch] = useState("");

  const [scaleMultiplier, setScaleMultiplier] = useState<number>(1.0);

  const [guidedMode, setGuidedMode] = useState(false);
  const [wizardCountry, setWizardCountry] = useState("India");
  const [wizardShiftType, setWizardShiftType] = useState("Defense spend increase");
  const [wizardAmount, setWizardAmount] = useState(15);
  const [wizardEnergySource, setWizardEnergySource] = useState("fossil fuel subsidies");
  const [wizardOffsetAmount, setWizardOffsetAmount] = useState(20);

  const mapDots = useMemo(() => {
    return [
      {
        start: { lat: 38.9072, lng: -77.0369, label: "United States" },
        end: { lat: 51.1657, lng: 10.4515, label: "Germany" },
      },
      {
        start: { lat: 55.3781, lng: -3.4360, label: "United Kingdom" },
        end: { lat: 60.1282, lng: 18.6435, label: "Sweden" },
      },
      {
        start: { lat: 20.5937, lng: 78.9629, label: "India" },
        end: { lat: 35.8617, lng: 104.1954, label: "China" },
      },
      {
        start: { lat: 23.8859, lng: 45.0792, label: "Saudi Arabia" },
        end: { lat: 20.5937, lng: 78.9629, label: "India" },
      },
    ];
  }, []);

  const handleMapPointClick = (label: string) => {
    const matchedCountry = AVAILABLE_ANALYTICS_COUNTRIES.find(
      (c) => c.toLowerCase() === label.toLowerCase()
    );
    if (matchedCountry) {
      setWizardCountry(matchedCountry);
      toast.info(`${matchedCountry} selected in Guided Builder`);
    }
  };

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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

    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    const day = String(new Date().getDate()).padStart(2, "0");
    const timestamp = Date.now() % 10000;
    const ref_id = `FB-${year}${month}${day}-${String(timestamp).padStart(4, "0")}`;

    const forecastAccuracyMap: Record<string, number> = {
      "High": 0.85,
      "Medium": 0.65,
      "Low": 0.45,
    };

    const briefData: any = {
      ref_id,
      title: scenario.substring(0, 100),
      status: "Draft",
      tag: "Scenario Simulator",
      pages: Math.max(1, Math.ceil(memo.length / 500)),
      accent_color: "var(--primary)",
      content: { memo, historicalMatches, confidence: conf, scaleMultiplier },
      citations_count: historicalMatches.length,
      forecast_accuracy: forecastAccuracyMap[conf],
    };

    try {
      const brief = await createBrief(session.user.id, briefData);
      return brief;
    } catch (err: any) {
      console.error("Create brief error details:", err);
      const errorMsg = err.message || "";
      if ((err.status === 400 || errorMsg.includes("column")) && 
          (errorMsg.includes("citations_count") || errorMsg.includes("forecast_accuracy"))) {
        const fallbackData = { ...briefData };
        delete fallbackData.citations_count;
        delete fallbackData.forecast_accuracy;
        try {
          const brief = await createBrief(session.user.id, fallbackData);
          return brief;
        } catch (fallbackErr) {
          throw err;
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

    setError(null);
    setMarkdown(null);
    setSavedBriefId(null);
    setState("loading");
    setLoadingStep(0);

    const stepInterval = setInterval(() => {
      setLoadingStep((s) => (s < 2 ? s + 1 : s));
    }, 900);

    try {
      if (!isSupabaseConfigured()) {
        throw new Error("Supabase is not configured. Please log in to generate a memo.");
      }
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("No active session found. Please sign in to generate a memo.");
      }

      const res = await generateForesightMemo(input);
      clearInterval(stepInterval);
      setLoadingStep(2);
      
      setMarkdown(res.memo);
      setHistoricalMatches(res.historicalMatches);
      setConfidence(res.confidence);

      try {
        setSaving(true);
        const brief = await saveMemoAsBrief(input, res.memo, res.confidence);
        setSavedBriefId(brief.id);
      } catch (saveErr) {
        console.warn("Unable to save memo as brief", saveErr);
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
      clearInterval(stepInterval);
      setError(err.message || String(err));
      setState("idle");
    }
  };

  const compileWizardScenario = () => {
    const text = `${wizardCountry} implements a ${wizardAmount}% ${wizardShiftType.toLowerCase()} while decreasing ${wizardEnergySource} by ${wizardOffsetAmount}%.`;
    setInput(text);
    toast.success("Scenario compiled successfully from Guided Wizard!");
  };

  const downloadBrief = () => {
    const memoText = markdown ?? "";
    const text = `VERIPOLICY FORESIGHT MEMO\n========================\n\nScenario:\n${input}\n\nScale Calibration Factor: ${scaleMultiplier}x\n\n${memoText}\n\nGenerated by Llama 3.3 70B via Groq.\n`;
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

      doc.setDrawColor(241, 215, 205);
      doc.rect(5, 5, 200, 287);

      doc.setFont("Garamond", "normal");
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      doc.text("VERIPOLICY OFFICE OF POLICY INTELLIGENCE", 15, 20);
      doc.text("FORESIGHT MEMO", 155, 20);

      doc.setDrawColor(226, 149, 120);
      doc.setLineWidth(0.5);
      doc.line(15, 23, 195, 23);

      doc.setTextColor(43, 29, 24);
      doc.setFontSize(14);
      doc.text("SUBJECT: SCENARIO FORESIGHT MEMO (CALIBRATED)", 15, 34);

      doc.setFontSize(10);
      doc.setFont("Courier", "italic");
      doc.text(`SCENARIO STATEMENT (SCALE FACTOR: ${scaleMultiplier}x):`, 15, 42);
      
      const splitScenario = doc.splitTextToSize(input, 175);
      doc.text(splitScenario, 15, 47);
      
      let currentY = 47 + (splitScenario.length * 5) + 6;
      doc.line(15, currentY, 195, currentY);
      currentY += 8;

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
        const { data: profile } = (await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", session.user.id)
          .maybeSingle()) as any;
        if (profile?.full_name) {
          doc.setFont("Courier", "bold");
          doc.setTextColor(20, 20, 20);
          doc.text(profile.full_name, 20, currentY + 9);
        }
      }

      doc.save(`veripolicy-calibrated-memo-${Date.now().toString().slice(-6)}.pdf`);
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

  const filteredShortcuts = useMemo(() => {
    const list = [
      { name: "Reset simulation fields", desc: "Clear all input fields and current memo", action: () => { setInput(""); setMarkdown(null); setError(null); setState("idle"); } },
      { name: "Toggle guided wizard", desc: "Switch input method between free-form and step wizard", action: () => setGuidedMode(!guidedMode) },
      { name: "Switch to Sunset Light theme", desc: "Change application styling to Light Mode", action: () => document.documentElement.classList.remove("dark", "forest") },
      { name: "Switch to Sunset Dark theme", desc: "Change application styling to Dark Mode", action: () => { document.documentElement.classList.remove("forest"); document.documentElement.classList.add("dark"); } },
      { name: "Load scenario template: India spend shift", desc: "India +15% defense, -20% subsidies", action: () => handleExampleClick(EXAMPLE_FULL[EXAMPLES[0]]) },
      { name: "Load scenario template: Germany energy shift", desc: "Germany 3% GDP defense + renewables", action: () => handleExampleClick(EXAMPLE_FULL[EXAMPLES[1]]) },
    ];
    return list.filter(item => item.name.toLowerCase().includes(paletteSearch.toLowerCase()) || item.desc.toLowerCase().includes(paletteSearch.toLowerCase()));
  }, [paletteSearch, guidedMode]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto max-w-7xl px-5 py-8 sm:px-8"
      >
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2 font-mono-data text-xs uppercase tracking-widest text-muted-foreground">
              <Compass className="h-4 w-4 text-[var(--primary)]" />
              <span>Office of Foresight & Strategic Simulation</span>
            </div>
            <h1 className="mt-1.5 font-display text-4xl font-semibold tracking-tight">Scenario Simulator</h1>
          </div>
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 font-mono-data text-[10px] uppercase tracking-wider h-9"
              onClick={() => setCommandPaletteOpen(true)}
            >
              <Command className="h-3.5 w-3.5" /> Command Menu
              <kbd className="hidden md:inline-flex h-4 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[8px]">⌘K</kbd>
            </Button>
            <Button
              variant={guidedMode ? "default" : "outline"}
              size="sm"
              className="gap-1.5 font-mono-data text-[10px] uppercase tracking-wider h-9"
              onClick={() => setGuidedMode(!guidedMode)}
            >
              <Sliders className="h-3.5 w-3.5" /> {guidedMode ? "Free-form Text" : "Guided Wizard"}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
          <div className="space-y-6">
            <div className="flex border border-border bg-muted/45 p-1 rounded-xl shadow-sm">
              <button
                onClick={() => setGuidedMode(true)}
                className={`flex-1 py-2 text-xs font-mono-data uppercase tracking-wider text-center rounded-lg transition-all cursor-pointer ${
                  guidedMode ? "bg-card text-foreground font-semibold shadow-sm border border-border/40" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Guided Policy Wizard
              </button>
              <button
                onClick={() => setGuidedMode(false)}
                className={`flex-1 py-2 text-xs font-mono-data uppercase tracking-wider text-center rounded-lg transition-all cursor-pointer ${
                  !guidedMode ? "bg-card text-foreground font-semibold shadow-sm border border-border/40" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Narrative Scenario Statement
              </button>
            </div>

            {guidedMode ? (
              <Card className="border-border bg-card p-6 shadow-sm rounded-2xl relative overflow-hidden">
                <div className="absolute right-0 top-0 h-32 w-32 bg-gradient-to-bl from-[var(--primary)]/10 to-transparent pointer-events-none" />
                <CardHeader className="px-0 pt-0">
                  <div className="flex items-center gap-2 text-foreground font-semibold font-display text-xl">
                    <Sparkles className="h-5 w-5 text-[var(--primary)]" />
                    Guided Policy Builder
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select country parameters to compile a RAG-ready simulation statement.
                  </p>
                </CardHeader>
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-mono-data uppercase tracking-wider text-muted-foreground block mb-1.5">Jurisdiction</label>
                      <select
                        value={wizardCountry}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setWizardCountry(e.target.value)}
                        className="w-full h-10 border border-border bg-background px-3 rounded-xl text-sm"
                      >
                        {AVAILABLE_ANALYTICS_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-mono-data uppercase tracking-wider text-muted-foreground block mb-1.5">Policy Target</label>
                      <select
                        value={wizardShiftType}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setWizardShiftType(e.target.value)}
                        className="w-full h-10 border border-border bg-background px-3 rounded-xl text-sm"
                      >
                        <option>Defense spend increase</option>
                        <option>Defense spend cut</option>
                        <option>Climate budget raise</option>
                        <option>Carbon regulatory tightening</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-[10px] font-mono-data uppercase tracking-wider text-muted-foreground">Allocation Shift Intensity</span>
                      <span className="font-mono-data font-semibold text-[var(--primary)]">{wizardAmount}%</span>
                    </div>
                    <input
                      type="range" min="1" max="100" value={wizardAmount}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWizardAmount(Number(e.target.value))}
                      className="w-full accent-[var(--primary)] bg-muted h-1 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-mono-data uppercase tracking-wider text-muted-foreground block mb-1.5">Offset Funding Source</label>
                      <select
                        value={wizardEnergySource}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setWizardEnergySource(e.target.value)}
                        className="w-full h-10 border border-border bg-background px-3 rounded-xl text-sm"
                      >
                        <option value="fossil fuel subsidies">fossil fuel subsidies</option>
                        <option value="infrastructure funding">infrastructure funding</option>
                        <option value="national reserves">national reserves</option>
                        <option value="corporate subsidies">corporate subsidies</option>
                      </select>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-[10px] font-mono-data uppercase tracking-wider text-muted-foreground">Offset Reduction</span>
                        <span className="font-mono-data font-semibold text-[var(--accent-cyan)]">{wizardOffsetAmount}%</span>
                      </div>
                      <input
                        type="range" min="1" max="100" value={wizardOffsetAmount}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWizardOffsetAmount(Number(e.target.value))}
                        className="w-full accent-[var(--accent-cyan)] bg-muted h-1 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <Button onClick={compileWizardScenario} size="sm" className="font-mono-data uppercase text-[10px] tracking-wider">
                      Compile & Sync Scenario
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="border-border bg-card p-6 shadow-sm rounded-2xl">
                <CardHeader className="px-0 pt-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-display text-xl font-semibold">Narrative Scenario Statement</CardTitle>
                    <span className="text-[10px] font-mono-data uppercase text-muted-foreground">Primary source RAG</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Describe a reallocation of sovereign funds, military budgets, or emissions targets to begin.
                  </p>
                </CardHeader>
                <Textarea
                  value={input}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
                  placeholder="Describe a policy scenario... e.g. United States reallocates $40bn from climate adaptation toward strategic semiconductor manufacturing."
                  className="mt-3 min-h-[140px] resize-none bg-background font-sans text-sm rounded-xl focus-visible:ring-1 focus-visible:ring-[var(--primary)]"
                />
                
                <div className="mt-4 flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between border-t border-border/40 pt-4">
                  <div className="text-[10px] font-mono-data uppercase tracking-wider text-muted-foreground">
                    Estimated Shift: {riskScore}% Intensity
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setInput("")}
                      variant="outline"
                      className="font-mono-data text-[10px] uppercase tracking-wider h-9 px-3 rounded-lg"
                      disabled={state === "loading" || !input}
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
                    </Button>
                    <Button
                      onClick={generate}
                      disabled={state === "loading" || !input.trim()}
                      className="font-mono-data text-[10px] uppercase tracking-wider h-9 px-4 rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90"
                    >
                      {state === "loading" ? (
                        <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Simulating...</>
                      ) : (
                        <><Play className="h-3 w-3 mr-1.5" /> Execute Simulation</>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            <Card className="border-border bg-card p-5 rounded-2xl">
              <div className="font-mono-data text-[10px] uppercase tracking-wider text-muted-foreground mb-3">
                Pre-configured Geopolitical Scenarios
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => handleExampleClick(EXAMPLE_FULL[ex])}
                    className="rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 text-left text-xs text-muted-foreground transition hover:border-[var(--primary)] hover:text-foreground cursor-pointer disabled:opacity-50"
                    disabled={isTypingExample || state === "loading"}
                  >
                    <div className="font-semibold text-foreground truncate">{ex.split(":")[0]}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{ex.split(":")[1]}</div>
                  </button>
                ))}
              </div>
            </Card>

            <AnimatePresence mode="wait">
              {state === "idle" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex h-[320px] flex-col items-center justify-center border-2 border-dashed bg-card/10 p-8 text-center rounded-2xl"
                  style={{ borderColor: "color-mix(in oklab, var(--primary) 20%, transparent)" }}
                >
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-card border border-border/80 text-muted-foreground mb-4">
                    <FileText className="h-6 w-6 text-muted-foreground/60" />
                  </div>
                  <h3 className="font-display text-lg font-medium text-foreground">Waiting for simulation scenario</h3>
                  <p className="mt-1 max-w-xs text-xs text-muted-foreground leading-relaxed">
                    Input a scenario above or select a preset template to compile a live calibrated memorandum.
                  </p>
                </motion.div>
              )}

              {state === "loading" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <Card className="border-border bg-card p-6 rounded-2xl flex flex-col items-center justify-center text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)] mb-4" />
                    <h3 className="font-display text-lg font-medium text-foreground">Analyzing Reallocation Directives</h3>
                    
                    <div className="w-full max-w-md bg-muted h-1 rounded-full overflow-hidden mt-4 mb-2">
                      <div
                        className="h-full bg-[var(--primary)] transition-all duration-1000 ease-out"
                        style={{ width: loadingStep === 0 ? "35%" : loadingStep === 1 ? "70%" : "95%" }}
                      />
                    </div>
                    
                    <div className="font-mono-data text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                      {loadingStep === 0 && "1. Vector searching primary-source analogues..."}
                      {loadingStep === 1 && "2. Calibration Scaling Math calculations..."}
                      {loadingStep === 2 && "3. Compiling final executive foresight memo..."}
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-6">
            <Card className="border-border bg-card p-5 rounded-2xl shadow-sm">
              <div className="font-mono-data text-[10px] uppercase tracking-wider text-muted-foreground mb-3 flex items-center justify-between">
                <span>Interactive Geopolitical Map</span>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
              </div>
              <div className="border border-border rounded-xl bg-background/50 p-2 overflow-hidden">
                <WorldMap
                  dots={mapDots}
                  lineColor="var(--primary)"
                  onPointClick={handleMapPointClick}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 leading-normal text-center">
                Click dots on the map to auto-select target jurisdictions for the Guided Builder.
              </p>
            </Card>

            {history.length > 0 && (
              <Card className="border-border bg-card p-5 rounded-2xl shadow-sm">
                <div className="font-mono-data text-[10px] uppercase tracking-wider text-muted-foreground mb-3">
                  Simulation History Log
                </div>
                <div className="space-y-2.5 max-h-[220px] overflow-y-auto custom-scroll pr-1">
                  {history.slice(0, 5).map((item: SimulationHistoryItem) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-border bg-background p-3 hover:border-primary/50 transition-colors cursor-pointer"
                      onClick={() => setInput(item.scenario)}
                    >
                      <div className="text-xs text-foreground font-medium line-clamp-2 leading-relaxed">{item.scenario}</div>
                      <div className="mt-1 flex items-center justify-between text-[9px] text-muted-foreground">
                        <span>{new Date(item.created_at).toLocaleDateString()}</span>
                        <span className="text-[8px] uppercase font-mono-data">Click to reload</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* SIMULATION DOSSIER RESULTS CARD (Full width below) */}
        <AnimatePresence>
          {state === "done" && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="mt-8"
            >
              <Card className="border-border bg-card overflow-hidden shadow-sm rounded-2xl">
                <div className="grid md:grid-cols-[220px_1fr] min-h-[500px]">
                  {/* Left Sidebar */}
                  <div className="border-r border-border bg-muted/20 p-5 space-y-6">
                    <div>
                      <span className="font-mono-data text-[9px] uppercase tracking-widest text-muted-foreground block">Intelligence Desk</span>
                      <span className="text-[11px] font-semibold text-foreground block mt-0.5">Scenario Analyser</span>
                    </div>
                    
                    <div className="space-y-1">
                      {[
                        { id: "narrative", label: "Executive Brief", icon: FileText, desc: "Narrative memo report" },
                        { id: "charts", label: "Quantitative Charts", icon: BarChart3, desc: "Reallocations & Gauge" },
                        { id: "timeline", label: "Archived Precedents", icon: Calendar, desc: "Historical timelines" },
                        { id: "networks", label: "Relationship Graph", icon: Network, desc: "RAG vector match map" },
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

                  {/* Main Tab Content Panel */}
                  <div className="p-6 overflow-y-auto max-h-[90vh] custom-scroll">
                    {activeTab === "narrative" && (
                      <div className="space-y-5 animate-fade-in">
                        <div className="rounded-2xl border border-border bg-muted/40 p-4">
                          <div className="text-xs font-semibold text-foreground">Narrative summary</div>
                          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                            The memo below synthesizes your scenario with relevant historical matches and confidence scoring.
                          </p>
                        </div>

                        <div className="grid gap-4">
                          {memoSections.map((section) => (
                            <Card key={section.title} className="relative group/section border-border bg-background p-4 shadow-sm">
                              <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
                                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground font-mono-data">
                                  {section.title}
                                </div>
                                <button 
                                  onClick={() => handleSpeakSection(section.body)}
                                  className={`p-1 rounded hover:bg-muted transition-colors cursor-pointer ${speakingSection === section.body ? "text-primary" : "text-muted-foreground opacity-0 group-hover/section:opacity-100"}`}
                                  title={speakingSection === section.body ? "Stop reading" : "Read section aloud"}
                                >
                                  <Volume2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                                {renderBodyWithCitations(section.body, historicalMatches)}
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeTab === "charts" && (
                      <div className="space-y-6 animate-fade-in">
                        <div className="grid gap-6 md:grid-cols-2">
                          {/* Left: AI Slider Control */}
                          <div className="rounded-2xl border border-border bg-muted/40 p-5 flex flex-col justify-between">
                            <div>
                              <div className="text-xs font-semibold text-foreground">Explainable AI Calibration</div>
                              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                Use the slider below to adjust the scale calibration factor dynamically.
                              </p>
                            </div>
                            <div className="mt-4">
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-[10px] font-mono-data uppercase tracking-wider text-muted-foreground">Manual Math Override</span>
                                <span className="font-mono-data font-semibold text-primary">{scaleMultiplier.toFixed(1)}x</span>
                              </div>
                              <input
                                type="range" min="0.1" max="4.0" step="0.1" value={scaleMultiplier}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setScaleMultiplier(Number(e.target.value))}
                                className="w-full accent-primary h-1 rounded-lg cursor-pointer mt-2"
                              />
                            </div>
                          </div>

                          {/* Right: Confidence Indicators */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="rounded-2xl border border-border bg-background p-4 flex flex-col justify-between shadow-sm">
                              <div>
                                <div className="text-[9px] font-mono-data uppercase tracking-[0.22em] text-muted-foreground">Confidence Score</div>
                                <div className="mt-2 text-2xl font-semibold text-foreground">{confidence ?? "Low"}</div>
                              </div>
                              <span className="text-[8px] font-mono-data text-muted-foreground block mt-1.5 uppercase tracking-wider">Calibration Factor</span>
                            </div>

                            <div className="rounded-2xl border border-border bg-background p-4 flex items-center justify-between shadow-sm">
                              <div className="flex-1">
                                <div className="text-[9px] font-mono-data uppercase tracking-[0.22em] text-muted-foreground">Geopolitical Shift</div>
                                <div className="mt-1.5 text-2xl font-semibold text-foreground">{Math.round(riskScore * scaleMultiplier)}%</div>
                                <span className="text-[8px] font-mono-data text-muted-foreground block mt-1.5 uppercase tracking-wider">Shift Intensity</span>
                              </div>
                              <div className="relative h-12 w-12 flex-shrink-0">
                                <svg className="h-full w-full -rotate-90">
                                  <circle cx="24" cy="24" r="20" fill="none" stroke="var(--border)" strokeWidth="3" />
                                  <circle 
                                    cx="24" 
                                    cy="24" 
                                    r="20" 
                                    fill="none" 
                                    stroke="var(--primary)" 
                                    strokeWidth="3" 
                                    strokeDasharray={2 * Math.PI * 20} 
                                    strokeDashoffset={2 * Math.PI * 20 * (1 - Math.min(100, Math.round(riskScore * scaleMultiplier)) / 100)} 
                                    strokeLinecap="round"
                                    className="transition-all duration-700 ease-out"
                                  />
                                </svg>
                                <span className="absolute inset-0 flex items-center justify-center font-mono-data text-[8px] font-bold">
                                  {Math.round(riskScore * scaleMultiplier) > 70 ? "HIGH" : Math.round(riskScore * scaleMultiplier) > 40 ? "MED" : "LOW"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Designer Projections */}
                        <div className="border-t border-border pt-6">
                          <div className="mb-4">
                            <span className="font-mono-data text-[9px] uppercase tracking-widest text-muted-foreground">Calibration Forecasts</span>
                            <h3 className="text-base font-semibold text-foreground mt-0.5">Sovereign Simulation Projections</h3>
                          </div>
                          <SimulationReportCharts
                            country={wizardCountry}
                            shiftType={wizardShiftType}
                            amount={wizardAmount}
                            offsetAmount={wizardOffsetAmount}
                            scaleMultiplier={scaleMultiplier}
                            riskScore={riskScore}
                          />
                        </div>

                        {/* Historical Baseline */}
                        <div className="border-t border-border pt-6">
                          <div className="mb-4">
                            <span className="font-mono-data text-[9px] uppercase tracking-widest text-muted-foreground">Baseline Data</span>
                            <h3 className="text-base font-semibold text-foreground mt-0.5">Historical Base Expenditure Comparison</h3>
                          </div>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {chartCountries.map((country) => (
                              <span key={country} className="rounded-full border border-border bg-background px-3 py-1 text-[10px] font-mono-data text-foreground">
                                {country}
                              </span>
                            ))}
                          </div>
                          <AnalyticsCharts countries={displayedCountries} />
                        </div>
                      </div>
                    )}

                    {activeTab === "timeline" && (
                      <div className="space-y-5 animate-fade-in">
                        <div className="rounded-2xl border border-border bg-background p-5 shadow-sm">
                          <div className="text-[10px] font-mono-data uppercase tracking-[0.22em] text-muted-foreground mb-4">
                            Historical Precedent Timeline
                          </div>
                          {historicalMatches.length === 0 ? (
                            <div className="text-center py-6 text-xs text-muted-foreground font-mono-data">
                              No matching analogues found.
                            </div>
                          ) : (
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
                          )}
                        </div>
                      </div>
                    )}

                    {activeTab === "networks" && (
                      <div className="space-y-5 animate-fade-in">
                        <div className="rounded-2xl border border-border bg-background p-5 shadow-sm">
                          <div className="text-[10px] font-mono-data uppercase tracking-[0.22em] text-muted-foreground mb-3 flex items-center justify-between">
                            <span>Vector Match Precedent Network Graph</span>
                            <span className="text-[9px] font-normal lowercase tracking-normal">RAG similarity threshold: 0.65</span>
                          </div>
                          <div className="border border-border rounded-xl bg-background/50 p-2 flex items-center justify-center min-h-[220px]">
                            <svg className="w-full h-[200px]" viewBox="0 0 200 100">
                              {/* Center Node (Current Scenario) */}
                              <circle cx="100" cy="50" r="6" fill="var(--primary)" className="animate-pulse" />
                              <text x="100" y="40" textAnchor="middle" className="font-mono-data text-[5px] fill-foreground font-bold">Active Scenario</text>

                              {/* Connecting Match Lines & Nodes */}
                              {historicalMatches.map((match, idx) => {
                                const angles = [30, 150, 270, 90, 210, 330];
                                const angle = (angles[idx % angles.length] * Math.PI) / 180;
                                const radius = 35 + idx * 5;
                                const cx = 100 + radius * Math.cos(angle);
                                const cy = 50 + radius * Math.sin(angle);

                                return (
                                  <g key={idx}>
                                    <line x1="100" y1="50" x2={cx} y2={cy} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="1 1" />
                                    <circle cx={cx} cy={cy} r="4" fill="var(--accent-cyan)" />
                                    <text x={cx} y={cy - 6} textAnchor="middle" className="font-mono-data text-[4px] fill-muted-foreground">{match.country} ({match.period})</text>
                                    <text x={cx} y={cy + 10} textAnchor="middle" className="font-mono-data text-[3.5px] fill-[var(--primary)] font-semibold">{(match.similarity * 100).toFixed(0)}% Match</text>
                                  </g>
                                );
                              })}
                            </svg>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === "exports" && (
                      <div className="space-y-5 animate-fade-in">
                        <div className="rounded-2xl border border-border bg-background p-5 shadow-sm space-y-4">
                          <div>
                            <h4 className="font-display text-sm font-semibold text-foreground">Export Dossier Memo</h4>
                            <p className="text-[10px] text-muted-foreground leading-normal mt-0.5">
                              Download this calibrated simulation in various formats for offline intelligence reports or external policymaking briefs.
                            </p>
                          </div>
                          {saving && (
                            <div className="rounded-xl border border-border bg-blue-50/50 p-4 text-blue-700 dark:text-blue-300 flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-xs font-medium">Saving memo to drafts...</span>
                            </div>
                          )}
                          {savedBriefId && !saving && (
                            <div className="rounded-xl border border-border bg-green-50/50 p-4 text-green-700 dark:text-green-300 flex items-center gap-2">
                              <Check className="h-4 w-4" />
                              <span className="text-xs font-medium font-mono-data">Saved to Past Drafts (ID: {savedBriefId.slice(0, 8)})</span>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-2">
                            <Button onClick={downloadBrief} variant="outline" className="w-full gap-2 text-xs font-mono-data uppercase tracking-wider h-10 rounded-xl">
                              <Download className="h-4 w-4" /> Download (.txt)
                            </Button>
                            <Button onClick={downloadPdfBrief} variant="outline" className="w-full gap-2 text-xs font-mono-data uppercase tracking-wider h-10 rounded-xl">
                              <Download className="h-4 w-4" /> Export (.pdf)
                            </Button>
                          </div>
                          <Button onClick={generateShareLink} variant="secondary" className="w-full gap-2 text-xs font-mono-data uppercase tracking-wider h-10 rounded-xl cursor-pointer">
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
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {commandPaletteOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 cursor-pointer"
              onClick={() => setCommandPaletteOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl p-4 z-50"
            >
              <div className="flex items-center gap-3 border-b border-border/60 pb-3">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  value={paletteSearch}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaletteSearch(e.target.value)}
                  placeholder="Type a command or shortcut... (e.g. theme, clear, wizard)"
                  className="w-full bg-transparent outline-none border-none text-sm text-foreground placeholder-muted-foreground"
                  autoFocus
                />
              </div>

              <div className="mt-3 space-y-1 max-h-[280px] overflow-y-auto custom-scroll pr-1">
                {filteredShortcuts.map((item: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => {
                      item.action();
                      setCommandPaletteOpen(false);
                      toast.success(`Executed: ${item.name}`);
                    }}
                    className="w-full text-left p-2.5 rounded-xl transition-colors hover:bg-muted/80 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-foreground">{item.name}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</div>
                    </div>
                    <kbd className="h-5 items-center gap-1 rounded border bg-background px-1.5 font-mono text-[9px] text-muted-foreground">↵</kbd>
                  </button>
                ))}
                {filteredShortcuts.length === 0 && (
                  <div className="py-8 text-center text-xs text-muted-foreground">No matching commands found.</div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
