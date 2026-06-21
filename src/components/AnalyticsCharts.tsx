import * as React from "react";
import Plot from "react-plotly.js";

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
  "#22c55e",
  "#38bdf8",
  "#f97316",
  "#a855f7",
  "#fb7185",
  "#fcd34d",
  "#0ea5e9",
];

function buildSeries(
  groupedRows: Map<string, AnalyticsDatum[]>,
  valueKey: "militaryExpenditure" | "co2",
): Plotly.Data[] {
  return Array.from(groupedRows, ([country, rows], index) => ({
    x: rows.map((row) => row.year),
    y: rows.map((row) => row[valueKey] ?? null),
    name: country,
    type: "scatter",
    mode: "lines+markers",
    line: {
      shape: "spline",
      width: 3,
      color: COLOR_PALETTE[index % COLOR_PALETTE.length],
    },
    marker: {
      size: 6,
    },
    connectgaps: false,
    hovertemplate: `${country}<br>Year: %{x}<br>${
      valueKey === "militaryExpenditure" ? "Military expenditure" : "CO2 emissions"
    }: %{y}<extra></extra>`,
  }));
}

function buildLayout(title: string, yLabel: string): Partial<Plotly.Layout> {
  return {
    title: {
      text: title,
      font: { family: "Inter, sans-serif", size: 18, color: "var(--foreground)" },
    },
    autosize: true,
    margin: { l: 60, r: 24, t: 52, b: 48 },
    paper_bgcolor: "var(--card)",
    plot_bgcolor: "var(--card)",
    font: { color: "var(--foreground)", family: "Inter, sans-serif" },
    legend: {
      orientation: "h",
      x: 0,
      y: 1.08,
      font: { color: "var(--muted-foreground)" },
    },
    xaxis: {
      title: { text: "Year", font: { size: 13 } },
      tickmode: "auto",
      tickfont: { color: "var(--muted-foreground)" },
      gridcolor: "rgba(148, 163, 184, 0.15)",
      zerolinecolor: "rgba(148, 163, 184, 0.25)",
    },
    yaxis: {
      title: { text: yLabel, font: { size: 13 } },
      tickfont: { color: "var(--muted-foreground)" },
      gridcolor: "rgba(148, 163, 184, 0.15)",
      zerolinecolor: "rgba(148, 163, 184, 0.25)",
    },
    hovermode: "x unified",
  };
}

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

  const groupedRows = React.useMemo(() => {
    const map = new Map<string, AnalyticsDatum[]>();
    for (const row of filteredRows) {
      const items = map.get(row.country) ?? [];
      items.push(row);
      map.set(row.country, items);
    }
    for (const rows of map.values()) {
      rows.sort((a, b) => a.year - b.year);
    }
    return map;
  }, [filteredRows]);

  const militaryData = React.useMemo(() => buildSeries(groupedRows, "militaryExpenditure"), [groupedRows]);
  const co2Data = React.useMemo(() => buildSeries(groupedRows, "co2"), [groupedRows]);

  const chartConfig: Partial<Plotly.Config> = {
    responsive: true,
    displayModeBar: false,
  };

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card p-6">
        <CardHeader>
          <CardTitle>Analytics overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Military expenditure and CO2 emissions for selected countries. The charts are rendered from the shared analytics dataset and adapt to available screen width.
          </p>
          {loading ? (
            <div className="rounded-2xl border border-border bg-muted px-4 py-8 text-center text-sm text-muted-foreground">
              Loading analytics data...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-8 text-center text-sm text-destructive">
              {error}
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="rounded-2xl border border-border bg-muted px-4 py-8 text-center text-sm text-muted-foreground">
              No analytics data available for the selected countries.
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-1">
              <Card className="border-border bg-card shadow-sm">
                <CardHeader>
                  <CardTitle>Military Expenditure by Year</CardTitle>
                </CardHeader>
                <CardContent className="min-h-[360px]">
                  <Plot
                    data={militaryData}
                    layout={buildLayout("Military Expenditure by Year", "Military expenditure")}
                    config={chartConfig}
                    style={{ width: "100%", height: "100%" }}
                    useResizeHandler
                  />
                </CardContent>
              </Card>

              <Card className="border-border bg-card shadow-sm">
                <CardHeader>
                  <CardTitle>CO2 Emissions by Year</CardTitle>
                </CardHeader>
                <CardContent className="min-h-[360px]">
                  <Plot
                    data={co2Data}
                    layout={buildLayout("CO2 Emissions by Year", "CO2 emissions")}
                    config={chartConfig}
                    style={{ width: "100%", height: "100%" }}
                    useResizeHandler
                  />
                </CardContent>
              </Card>

              <Card className="border-border bg-card p-4">
                <CardHeader>
                  <CardTitle>Data Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <Insights rows={filteredRows} countries={countries} />
                </CardContent>
              </Card>
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
    if (r > 0.2) corrText = "Military spending and CO2 emissions show a positive trend relationship in the selected historical analogies.";
    else if (r < -0.2) corrText = "Military spending and CO2 emissions show a negative trend relationship in the selected historical analogies.";
    else corrText = "Military spending and CO2 emissions show little or no linear relationship in the selected historical analogies.";
  }

  return (
    <div className="space-y-3 text-sm text-muted-foreground">
      <div>
        <strong className="text-foreground">Country with highest military spending:</strong>{' '}
        {maxMilCountry ?? 'N/A'}
      </div>
      <div>
        <strong className="text-foreground">Country with highest CO2 emissions:</strong>{' '}
        {maxCo2Country ?? 'N/A'}
      </div>
      <div className="pt-2 text-foreground">{corrText}</div>
    </div>
  );
}

export default AnalyticsCharts;
