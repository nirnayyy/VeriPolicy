// Server-only policy ingestion service.
//
// Mirrors src/services/policyIngestionService.ts but lives in /api/_lib so
// Vercel bundles it into the policy-sync function. The client SPA does not
// import this module. Uses the server Supabase client (no user session).
import { getSupabase } from "./supabaseClient";
import type { PolicyFeed } from "./types";

const KEY = process.env.NEWSDATA_API_KEY || process.env.VITE_NEWSDATA_API_KEY || "";

const KEYWORDS = [
  "defense policy",
  "military spending",
  "defense procurement",
  "climate policy",
  "emissions regulation",
  "carbon tax",
  "renewable energy",
  "energy security",
];

function categorizeText(text: string) {
  const t = (text || "").toLowerCase();
  if (/defence|defense|military|procure|procurement|army|naval|air force|missile/.test(t)) return "defence";
  if (/emission|carbon|climate|cdm|cbam|cap and trade|carbon tax/.test(t)) return "climate";
  if (/lng|power|oil|gas|renewable|solar|wind|nuclear|energy|grid/.test(t)) return "energy";
  return "other";
}

function extractArticleFromNewsData(a: any): Partial<PolicyFeed> {
  const title = a.title || null;
  const description = a.description || a.content || null;
  const source = a.source_id || (a.source && a.source.name) || null;
  const url = a.link || a.url || null;
  const published_at = a.pubDate || a.pubDateUtc || a.date || null;

  return {
    title: title ?? null,
    summary: description ?? null,
    source: source ?? null,
    url: url ?? null,
    published_date: published_at ? new Date(published_at).toISOString() : null,
    impact_brief: null,
    category: categorizeText(`${title ?? ""} ${description ?? ""}`),
    country: null,
  };
}

async function fetchFromNewsData(): Promise<any[]> {
  if (!KEY) throw new Error("NEWSDATA_API_KEY not set in environment");

  const now = new Date();
  const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const results: any[] = [];
  const pageSize = 100;

  // Query per keyword (NewsData limits query length). Limit pages per keyword to avoid rate limits.
  for (const kw of KEYWORDS) {
    const params = new URLSearchParams({
      apikey: KEY,
      q: kw,
      language: "en",
    });
    const url = `https://newsdata.io/api/1/news?${params.toString()}`;
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`NewsData request failed: ${res.status} ${res.statusText} ${txt}`);
    }
    const json = await res.json().catch(() => null);
    if (!json) continue;
    const pageResults = Array.isArray(json.results) ? json.results : [];
    results.push(...pageResults);
  }

  // filter to last 7 days (some APIs don't support from_date for this endpoint)
  const cutoff = start.getTime();
  return results.filter((r) => {
    const d = r.pubDate || r.pubDateUtc || r.date || r.pub_date || null;
    if (!d) return true; // keep if no date
    const ts = Date.parse(d);
    if (Number.isNaN(ts)) return true;
    return ts >= cutoff;
  });
}

export async function ingestPoliciesFromNewsData(): Promise<{
  inserted: number;
  skipped: number;
  totalFetched: number;
}> {
  const articles = (await fetchFromNewsData()) || [];
  const totalFetched = Array.isArray(articles) ? articles.length : 0;

  if (!totalFetched) return { inserted: 0, skipped: 0, totalFetched };

  const supabase = getSupabase();

  const mapped = articles.map(extractArticleFromNewsData).filter((p) => p.url);
  const byUrl = new Map<string, Partial<PolicyFeed>>();
  for (const m of mapped) {
    if (!m.url) continue;
    if (!byUrl.has(m.url)) byUrl.set(m.url, m);
  }

  const urls = Array.from(byUrl.keys());
  if (!urls.length) return { inserted: 0, skipped: 0, totalFetched };

  // Check existing urls in DB
  const resp = await supabase.from("policy_feed").select("url").in("url", urls).limit(1000);
  const existing = Array.isArray(resp.data) ? resp.data : [];
  const existingSet = new Set<string>((existing as any[]).map((r) => r.url).filter(Boolean));

  const toInsert: Partial<PolicyFeed>[] = [];
  for (const [url, payload] of byUrl.entries()) {
    if (existingSet.has(url)) continue;
    toInsert.push({
      title: payload.title ?? null,
      summary: payload.summary ?? null,
      source: payload.source ?? null,
      url,
      published_date: payload.published_date ?? null,
      category: (payload.category as any) ?? null,
      impact_brief: null,
      country: payload.country ?? null,
      created_at: new Date().toISOString(),
    });
  }

  let inserted = 0;
  if (toInsert.length) {
    const { error, data } = await supabase.from("policy_feed").insert(toInsert).select("id");
    if (error) {
      console.error("policyIngestion: insert error", error);
      throw error;
    }
    inserted = Array.isArray(data) ? data.length : 0;
  }

  const skipped = urls.length - inserted;

  return { inserted, skipped, totalFetched };
}
