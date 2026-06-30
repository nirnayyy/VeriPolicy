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
  BarChart,
  Bar,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  RadarChart,
  Radar,
  PolarGrid,
  PolarRadiusAxis,
} from "recharts";
import { TrendingUp, Shield, Leaf, BarChart3, ArrowUpRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import analyticsService, { AnalyticsRow } from "@/services/analyticsService";

type AnalyticsChartsProps = {
  countries: string[];
  yearRange?: [number, number];
};

const COLOR_PALETTE = [
  "var(--primary)",
  "var(--accent-cyan)",
  "var(--accent-violet)",
  "var(--accent-green)",
  "var(--accent-amber)",
  "#f97316",
  "#8b597b",
];

const CHART_MARGIN = { top: 8, right: 12, left: -12, bottom: 0 };

const axisProps = {
  stroke: "var(--muted-foreground)",
  opacity: 0.65,
  tickLine: false,
  axisLine: false,
  tick: { fontSize: 10, fontFamily: "var(--font-mono)" as const },
};

function formatCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

const CustomTooltip = ({ active, payload, label, valueLabel }: any) => {
  if (!active || !payload?.length) return null;
  const sortedPayload = [...payload].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  return (
    <div className="glass min-w-[200px] rounded-xl border border-border bg-background/95 p-3 text-foreground shadow-xl">
      <div className="mb-2 border-b border-border/60 pb-1 font-mono-data text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {typeof label === "number" ? `Year: ${label}` : label}
      </div>
      <div className="space-y-1.5">
        {sortedPayload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color || entry.stroke || entry.fill }}
              />
              <span className="font-medium">{entry.name}</span>
            </div>
            <span className="font-mono-data font-semibold">
              {entry.value != null
                ? entry.value.toLocaleString(undefined, { maximumFractionDigits: 1 })
                : "—"}
            </span>
          </div>
        ))}
      </div>
      {valueLabel && (
        <div className="mt-2 border-t border-border/40 pt-1 text-right font-mono-data text-[9px] uppercase tracking-wider text-muted-foreground">
          {valueLabel}
        </div>
      )}
    </div>
  );
};

function computeCorrelation(rows: AnalyticsRow[]) {
  const paired = rows
    .filter((r) => r.militaryExpenditure != null && r.co2 != null)
    .map((r) => ({ x: r.militaryExpenditure!, y: r.co2! }));
  if (paired.length < 3) return 0;
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
  return denom === 0 ? 0 : num / denom;
}

function computeGrowthRate(rows: AnalyticsRow[], field: "militaryExpenditure" | "co2") {
  const values = rows
    .filter((r) => r[field] != null)
    .sort((a, b) => a.year - b.year)
    .map((r) => r[field]!);
  if (values.length < 2) return null;
  const first = values.slice(0, Math.min(3, values.length));
  const last = values.slice(-Math.min(3, values.length));
  const avgFirst = first.reduce((s, v) => s + v, 0) / first.length;
  const avgLast = last.reduce((s, v) => s + v, 0) / last.length;
  if (avgFirst === 0) return null;
  return ((avgLast - avgFirst) / avgFirst) * 100;
}

function ChartPanel({
  title,
  subtitle,
  children,
  className = "",
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className={`overflow-hidden border-border bg-card shadow-sm ${className}`}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 pt-5 px-5">
        <div>
          <CardTitle className="font-display text-base font-semibold tracking-tight text-foreground">
            {title}
          </CardTitle>
          {subtitle && <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </CardHeader>
      <CardContent className="px-5 pb-5">{children}</CardContent>
    </Card>
  );
}

function KpiCard({
  label,
  value,
  caption,
  icon: Icon,
  accent,
  trend,
}: {
  label: string;
  value: string;
  caption: string;
  icon: React.ElementType;
  accent: string;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <Card className="border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: `color-mix(in oklab, ${accent} 18%, transparent)` }}
          >
            <Icon className="h-4 w-4" style={{ color: accent }} />
          </div>
          {trend && trend !== "neutral" && (
            <span
              className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-mono-data text-[10px] font-semibold"
              style={{
                background:
                  trend === "up"
                    ? "color-mix(in oklab, var(--accent-green) 20%, transparent)"
                    : "color-mix(in oklab, var(--primary) 20%, transparent)",
                color: trend === "up" ? "var(--accent-green)" : "var(--primary)",
              }}
            >
              <ArrowUpRight className={`h-3 w-3 ${trend === "down" ? "rotate-90" : ""}`} />
            </span>
          )}
        </div>
        <div className="mt-4 font-display text-2xl font-bold tracking-tight text-foreground">{value}</div>
        <div className="mt-1 font-mono-data text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{caption}</p>
      </CardContent>
    </Card>
  );
}

const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ countries, yearRange }) => {
  const [data, setData] = React.useState<AnalyticsRow[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    analyticsService
      .getAllAnalytics()
      .then((rows) => {
        if (mounted) {
          setData(rows);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Unknown error");
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const filteredRows = React.useMemo(() => {
    const targetSet = new Set(countries.map((c) => c.trim()));
    return data
      .filter(
        (row) =>
          targetSet.has(row.country) &&
          (!yearRange || (row.year >= yearRange[0] && row.year <= yearRange[1])),
      )
      .sort((a, b) => a.country.localeCompare(b.country) || a.year - b.year);
  }, [countries, data, yearRange]);

  const chartedData = React.useMemo(() => {
    const yearsMap = new Map<number, Record<string, number | string>>();
    for (const row of filteredRows) {
      if (!yearsMap.has(row.year)) yearsMap.set(row.year, { year: row.year });
      const obj = yearsMap.get(row.year)!;
      obj[`${row.country}_military`] = row.militaryExpenditure ?? null;
      obj[`${row.country}_co2`] = row.co2 ?? null;
    }
    return Array.from(yearsMap.values()).sort((a, b) => (a.year as number) - (b.year as number));
  }, [filteredRows]);

  const uniqueCountries = React.useMemo(() => {
    return Array.from(new Set(filteredRows.map((r) => r.country))).sort();
  }, [filteredRows]);

  const stats = React.useMemo(() => {
    let maxMil = -Infinity;
    let maxMilCountry: string | null = null;
    let maxCo2 = -Infinity;
    let maxCo2Country: string | null = null;
    for (const r of filteredRows) {
      if (r.militaryExpenditure != null && r.militaryExpenditure > maxMil) {
        maxMil = r.militaryExpenditure;
        maxMilCountry = r.country;
      }
      if (r.co2 != null && r.co2 > maxCo2) {
        maxCo2 = r.co2;
        maxCo2Country = r.country;
      }
    }

    const correlation = computeCorrelation(filteredRows);
    const latestYear = filteredRows.length ? Math.max(...filteredRows.map((r) => r.year)) : null;
    const latestRows = latestYear ? filteredRows.filter((r) => r.year === latestYear) : [];

    const defenseRanking = latestRows
      .filter((r) => r.militaryExpenditure != null)
      .map((r) => ({ country: r.country, value: r.militaryExpenditure! }))
      .sort((a, b) => b.value - a.value);

    const co2Ranking = latestRows
      .filter((r) => r.co2 != null)
      .map((r) => ({ country: r.country, value: r.co2! }))
      .sort((a, b) => b.value - a.value);

    const scatterPoints = filteredRows
      .filter((r) => r.militaryExpenditure != null && r.co2 != null)
      .map((r) => ({
        country: r.country,
        year: r.year,
        military: r.militaryExpenditure!,
        co2: r.co2!,
      }));

    const maxMilLatest = defenseRanking[0]?.value ?? 1;
    const maxCo2Latest = co2Ranking[0]?.value ?? 1;
    const radarData = [
      { axis: "Defense", ...Object.fromEntries(defenseRanking.map((d) => [d.country, Math.round((d.value / maxMilLatest) * 100)])) },
      { axis: "Emissions", ...Object.fromEntries(co2Ranking.map((d) => [d.country, Math.round((d.value / maxCo2Latest) * 100)])) },
    ];

    const avgMilGrowth =
      uniqueCountries.reduce((sum, c) => {
        const g = computeGrowthRate(filteredRows.filter((r) => r.country === c), "militaryExpenditure");
        return sum + (g ?? 0);
      }, 0) / Math.max(uniqueCountries.length, 1);

    const avgCo2Growth =
      uniqueCountries.reduce((sum, c) => {
        const g = computeGrowthRate(filteredRows.filter((r) => r.country === c), "co2");
        return sum + (g ?? 0);
      }, 0) / Math.max(uniqueCountries.length, 1);

    const yoyData = chartedData.map((row, idx, arr) => {
      const entry: Record<string, number | string> = { year: row.year as number };
      if (idx === 0) return entry;
      const prev = arr[idx - 1];
      for (const country of uniqueCountries) {
        const cur = row[`${country}_military`] as number | null;
        const prevVal = prev[`${country}_military`] as number | null;
        if (cur != null && prevVal != null && prevVal !== 0) {
          entry[country] = +(((cur - prevVal) / prevVal) * 100).toFixed(1);
        }
      }
      return entry;
    }).filter((row) => uniqueCountries.some((c) => row[c] != null));

    const ratioRanking = latestRows
      .filter((r) => r.militaryExpenditure != null && r.co2 != null && r.co2! > 0)
      .map((r) => ({
        country: r.country,
        ratio: +(r.militaryExpenditure! / r.co2!).toFixed(2),
      }))
      .sort((a, b) => b.ratio - a.ratio);

    return {
      maxMil,
      maxMilCountry,
      maxCo2,
      maxCo2Country,
      correlation,
      latestYear,
      defenseRanking,
      co2Ranking,
      scatterPoints,
      radarData,
      avgMilGrowth,
      avgCo2Growth,
      yoyData,
      ratioRanking,
      dataPoints: filteredRows.length,
    };
  }, [filteredRows, uniqueCountries, chartedData]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-muted/30 px-4 py-16 text-center font-mono-data text-sm text-muted-foreground">
        Loading analytics data…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-12 text-center font-mono-data text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (filteredRows.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-muted/30 px-4 py-16 text-center font-mono-data text-sm text-muted-foreground">
        No analytics data available for the selected countries.
      </div>
    );
  }

  const corrPct = Math.round(Math.abs(stats.correlation) * 100);
  const corrLabel =
    stats.correlation > 0.4
      ? "Positive alignment"
      : stats.correlation < -0.4
        ? "Decoupling trend"
        : "Independent flux";

  return (
    <div className="space-y-6 p-1">
      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Avg defense trajectory"
          value={`${stats.avgMilGrowth >= 0 ? "+" : ""}${stats.avgMilGrowth.toFixed(1)}%`}
          caption="Mean spending shift across selected economies in this epoch"
          icon={Shield}
          accent="var(--primary)"
          trend={stats.avgMilGrowth >= 0 ? "up" : "down"}
        />
        <KpiCard
          label="Avg emissions trajectory"
          value={`${stats.avgCo2Growth >= 0 ? "+" : ""}${stats.avgCo2Growth.toFixed(1)}%`}
          caption="Mean CO₂ output change relative to period start"
          icon={Leaf}
          accent="var(--accent-green)"
          trend={stats.avgCo2Growth >= 0 ? "up" : "down"}
        />
        <KpiCard
          label="Peak defense capital"
          value={stats.maxMilCountry ?? "N/A"}
          caption={
            stats.maxMil > -Infinity
              ? `Peak ${formatCompact(stats.maxMil)} M$ in selected window`
              : "No military data in range"
          }
          icon={TrendingUp}
          accent="var(--accent-violet)"
        />
        <KpiCard
          label="Dataset coverage"
          value={`${stats.dataPoints}`}
          caption={`Observations across ${uniqueCountries.length} jurisdictions · ${stats.latestYear}`}
          icon={BarChart3}
          accent="var(--accent-cyan)"
        />
      </div>

      {/* Row 1: Military trend + correlation gauge */}
      <div className="grid gap-6 lg:grid-cols-3">
        <ChartPanel
          className="lg:col-span-2"
          title="Military expenditure trends"
          subtitle="USD millions · historical constant prices"
        >
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartedData} margin={CHART_MARGIN}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.35} vertical={false} />
                <XAxis dataKey="year" {...axisProps} />
                <YAxis {...axisProps} tickFormatter={formatCompact} />
                <Tooltip
                  content={<CustomTooltip valueLabel="Military Expenditure (M$)" />}
                  cursor={{ stroke: "var(--primary)", strokeWidth: 1, strokeDasharray: "4 4" }}
                />
                <Legend
                  verticalAlign="top"
                  height={32}
                  iconType="circle"
                  iconSize={7}
                  wrapperStyle={{ fontSize: "10px", fontFamily: "var(--font-mono)" }}
                />
                {uniqueCountries.map((country, index) => (
                  <Line
                    key={country}
                    type="monotone"
                    dataKey={`${country}_military`}
                    name={country}
                    stroke={COLOR_PALETTE[index % COLOR_PALETTE.length]}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>

        <ChartPanel title="Strategic correlation index" subtitle={`${corrLabel} · r = ${stats.correlation.toFixed(2)}`}>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%"
                cy="65%"
                innerRadius="55%"
                outerRadius="95%"
                barSize={14}
                data={[{ name: "Correlation", value: corrPct, fill: "var(--primary)" }]}
                startAngle={180}
                endAngle={0}
              >
                <RadialBar
                  background={{ fill: "color-mix(in oklab, var(--muted) 60%, transparent)" }}
                  dataKey="value"
                  cornerRadius={8}
                />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 text-center">
            <div className="font-display text-3xl font-bold text-foreground">{corrPct}%</div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Defense spend ↔ emissions coupling strength in selected period
            </p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-center">
              <div className="font-mono-data text-[9px] uppercase tracking-wider text-muted-foreground">Top emitter</div>
              <div className="mt-0.5 text-xs font-semibold text-foreground">{stats.maxCo2Country ?? "—"}</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-center">
              <div className="font-mono-data text-[9px] uppercase tracking-wider text-muted-foreground">Snapshot year</div>
              <div className="mt-0.5 text-xs font-semibold text-foreground">{stats.latestYear ?? "—"}</div>
            </div>
          </div>
        </ChartPanel>
      </div>

      {/* Row 2: CO2 area + defense ranking bars */}
      <div className="grid gap-6 lg:grid-cols-3">
        <ChartPanel
          className="lg:col-span-2"
          title="CO₂ emissions trajectory"
          subtitle="Million tonnes · territorial emissions"
        >
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartedData} margin={CHART_MARGIN}>
                <defs>
                  {uniqueCountries.map((country, index) => {
                    const color = COLOR_PALETTE[index % COLOR_PALETTE.length];
                    return (
                      <linearGradient key={country} id={`co2-grad-${index}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.22} />
                        <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                      </linearGradient>
                    );
                  })}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.35} vertical={false} />
                <XAxis dataKey="year" {...axisProps} />
                <YAxis {...axisProps} tickFormatter={formatCompact} />
                <Tooltip
                  content={<CustomTooltip valueLabel="CO₂ Emissions (Mt)" />}
                  cursor={{ stroke: "var(--accent-cyan)", strokeWidth: 1, strokeDasharray: "4 4" }}
                />
                <Legend
                  verticalAlign="top"
                  height={32}
                  iconType="circle"
                  iconSize={7}
                  wrapperStyle={{ fontSize: "10px", fontFamily: "var(--font-mono)" }}
                />
                {uniqueCountries.map((country, index) => (
                  <Area
                    key={country}
                    type="monotone"
                    dataKey={`${country}_co2`}
                    name={country}
                    stroke={COLOR_PALETTE[index % COLOR_PALETTE.length]}
                    fill={`url(#co2-grad-${index})`}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    connectNulls
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>

        <ChartPanel
          title="Defense spend ranking"
          subtitle={stats.latestYear ? `Latest snapshot · ${stats.latestYear}` : "Latest snapshot"}
        >
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.defenseRanking}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
              >
                <defs>
                  <linearGradient id="defenseBarGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.85} />
                    <stop offset="100%" stopColor="var(--accent-cyan)" stopOpacity={0.95} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.25} horizontal={false} />
                <XAxis type="number" {...axisProps} tickFormatter={formatCompact} />
                <YAxis
                  type="category"
                  dataKey="country"
                  width={72}
                  {...axisProps}
                  tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }}
                />
                <Tooltip
                  content={<CustomTooltip valueLabel="Military Expenditure (M$)" />}
                  cursor={{ fill: "color-mix(in oklab, var(--primary) 8%, transparent)" }}
                />
                <Bar dataKey="value" name="Defense spend" fill="url(#defenseBarGrad)" radius={[0, 6, 6, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>
      </div>

      {/* Row 3: CO2 ranking + scatter */}
      <div className="grid gap-6 md:grid-cols-2">
        <ChartPanel title="Emissions ranking" subtitle={stats.latestYear ? `${stats.latestYear} territorial CO₂` : ""}>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.co2Ranking}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
              >
                <defs>
                  <linearGradient id="co2BarGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--accent-green)" stopOpacity={0.85} />
                    <stop offset="100%" stopColor="var(--accent-cyan)" stopOpacity={0.95} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.25} horizontal={false} />
                <XAxis type="number" {...axisProps} tickFormatter={formatCompact} />
                <YAxis
                  type="category"
                  dataKey="country"
                  width={72}
                  {...axisProps}
                  tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }}
                />
                <Tooltip
                  content={<CustomTooltip valueLabel="CO₂ Emissions (Mt)" />}
                  cursor={{ fill: "color-mix(in oklab, var(--accent-green) 8%, transparent)" }}
                />
                <Bar dataKey="value" name="CO₂ emissions" fill="url(#co2BarGrad)" radius={[0, 6, 6, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>

        <ChartPanel title="Defense vs emissions scatter" subtitle="Each point = one country-year observation">
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 8, right: 12, left: -8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                <XAxis
                  type="number"
                  dataKey="military"
                  name="Defense"
                  {...axisProps}
                  tickFormatter={formatCompact}
                  label={{ value: "Military (M$)", position: "bottom", offset: -2, fontSize: 9, fill: "var(--muted-foreground)" }}
                />
                <YAxis
                  type="number"
                  dataKey="co2"
                  name="CO₂"
                  {...axisProps}
                  tickFormatter={formatCompact}
                  label={{ value: "CO₂ (Mt)", angle: -90, position: "insideLeft", fontSize: 9, fill: "var(--muted-foreground)" }}
                />
                <ZAxis range={[40, 160]} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload;
                    return (
                      <div className="rounded-xl border border-border bg-background/95 p-3 text-xs shadow-xl">
                        <div className="font-semibold text-foreground">{p.country}</div>
                        <div className="mt-1 text-muted-foreground">Year {p.year}</div>
                        <div className="mt-2 space-y-0.5 font-mono-data">
                          <div>Defense: {formatCompact(p.military)} M$</div>
                          <div>CO₂: {formatCompact(p.co2)} Mt</div>
                        </div>
                      </div>
                    );
                  }}
                />
                {uniqueCountries.map((country, index) => (
                  <Scatter
                    key={country}
                    name={country}
                    data={stats.scatterPoints.filter((p) => p.country === country)}
                    fill={COLOR_PALETTE[index % COLOR_PALETTE.length]}
                    opacity={0.75}
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>
      </div>

      {/* Row 4: Radar + YoY growth + ratio bars */}
      <div className="grid gap-6 lg:grid-cols-3">
        <ChartPanel title="Normalized country profile" subtitle="Relative defense & emissions intensity (0–100)">
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={stats.radarData} margin={{ top: 8, right: 24, left: 24, bottom: 8 }}>
                <PolarGrid stroke="var(--border)" strokeOpacity={0.5} />
                <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                {uniqueCountries.map((country, index) => (
                  <Radar
                    key={country}
                    name={country}
                    dataKey={country}
                    stroke={COLOR_PALETTE[index % COLOR_PALETTE.length]}
                    fill={COLOR_PALETTE[index % COLOR_PALETTE.length]}
                    fillOpacity={0.12}
                    strokeWidth={2}
                  />
                ))}
                <Legend iconSize={7} wrapperStyle={{ fontSize: "10px", fontFamily: "var(--font-mono)" }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>

        <ChartPanel title="Defense spend YoY change" subtitle="Year-over-year % shift by jurisdiction">
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.yoyData} margin={CHART_MARGIN}>
                <defs>
                  <linearGradient id="yoyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} vertical={false} />
                <XAxis dataKey="year" {...axisProps} />
                <YAxis {...axisProps} tickFormatter={(v) => `${v}%`} />
                <Tooltip content={<CustomTooltip valueLabel="YoY change (%)" />} />
                {uniqueCountries.slice(0, 3).map((country, index) => (
                  <Area
                    key={country}
                    type="monotone"
                    dataKey={country}
                    name={country}
                    stroke={COLOR_PALETTE[index % COLOR_PALETTE.length]}
                    fill={index === 0 ? "url(#yoyGrad)" : "none"}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>

        <ChartPanel title="Defense-to-emissions ratio" subtitle="M$ military spend per Mt CO₂ · latest year">
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.ratioRanking} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} vertical={false} />
                <XAxis
                  dataKey="country"
                  {...axisProps}
                  tick={{ fontSize: 8, fontFamily: "var(--font-mono)" }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={48}
                />
                <YAxis {...axisProps} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload;
                    return (
                      <div className="rounded-xl border border-border bg-background/95 p-3 text-xs shadow-xl">
                        <div className="font-semibold">{p.country}</div>
                        <div className="mt-1 font-mono-data">{p.ratio} M$ / Mt CO₂</div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="ratio" name="Ratio" radius={[6, 6, 0, 0]} barSize={28}>
                  {stats.ratioRanking.map((_, index) => (
                    <Cell key={index} fill={COLOR_PALETTE[index % COLOR_PALETTE.length]} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>
      </div>

      {/* Insights footer */}
      <Insights rows={filteredRows} correlation={stats.correlation} />
    </div>
  );
};

function Insights({ rows, correlation }: { rows: AnalyticsRow[]; correlation: number }) {
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

  let corrText = "No clear relationship (insufficient paired data).";
  if (correlation > 0.4) {
    corrText =
      "Strong positive correlation between defense spending and carbon emissions across the selected period — expanding industrial defense capacity historically tracks with rising greenhouse outputs.";
  } else if (correlation < -0.4) {
    corrText =
      "Negative correlation suggests decoupling periods where green modernization or resource reallocation reduced emissions despite defense spending shifts.";
  } else if (rows.length >= 3) {
    corrText =
      "Neutral correlation — local policy decisions and energy transitions appear to outweigh the direct footprint of military expenditure in this window.";
  }

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="font-mono-data text-xs uppercase tracking-widest text-muted-foreground">
          Intelligence summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
            <span className="font-mono-data text-[10px] uppercase tracking-wider text-muted-foreground">
              Highest defense capital
            </span>
            <div className="mt-1 font-display text-lg font-semibold text-foreground">{maxMilCountry ?? "N/A"}</div>
            <div className="mt-1 text-[10px] text-muted-foreground">
              Peak: {maxMil > -Infinity ? `${Math.round(maxMil).toLocaleString()} M$` : "—"}
            </div>
          </div>
          <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
            <span className="font-mono-data text-[10px] uppercase tracking-wider text-muted-foreground">
              Highest emissions footprint
            </span>
            <div className="mt-1 font-display text-lg font-semibold text-foreground">{maxCo2Country ?? "N/A"}</div>
            <div className="mt-1 text-[10px] text-muted-foreground">
              Peak: {maxCo2 > -Infinity ? `${Math.round(maxCo2).toLocaleString()} Mt` : "—"}
            </div>
          </div>
          <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
            <span className="font-mono-data text-[10px] uppercase tracking-wider text-muted-foreground">
              Geopolitical calibration
            </span>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{corrText}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default AnalyticsCharts;
