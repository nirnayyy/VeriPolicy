import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Download, Globe2 } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AnalyticsCharts from "@/components/AnalyticsCharts";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

import { requireAuth } from "@/lib/auth-guard";

export const Route = createFileRoute("/comparison")({
  head: () => ({
    meta: [
      { title: "Scenario Comparison — VeriPolicy" },
      { name: "description", content: "Compare CO2 and military expenditure trends with historic and present context." },
    ],
  }),
  beforeLoad: requireAuth,
  component: ComparisonPage,
});

const COUNTRY_OPTIONS = [
  "United States",
  "China",
  "India",
  "Germany",
  "United Kingdom",
  "Saudi Arabia",
  "Sweden",
];

const COUNTRY_DETAILS: Record<string, { flag: string; iso: string; description: string }> = {
  "United States": { flag: "🇺🇸", iso: "USA", description: "Global superpower with the largest defense budget." },
  "China": { flag: "🇨🇳", iso: "CHN", description: "Rapidly expanding manufacturing base and regional defense." },
  "India": { flag: "🇮🇳", iso: "IND", description: "High economic growth, expanding energy infrastructure." },
  "Germany": { flag: "🇩🇪", iso: "DEU", description: "Leading EU industrial economy committing to energy shift." },
  "United Kingdom": { flag: "🇬🇧", iso: "GBR", description: "Established defense complex and advanced renewables." },
  "Saudi Arabia": { flag: "🇸🇦", iso: "SAU", description: "High GDP-share defense capital, shifting fossil model." },
  "Sweden": { flag: "🇸🇪", iso: "SWE", description: "Pioneer in carbon neutrality, recently increased military integration." },
};

const TIME_RANGES = [
  { label: "1850–1950", value: [1850, 1950] as [number, number] },
  { label: "1950–2000", value: [1950, 2000] as [number, number] },
  { label: "2000–2023", value: [2000, 2023] as [number, number] },
  { label: "Historic to present", value: [1850, 2023] as [number, number] },
];

function ComparisonPage() {
  const DEFAULT_COUNTRIES = ["United States", "China", "Germany"];

  const [selectedCountries, setSelectedCountries] = useState<string[]>(DEFAULT_COUNTRIES);
  const [selectedRange, setSelectedRange] = useState<[number, number]>([1950, 2023]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const params = new URL(window.location.href).searchParams;
      const raw = params.get("countries");
      if (!raw) return;
      const parsed = raw.split(",").map((s) => decodeURIComponent(s).trim()).filter(Boolean);
      if (parsed.length) setSelectedCountries(parsed);
    } catch (e) {
      // ignore malformed urls
    }
  }, []);

  const selectedRangeLabel = useMemo(
    () => TIME_RANGES.find((range) => range.value[0] === selectedRange[0] && range.value[1] === selectedRange[1])?.label ?? `${selectedRange[0]}–${selectedRange[1]}`,
    [selectedRange],
  );

  const handleExportSpreadsheet = async () => {
    setExporting(true);
    try {
      const { default: analyticsService } = await import("@/services/analyticsService");
      const data = await analyticsService.getAllAnalytics();
      const targetSet = new Set(selectedCountries.map((c) => c.trim()));
      
      const filtered = data
        .filter((row) => targetSet.has(row.country) && row.year >= selectedRange[0] && row.year <= selectedRange[1])
        .sort((a, b) => a.country.localeCompare(b.country) || a.year - b.year);

      const exportRows = filtered.map((row) => ({
        Country: row.country,
        Year: row.year,
        "Military Expenditure (USD Millions)": row.militaryExpenditure ?? "N/A",
        "CO2 Emissions (Million Tonnes)": row.co2 ?? "N/A",
      }));

      const { utils, writeFile } = await import("xlsx");
      const worksheet = utils.json_to_sheet(exportRows);
      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, "VeriPolicy Data");
      
      // Auto-fit column widths
      const maxLens = exportRows.reduce((acc, row) => {
        return {
          Country: Math.max(acc.Country, String(row.Country).length),
          Year: Math.max(acc.Year, String(row.Year).length),
          "Military Expenditure": Math.max(acc["Military Expenditure"], String(row["Military Expenditure (USD Millions)"]).length),
          "CO2 Emissions": Math.max(acc["CO2 Emissions"], String(row["CO2 Emissions (Million Tonnes)"]).length),
        };
      }, { Country: 10, Year: 6, "Military Expenditure": 25, "CO2 Emissions": 20 });

      worksheet["!cols"] = [
        { wch: maxLens.Country + 2 },
        { wch: maxLens.Year + 2 },
        { wch: maxLens["Military Expenditure"] + 2 },
        { wch: maxLens["CO2 Emissions"] + 2 },
      ];

      writeFile(workbook, `veripolicy-dossier-${selectedRange[0]}-${selectedRange[1]}.xlsx`);
    } catch (e) {
      console.error("Spreadsheet export failed", e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mx-auto max-w-7xl px-5 py-10 sm:px-8"
      >
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="font-mono-data text-xs uppercase tracking-widest text-muted-foreground">Comparison Dashboard</div>
            <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Historical & present CO2 vs military expenditure</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Explore how strategic defence spending and emissions trajectories align across major economies. Use the controls to compare countries and focus on a shared historic-to-present window.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" size="sm" className="h-9 rounded-sm font-mono-data text-[11px] uppercase tracking-wider">
              <a href="/simulator" className="inline-flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" /> Back to Simulator
              </a>
            </Button>
            <Button 
              onClick={handleExportSpreadsheet} 
              disabled={exporting} 
              size="sm" 
              className="h-9 rounded-sm bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[color-mix(in_oklab,var(--primary)_85%,black)] font-mono-data text-[11px] uppercase tracking-wider gap-2 shadow-sm"
            >
              <Download className="h-4 w-4" />
              {exporting ? "Exporting..." : "Export Spreadsheet (.xlsx)"}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          {/* LEFT Selection Cards Grid */}
          <Card className="border-border bg-card p-6 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-display font-semibold text-foreground">Economic jurisdictions selection</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Select the set of economies to dynamically compare across the active data series.</p>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {COUNTRY_OPTIONS.map((country) => {
                  const details = COUNTRY_DETAILS[country] || { flag: "🏳️", iso: "N/A", description: "" };
                  const selected = selectedCountries.includes(country);
                  return (
                    <button
                      key={country}
                      onClick={() => {
                        const next = selected
                          ? selectedCountries.filter((v) => v !== country)
                          : [...selectedCountries, country];
                        setSelectedCountries(next.length > 0 ? next : [country]);
                      }}
                      className={`flex flex-col items-start text-left p-3.5 rounded-2xl border transition-all duration-300 hover:scale-[1.01] cursor-pointer w-full relative ${
                        selected
                          ? "border-[var(--primary)] bg-[var(--surface)] shadow-sm"
                          : "border-border bg-background/50 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 w-full">
                        <span className="text-2xl filter drop-shadow-sm select-none">{details.flag}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-foreground flex items-center justify-between gap-1">
                            <span className="truncate">{country}</span>
                            <span className="font-mono-data text-[9px] uppercase tracking-wider bg-muted text-muted-foreground px-1.5 py-0.5 rounded flex-shrink-0">
                              {details.iso}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed line-clamp-2">
                        {details.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* RIGHT Time Selection */}
          <Card className="border-border bg-card p-6 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-display font-semibold text-foreground">Analytics controls & parameters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-4">
              <div className="space-y-2">
                <label className="text-xs font-mono-data uppercase tracking-wider text-muted-foreground">Historical Epoch</label>
                <Select value={selectedRange.join(",")} onValueChange={(value) => {
                  const [start, end] = value.split(",").map(Number);
                  setSelectedRange([start, end] as [number, number]);
                }}>
                  <SelectTrigger className="w-full rounded-xl bg-muted/60 border border-border px-3 py-2 text-left text-sm text-foreground focus:ring-1 focus:ring-[var(--primary)]">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {TIME_RANGES.map((range) => (
                        <SelectItem key={range.label} value={`${range.value[0]},${range.value[1]}`}>
                          {range.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-2xl border border-border bg-[var(--surface)] px-4 py-3 text-sm text-foreground">
                <div className="text-[9px] font-mono-data uppercase tracking-[0.24em] text-muted-foreground">Active historical lens</div>
                <div className="mt-1 font-display text-lg font-semibold text-foreground">{selectedRangeLabel}</div>
              </div>

              <div className="rounded-2xl border border-border/80 bg-background/50 p-4 text-xs text-muted-foreground space-y-2">
                <div className="font-semibold text-foreground">Jurisdictional Alignment</div>
                <p className="leading-relaxed">
                  Both indicators are sourced directly from primary historical indexes. Changes in defense spend reallocations are calibrated relative to this selected timeline frame.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 space-y-6">
          <Card className="border-border bg-card shadow-sm">
            <CardContent className="p-0">
              <AnalyticsCharts countries={selectedCountries} yearRange={selectedRange} />
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}

