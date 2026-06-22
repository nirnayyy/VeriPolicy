// Single source of truth for the foresight result type.
//
// Imported (type-only) by BOTH the client SPA
// (src/services/simulatorService.ts) and the serverless foresight handler
// (api/_lib/foresight.ts). Because every consumer uses `import type`,
// TypeScript/esbuild erases these imports at build time, so the type file can
// live under src/ without creating a runtime module-resolution edge across the
// /api -> /src boundary (which is what breaks Vercel's bundling).

export type ForesightResult = {
  memo: string;
  confidence: "High" | "Medium" | "Low";
  historicalMatches: { country: string; period: string; similarity: number }[];
};
