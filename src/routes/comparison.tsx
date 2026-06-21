import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, BarChart3, Globe2 } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AnalyticsCharts from "@/components/AnalyticsCharts";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

export const Route = createFileRoute("/comparison")({
  head: () => ({
    meta: [
      { title: "Scenario Comparison — VeriPolicy" },
      { name: "description", content: "Compare CO2 and military expenditure trends with historic and present context." },
    ],
  }),
  beforeLoad: async () => {
    if (!isSupabaseConfigured()) {
      throw redirect({ to: "/login" });
    }

    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      throw redirect({ to: "/login" });
    }
  },
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
            <Button asChild variant="outline" size="sm">
              <a href="/simulator" className="inline-flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" /> Back to Simulator
              </a>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_0.95fr]">
          <Card className="border-border bg-card p-6 shadow-sm">
            <CardHeader>
              <CardTitle>Country & range selection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-3 rounded-3xl border border-border bg-background p-4">
                  <div className="text-sm font-semibold text-foreground">Countries</div>
                  <div className="text-sm text-muted-foreground">Select the set of economies to compare across the analytics dataset.</div>
                  <div className="space-y-2">
                    {COUNTRY_OPTIONS.map((country) => (
                      <label key={country} className="flex items-center gap-3 rounded-2xl border border-border bg-muted/60 px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedCountries.includes(country)}
                          onChange={(event) => {
                            const next = event.target.checked
                              ? [...selectedCountries, country]
                              : selectedCountries.filter((value) => value !== country);
                            setSelectedCountries(next.length > 0 ? next : [country]);
                          }}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-foreground">{country}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 rounded-3xl border border-border bg-background p-4">
                  <div className="text-sm font-semibold text-foreground">Time window</div>
                  <div className="text-sm text-muted-foreground">Choose the historic-to-present period for the comparison.</div>
                  <Select value={selectedRange.join(",")} onValueChange={(value) => {
                    const [start, end] = value.split(",").map(Number);
                    setSelectedRange([start, end] as [number, number]);
                  }}>
                    <SelectTrigger className="w-full rounded-xl bg-muted px-3 py-2 text-left text-sm text-foreground">
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
                  <div className="rounded-2xl border border-border bg-muted/60 px-4 py-3 text-sm text-foreground">
                    <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Active window</div>
                    <div className="mt-2 font-semibold">{selectedRangeLabel}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card p-6 shadow-sm">
            <CardHeader>
              <CardTitle>Comparison summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-4">
              <div className="rounded-3xl border border-border bg-muted/50 p-5">
                <div className="text-sm font-semibold text-foreground">Why compare these indicators?</div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Military expenditure and CO2 emissions are two core metrics that reveal how geopolitical priorities and climate pressures shift together. This dashboard surfaces shared patterns across major economies in both historic and contemporary periods.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl border border-border bg-background p-4">
                  <div className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Focus economies</div>
                  <div className="mt-3 text-lg font-semibold text-foreground">{selectedCountries.length} selected</div>
                </div>
                <div className="rounded-3xl border border-border bg-background p-4">
                  <div className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Comparison type</div>
                  <div className="mt-3 text-lg font-semibold text-foreground">CO2 & military expenditure</div>
                </div>
              </div>
              <div className="rounded-3xl border border-border bg-background p-4 text-sm text-muted-foreground">
                <div className="font-semibold text-foreground">Historic change lens</div>
                <p className="mt-2">
                  The selected range shows how defence budgets and emissions have moved through the chosen time window. Look for periods of accelerated military buildup and emissions growth as shared inflection points.
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
