// Self-contained server type definitions.
//
// These are a physical copy of the types the serverless functions need, taken
// from src/lib/supabase/types.ts. They MUST live inside /api — do NOT re-export
// from "../../src/...". A type-only re-export across the /api boundary looks
// harmless in the editor (esbuild would erase it in a pure bundler build), but
// @vercel/node's transpile step can preserve the re-export as a real ESM
// dependency, and at runtime Node's resolver looks for
// /var/task/src/lib/supabase/types — which does not exist in the deployed
// function bundle. That throws ERR_MODULE_NOT_FOUND during module init and
// surfaces as FUNCTION_INVOCATION_FAILED before the handler ever runs.
//
// Keep these in sync with src/lib/supabase/types.ts when the schema changes.

export type BriefStatus = "Draft" | "In Review" | "Published" | "Archived";
export type ScenarioStatus = "pending" | "generating" | "completed" | "failed";

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  organization: string | null;
  role: string | null;
  handle: string | null;
  clearance: string;
  station: string | null;
  briefs_count: number;
  citations_count: number;
  forecast_accuracy: number;
  joined_at: string;
  created_at: string;
  updated_at: string;
};

export type Brief = {
  id: string;
  user_id: string;
  ref_id: string;
  title: string;
  status: BriefStatus;
  tag: string | null;
  pages: number;
  accent_color: string | null;
  content: Record<string, unknown> | null;
  citations_count: number;
  forecast_accuracy: number;
  created_at: string;
  updated_at: string;
};

export type Scenario = {
  id: string;
  user_id: string;
  input_text: string;
  memo_content: Record<string, unknown> | null;
  status: ScenarioStatus;
  created_at: string;
};

export type ActivityEntry = {
  id: string;
  user_id: string;
  note: string;
  created_at: string;
};

export type PolicyImpactBrief = {
  impact_brief: string;
  immediate_impacts: string;
  second_order_effects: string;
  open_questions: string;
  confidence: "High" | "Medium" | "Low";
  raw?: string;
  model?: string;
  generated_at?: string;
};

export type PolicyFeed = {
  id: string;
  title: string;
  summary: string | null;
  content: Record<string, unknown> | null;
  source: string | null;
  url: string | null;
  category: string | null;
  country: string | null;
  published_date: string | null;
  impact_brief: PolicyImpactBrief | null;
  created_at: string;
  updated_at: string | null;
};

export type HistoricalAnalogy = {
  id: string;
  country: string;
  period: string;
  defense_trend: string;
  emissions_trend: string;
  industry_effect: string;
  what_followed: string;
  embedding?: number[] | null;
  created_at: string;
};

export type SavedTrackerItem = {
  id: string;
  user_id: string;
  headline: string;
  source: string | null;
  category: string | null;
  brief: Record<string, unknown> | null;
  saved_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string; email: string };
        Update: Partial<Profile>;
      };
      briefs: {
        Row: Brief;
        Insert: Omit<Brief, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Brief>;
      };
      scenarios: {
        Row: Scenario;
        Insert: Omit<Scenario, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Scenario>;
      };
      activity_log: {
        Row: ActivityEntry;
        Insert: Omit<ActivityEntry, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<ActivityEntry>;
      };
      saved_tracker_items: {
        Row: SavedTrackerItem;
        Insert: Omit<SavedTrackerItem, "id" | "saved_at"> & { id?: string; saved_at?: string };
        Update: Partial<SavedTrackerItem>;
      };
      policy_feed: {
        Row: PolicyFeed;
        Insert: Omit<PolicyFeed, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: Partial<PolicyFeed>;
      };
      historical_analogies: {
        Row: HistoricalAnalogy;
        Insert: Omit<HistoricalAnalogy, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<HistoricalAnalogy>;
      };
    };
  };
};
