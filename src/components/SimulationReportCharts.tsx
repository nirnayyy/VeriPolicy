import { useMemo } from "react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  AreaChart,
  Area
} from "recharts";
import { Card } from "@/components/ui/card";
import { useTheme } from "@/components/theme-provider";

interface SimulationReportChartsProps {
  country: string;
  shiftType: string;
  amount: number;
  offsetAmount: number;
  scaleMultiplier: number;
  riskScore: number;
}

export function SimulationReportCharts({
  country,
  shiftType,
  amount,
  offsetAmount,
  scaleMultiplier,
  riskScore
}: SimulationReportChartsProps) {
  const { theme } = useTheme();

  // 1. Radar Chart Data
  const radarData = useMemo(() => {
    const isDefense = shiftType.toLowerCase().includes("defense");
    const isClimate = shiftType.toLowerCase().includes("climate") || shiftType.toLowerCase().includes("carbon");
    
    const military = Math.min(100, Math.max(20, Math.round((isDefense ? 40 + amount : 45 - amount / 2) * scaleMultiplier)));
    const economic = Math.min(100, Math.max(10, Math.round((isClimate ? 60 - amount / 3 : 50 + amount / 4) * (2 - scaleMultiplier))));
    const emissions = Math.min(100, Math.max(5, Math.round((isClimate ? 30 + amount * 1.5 : 55 - amount / 2) * scaleMultiplier)));
    const diplomatic = Math.min(100, Math.max(15, Math.round((isDefense ? 65 - amount / 2 : 50 + amount / 3) * (1.5 - scaleMultiplier / 2))));
    const resource = Math.min(100, Math.max(20, Math.round((isClimate ? 40 + amount : 50) * scaleMultiplier)));

    return [
      { subject: "Military Balance", value: military },
      { subject: "Economic Security", value: economic },
      { subject: "Emissions Control", value: emissions },
      { subject: "Diplomatic Alignment", value: diplomatic },
      { subject: "Resource Resilience", value: resource },
    ];
  }, [shiftType, amount, scaleMultiplier]);

  // 2. Bar Chart Data (Before vs After Allocations)
  const allocationData = useMemo(() => {
    const isDefense = shiftType.toLowerCase().includes("defense");
    const isClimate = shiftType.toLowerCase().includes("climate") || shiftType.toLowerCase().includes("carbon");
    const change = Math.round(amount * scaleMultiplier);
    
    return [
      {
        name: "Defense Spend",
        Before: isDefense ? 25 : 30,
        After: isDefense ? 25 + change : 30,
      },
      {
        name: "Climate & Energy",
        Before: isClimate ? 15 : 20,
        After: isClimate ? 15 + change : 20,
      },
      {
        name: "Social Infrastructure",
        Before: 40,
        After: 40 - Math.round(offsetAmount / 2),
      },
      {
        name: "Fiscal Reserve",
        Before: 20,
        After: 20 - Math.round(offsetAmount / 2),
      },
    ];
  }, [shiftType, amount, offsetAmount, scaleMultiplier]);

  // 3. Forecast Trajectory Data (10-Year Projection)
  const trajectoryData = useMemo(() => {
    const baseRisk = riskScore * scaleMultiplier;
    return Array.from({ length: 10 }, (_, i) => {
      const year = 2026 + i;
      // Introduce an elegant curve
      const growthFactor = Math.sin(i / 2) * 5 + (i * 2);
      const scenarioIndex = Math.max(10, Math.min(100, Math.round(baseRisk + growthFactor)));
      const baselineIndex = Math.max(10, Math.min(100, Math.round(baseRisk * 0.7 + i * 1.2)));

      return {
        year,
        "Scenario Trajectory": scenarioIndex,
        "Baseline Forecast": baselineIndex,
      };
    });
  }, [riskScore, scaleMultiplier]);

  // Styling helpers
  const primaryColor = theme === "forest" ? "#10b981" : "var(--primary)";
  const strokeColor = "var(--border)";
  const textMuted = "var(--muted-foreground)";

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Geopolitical Impact Dimensions (Radar) */}
        <Card className="border-border bg-background p-5 rounded-2xl shadow-sm">
          <div className="mb-3">
            <h4 className="font-display text-sm font-semibold text-foreground">Geopolitical Impact Dimensions</h4>
            <p className="text-[10px] text-muted-foreground">Calibration multidimensional shift values (0 - 100)</p>
          </div>
          <div className="h-[240px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke={strokeColor} opacity={0.3} />
                <PolarAngleAxis 
                  dataKey="subject" 
                  tick={{ fill: textMuted, fontSize: 9, fontFamily: "var(--font-mono)" }}
                />
                <PolarRadiusAxis 
                  angle={30} 
                  domain={[0, 100]} 
                  tick={{ fill: textMuted, fontSize: 8 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Radar
                  name="Shift Impact"
                  dataKey="value"
                  stroke={primaryColor}
                  fill={primaryColor}
                  fillOpacity={0.25}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Budget Allocation Shift (Bar) */}
        <Card className="border-border bg-background p-5 rounded-2xl shadow-sm">
          <div className="mb-3">
            <h4 className="font-display text-sm font-semibold text-foreground">Sovereign Budget Allocation Impact</h4>
            <p className="text-[10px] text-muted-foreground">Relative impact in nominal percentage allocation of national GDP</p>
          </div>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={allocationData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={strokeColor} opacity={0.2} vertical={false} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: textMuted, fontSize: 8, fontFamily: "var(--font-mono)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fill: textMuted, fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: "var(--popover)", borderColor: "var(--border)", borderRadius: "8px", fontSize: "11px" }}
                  labelStyle={{ fontWeight: "bold", color: "var(--popover-foreground)" }}
                />
                <Bar dataKey="Before" fill="var(--muted-foreground)" opacity={0.4} radius={[4, 4, 0, 0]} />
                <Bar dataKey="After" fill={primaryColor} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* 10-Year Forecast Area Chart */}
      <Card className="border-border bg-background p-5 rounded-2xl shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h4 className="font-display text-sm font-semibold text-foreground">10-Year Geopolitical Stress Index Forecast</h4>
            <p className="text-[10px] text-muted-foreground">Projected baseline vs calibrated scenario deviation index (2026 - 2035)</p>
          </div>
        </div>
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trajectoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="stressGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={primaryColor} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={primaryColor} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={strokeColor} opacity={0.2} vertical={false} />
              <XAxis 
                dataKey="year" 
                tick={{ fill: textMuted, fontSize: 9, fontFamily: "var(--font-mono)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fill: textMuted, fontSize: 9 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: "var(--popover)", borderColor: "var(--border)", borderRadius: "8px", fontSize: "11px" }}
              />
              <Area 
                type="monotone" 
                dataKey="Baseline Forecast" 
                stroke="var(--muted-foreground)" 
                strokeWidth={1.5}
                strokeDasharray="4 4"
                fill="none" 
                opacity={0.6}
              />
              <Area 
                type="monotone" 
                dataKey="Scenario Trajectory" 
                stroke={primaryColor} 
                strokeWidth={2}
                fill="url(#stressGrad)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
