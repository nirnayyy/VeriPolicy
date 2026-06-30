import * as React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import analyticsService, { AnalyticsRow } from "@/services/analyticsService";

type AnalyticsDatum = {
  country: string;
  year: number;
  militaryExpenditure: number | null;
  co2: number | null;
};

type AnalyticsChartsProps = {
  countries: string[];
  yearRange?: [number, number];
};

const COLOR_PALETTE = [
  "var(--primary)",            // Terracotta
  "var(--accent-cyan)",        // Teal
  "var(--accent-violet)",      // Soft purple / dark rose
  "var(--accent-green)",       // Sage green
  "var(--accent-amber)",       // Blush / Gold
  "#f97316",                   // Orange accent
  "#8b597b",                   // Rosewood
];

const CustomTooltip = ({ active, payload, label, valueLabel }: any) => {
  if (active && payload && payload.length) {
    // Sort items by value descending for readability
    const sortedPayload = [...payload].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    return (
      <div className="glass rounded-xl p-3 shadow-xl border border-border min-w-[200px] bg-background/90 text-foreground">
        <div className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2 border-b border-border/60 pb-1">
          Year: {label}
        </div>
        <div className="space-y-1.5">
          {sortedPayload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: entry.color || entry.stroke }} />
                <span className="font-medium">{entry.name}</span>
              </div>
              <span className="font-mono-data font-semibold">
                {entry.value !== null && entry.value !== undefined
                  ? entry.value.toLocaleString(undefined, { maximumFractionDigits: 1 })
                  : "—"}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-2 border-t border-border/40 pt-1 text-[9px] font-mono-data text-muted-foreground text-right uppercase tracking-wider">
          {valueLabel}
        </div>
      </div>
    );
  }
  return null;
};

const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ countries, yearRange }) => {
  const [data, setData] = React.useState<AnalyticsRow[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        const grouped = await analyticsService.getAllAnalytics();
        if (mounted) {
          setData(grouped);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Unknown error");
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredRows = React.useMemo(() => {
    const targetSet = new Set(countries.map((country) => country.trim()));
    return data
      .filter((row) => targetSet.has(row.country) && (!yearRange || (row.year >= yearRange[0] && row.year <= yearRange[1])))
      .sort((a, b) => a.country.localeCompare(b.country) || a.year - b.year);
  }, [countries, data, yearRange]);

  // Pivot data for Recharts: array of { year, "USA_military": X, "China_military": Y, ... }
  const chartedData = React.useMemo(() => {
    const yearsMap = new Map<number, Record<string, any>>();
    
    for (const row of filteredRows) {
      if (!yearsMap.has(row.year)) {
        yearsMap.set(row.year, { year: row.year });
      }
      const dataObj = yearsMap.get(row.year)!;
      dataObj[`${row.country}_military`] = row.militaryExpenditure;
      dataObj[`${row.country}_co2`] = row.co2;
    }
    
    return Array.from(yearsMap.values()).sort((a, b) => a.year - b.year);
  }, [filteredRows]);

  const uniqueCountries = React.useMemo(() => {
    const set = new Set<string>();
    for (const row of filteredRows) {
      set.add(row.country);
    }
    return Array.from(set).sort();
  }, [filteredRows]);

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card p-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-display font-semibold tracking-tight">Analytics overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-6 text-sm text-muted-foreground leading-relaxed">
            Military expenditure and CO2 emissions for selected countries. The charts are rendered dynamically using interactive Recharts components matching the platform design tokens.
          </p>
          {loading ? (
            <div className="rounded-2xl border border-border bg-muted/40 px-4 py-12 text-center text-sm text-muted-foreground font-mono-data">
              Loading analytics data...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-8 text-center text-sm text-destructive font-mono-data">
              {error}
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="rounded-2xl border border-border bg-muted/40 px-4 py-12 text-center text-sm text-muted-foreground font-mono-data">
              No analytics data available for the selected countries.
            </div>
          ) : (
            <div className="space-y-8">
              {/* Military Expenditure Chart */}
              <div className="rounded-2xl border border-border/80 bg-background/50 p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h4 className="font-display text-lg font-semibold text-foreground">Military Expenditure by Year</h4>
                    <p className="text-xs text-muted-foreground">Measured in USD Millions (historical constant prices)</p>
                  </div>
                </div>
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} vertical={false} />
                      <XAxis
                        dataKey="year"
                        stroke="var(--muted-foreground)"
                        opacity={0.7}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                      />
                      <YAxis
                        stroke="var(--muted-foreground)"
                        opacity={0.7}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                        tickFormatter={(value) => (value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value)}
                      />
                      <Tooltip content={<CustomTooltip valueLabel="Military Expenditure (M$)" />} cursor={{ stroke: 'var(--primary)', strokeWidth: 1, strokeDasharray: '3 3' }} />
                      <Legend
                        verticalAlign="top"
                        height={36}
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: "11px", fontFamily: "var(--font-mono)" }}
                      />
                      {uniqueCountries.map((country, index) => (
                        <Line
                          key={country}
                          type="monotone"
                          dataKey={`${country}_military`}
                          name={country}
                          stroke={COLOR_PALETTE[index % COLOR_PALETTE.length]}
                          strokeWidth={2.5}
                          dot={{ r: 2, strokeWidth: 1 }}
                          activeDot={{ r: 5, strokeWidth: 0 }}
                          connectNulls
                          animationDuration={500}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* CO2 Emissions Chart */}
              <div className="rounded-2xl border border-border/80 bg-background/50 p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h4 className="font-display text-lg font-semibold text-foreground">CO2 Emissions by Year</h4>
                    <p className="text-xs text-muted-foreground">Measured in million tonnes of territorial CO2</p>
                  </div>
                </div>
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        {uniqueCountries.map((country, index) => {
                          const color = COLOR_PALETTE[index % COLOR_PALETTE.length];
                          return (
                            <linearGradient key={`grad-${country}`} id={`color-${country}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={color} stopOpacity={0.18} />
                              <stop offset="95%" stopColor={color} stopOpacity={0.01} />
                            </linearGradient>
                          );
                        })}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} vertical={false} />
                      <XAxis
                        dataKey="year"
                        stroke="var(--muted-foreground)"
                        opacity={0.7}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                      />
                      <YAxis
                        stroke="var(--muted-foreground)"
                        opacity={0.7}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                        tickFormatter={(value) => (value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value)}
                      />
                      <Tooltip content={<CustomTooltip valueLabel="CO2 Emissions (Mt)" />} cursor={{ stroke: 'var(--accent-cyan)', strokeWidth: 1, strokeDasharray: '3 3' }} />
                      <Legend
                        verticalAlign="top"
                        height={36}
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: "11px", fontFamily: "var(--font-mono)" }}
                      />
                      {uniqueCountries.map((country, index) => (
                        <Area
                          key={country}
                          type="monotone"
                          dataKey={`${country}_co2`}
                          name={country}
                          stroke={COLOR_PALETTE[index % COLOR_PALETTE.length]}
                          fill={`url(#color-${country})`}
                          strokeWidth={2}
                          dot={{ r: 1 }}
                          activeDot={{ r: 4 }}
                          connectNulls
                          animationDuration={600}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Data Insights Panel */}
              <div className="rounded-2xl border border-border/80 bg-background/30 p-5">
                <h4 className="font-mono-data text-xs uppercase tracking-widest text-muted-foreground mb-4">
                  Data Insights Engine
                </h4>
                <Insights rows={filteredRows} countries={countries} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

function Insights({ rows, countries }: { rows: AnalyticsRow[]; countries: string[] }) {
  // Find max military expenditure value and its country
  let maxMil = -Infinity;
  let maxMilCountry: string | null = null;
  let maxCo2 = -Infinity;
  let maxCo2Country: string | null = null;

  for (const r of rows) {
    if (r.militaryExpenditure != null && r.militaryExpenditure > maxMil) {
      maxMil = r.militaryExpenditure;
      maxMilCountry = r.country;
    }
    if (r.co2 != null && r.co2 > maxCo2) {
      maxCo2 = r.co2;
      maxCo2Country = r.country;
    }
  }

  // Compute simple correlation across rows where both present
  const paired: { x: number; y: number }[] = [];
  for (const r of rows) {
    if (r.militaryExpenditure != null && r.co2 != null) {
      paired.push({ x: r.militaryExpenditure, y: r.co2 });
    }
  }

  let corrText = "No clear relationship (insufficient paired data).";
  if (paired.length >= 3) {
    const n = paired.length;
    const meanX = paired.reduce((s, p) => s + p.x, 0) / n;
    const meanY = paired.reduce((s, p) => s + p.y, 0) / n;
    let num = 0;
    let denX = 0;
    let denY = 0;
    for (const p of paired) {
      const dx = p.x - meanX;
      const dy = p.y - meanY;
      num += dx * dy;
      denX += dx * dx;
      denY += dy * dy;
    }
    const denom = Math.sqrt(denX * denY);
    const r = denom === 0 ? 0 : num / denom;
    if (r > 0.4) {
      corrText = "Strategic Calibration: There is a strong positive correlation between defense spending trends and carbon emissions across the selected historical period. Expanding heavy industrial defense capacities historically signals a corresponding rise in greenhouse outputs.";
    } else if (r < -0.4) {
      corrText = "Decoupling Effect: Emissions and defense expenditures show a negative correlation, demonstrating periods where resource reallocation or green modernization succeeded in decoupling military output from industrial emissions.";
    } else {
      corrText = "Neutral Trend: The correlation index indicates that emissions and defense spending fluctuated independently, indicating that local policy decisions or clean energy shifts outweighed the direct footprint of military spending.";
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3 text-sm">
      <div className="rounded-xl border border-border/50 bg-background/50 p-4">
        <span className="font-mono-data text-[10px] uppercase tracking-wider text-muted-foreground">Highest Defense Capital</span>
        <div className="mt-1 font-display text-lg font-semibold text-foreground">{maxMilCountry ?? "N/A"}</div>
        <div className="text-[10px] text-muted-foreground mt-1">
          Peak: {maxMil > -Infinity ? `${Math.round(maxMil).toLocaleString()} M$` : "—"}
        </div>
      </div>
      <div className="rounded-xl border border-border/50 bg-background/50 p-4">
        <span className="font-mono-data text-[10px] uppercase tracking-wider text-muted-foreground">Highest Emissions Footprint</span>
        <div className="mt-1 font-display text-lg font-semibold text-foreground">{maxCo2Country ?? "N/A"}</div>
        <div className="text-[10px] text-muted-foreground mt-1">
          Peak: {maxCo2 > -Infinity ? `${Math.round(maxCo2).toLocaleString()} Mt` : "—"}
        </div>
      </div>
      <div className="rounded-xl border border-border/50 bg-background/50 p-4 sm:col-span-1">
        <span className="font-mono-data text-[10px] uppercase tracking-wider text-muted-foreground">Geopolitical Calibration</span>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{corrText}</p>
      </div>
    </div>
  );
}

export default AnalyticsCharts;

