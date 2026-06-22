// Type-only re-export hub for the serverless functions.
//
// The canonical type definitions live in src/lib/supabase/types.ts and are
// shared with the client SPA. Serverless functions cannot rely on the `@/`
// alias or on crossing the /api -> /src boundary at runtime, so we re-export
// the types here using `export type` (which esbuild erases at transpile time).
// This keeps a single source of truth for the DB types without creating any
// runtime module resolution across the boundary.
export type {
  Database,
  PolicyFeed,
  HistoricalAnalogy,
  PolicyImpactBrief,
} from "../../src/lib/supabase/types";
