// Server-only policy impact-brief generator.
//
// Mirrors src/services/impactBriefService.ts but lives in /api/_lib so Vercel
// bundles it into each function. Uses the server Supabase client (no user
// session) and the server Groq wrapper. The client SPA keeps its own copy of
// the type helpers it needs; this module is only ever imported by the
// /api/* serverless functions.
import { getSupabase } from "./supabaseClient.js";
import { callGroqModel } from "./groq.js";

export type ImpactBriefResult = {
  impact_brief: string;
  immediate_impacts: string;
  second_order_effects: string;
  open_questions: string;
  confidence: "High" | "Medium" | "Low";
  raw?: string;
  model: string;
  generated_at: string;
};

export type ArticleInput = {
  title?: string;
  summary?: string | null;
  source?: string | null;
  category?: string | null;
  country?: string | null;
};

function buildStrictJsonPrompt(article: ArticleInput): string {
  const title = article.title ?? "";
  const summary = article.summary ?? "";
  const source = article.source ?? "";
  const category = article.category ?? "";
  const country = article.country ?? "";

  return `You are a senior geopolitical and policy analyst.

Analyze the following policy article and return STRICT JSON only (no markdown, no explanations outside the JSON). Each section should be at most two short paragraphs and use concise policy-analysis language.

Article fields:
Title: ${title}
Summary: ${summary}
Source: ${source}
Category: ${category}
Country: ${country}

Return EXACT JSON with these keys: "impact_brief", "immediate_impacts", "second_order_effects", "open_questions", "confidence".

Values must be strings. "confidence" must be one of: "High", "Medium", or "Low".

No extra keys, no surrounding text, and no markdown. Output example (structure only):
{
  "impact_brief": "...",
  "immediate_impacts": "...",
  "second_order_effects": "...",
  "open_questions": "...",
  "confidence": "High"
}
`;
}

function extractJson(text: string): string {
  // Remove common surrounding markup and BOM
  const cleaned = text.replace(/^\uFEFF/, "").trim();

  // Try parsing the whole text first
  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch (e) {
    // Attempt to find first JSON object in text
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first !== -1 && last !== -1 && last > first) {
      return cleaned.slice(first, last + 1);
    }
    throw new Error("Failed to locate JSON in model response");
  }
}

export async function generateImpactBrief(article: ArticleInput): Promise<ImpactBriefResult> {
  const model = "llama-3.3-70b-versatile";
  const prompt = buildStrictJsonPrompt(article);

  const raw = await callGroqModel({ model, input: prompt, maxTokens: 800 });

  const jsonText = extractJson(raw.trim());

  let parsed: any;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    // Log raw and extracted JSON text to help debugging model output
    try {
      console.error("generateImpactBrief: Failed to parse JSON from model response");
      console.error("Raw model response:\n", raw);
      console.error("Extracted JSON text:\n", jsonText);
    } catch (loggingErr) {
      // ignore logging errors
    }

    const errMsg = err instanceof Error ? err.message : String(err);
    const snippet = jsonText ? jsonText.slice(0, 2000) : raw.slice(0, 2000);
    throw new Error(`Failed to parse JSON from model: ${errMsg}. Extracted snippet: ${snippet}`);
  }

  // Validate keys
  const required = ["impact_brief", "immediate_impacts", "second_order_effects", "open_questions", "confidence"];
  for (const k of required) {
    if (!(k in parsed)) throw new Error(`Model response missing required key: ${k}`);
    if (typeof parsed[k] !== "string") throw new Error(`Model response key ${k} is not a string`);
  }

  const confidence = parsed.confidence as string;
  if (!["High", "Medium", "Low"].includes(confidence)) {
    throw new Error("Model returned invalid confidence value");
  }

  const result: ImpactBriefResult = {
    impact_brief: parsed.impact_brief.trim(),
    immediate_impacts: parsed.immediate_impacts.trim(),
    second_order_effects: parsed.second_order_effects.trim(),
    open_questions: parsed.open_questions.trim(),
    confidence: confidence as "High" | "Medium" | "Low",
    raw,
    model,
    generated_at: new Date().toISOString(),
  };

  return result;
}

export function isStoredImpactBrief(value: unknown): value is ImpactBriefResult {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.impact_brief === "string" &&
    typeof candidate.immediate_impacts === "string" &&
    typeof candidate.second_order_effects === "string" &&
    typeof candidate.open_questions === "string" &&
    typeof candidate.confidence === "string" &&
    ["High", "Medium", "Low"].includes(candidate.confidence)
  );
}

export function parseStoredImpactBrief(value: unknown): ImpactBriefResult | null {
  if (isStoredImpactBrief(value)) {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (isStoredImpactBrief(parsed)) {
        return parsed;
      }
    } catch {
      // ignore parse failure
    }
  }

  return null;
}

// Keep legacy helpers for reading/storing brief in DB
export async function getImpactBriefFromDb(policyId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("policy_feed")
    .select("impact_brief")
    .eq("id", policyId)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return parseStoredImpactBrief(data?.impact_brief) ?? null;
}

export async function storeImpactBriefToDb(policyId: string, brief: ImpactBriefResult) {
  const supabase = getSupabase();
  const { error } = await supabase.from("policy_feed").update({ impact_brief: brief }).eq("id", policyId);
  if (error) throw error;
  return brief;
}
