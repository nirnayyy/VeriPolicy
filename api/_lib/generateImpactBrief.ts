// Server-only single-impact-brief handler.
//
// Mirrors the handler from src/lib/generate-impact-brief-api.ts but lives in
// /api/_lib so Vercel bundles it into the generate-impact-brief function.
// Uses the server Supabase client (no user session) and the server impact
// brief service.
import { getSupabase } from "./supabaseClient.js";
import { generateImpactBrief, parseStoredImpactBrief, storeImpactBriefToDb } from "./impactBriefService.js";

export async function handleGenerateImpactBriefRequest(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const body = await request.json();
    const policyId = body?.policyId;
    if (!policyId) {
      return new Response(JSON.stringify({ error: "policyId is required" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    // Check DB for cached brief and also load article fields
    const supabase = getSupabase();
    const { data: row, error: selErr } = await supabase
      .from("policy_feed")
      .select("id, title, summary, source, category, country, impact_brief")
      .eq("id", policyId)
      .limit(1)
      .maybeSingle();

    if (selErr) throw selErr;
    if (!row)
      return new Response(JSON.stringify({ error: "policy not found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });

    const cachedBrief = parseStoredImpactBrief(row.impact_brief);
    if (cachedBrief) {
      return new Response(JSON.stringify({ policyId, impactBrief: cachedBrief }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    const article = {
      title: row.title,
      summary: row.summary,
      source: row.source,
      category: row.category,
      country: row.country,
    };

    const result = await generateImpactBrief(article);

    // store to DB
    await storeImpactBriefToDb(policyId, result);

    return new Response(JSON.stringify({ policyId, impactBrief: result }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err: any) {
    console.error("generate-impact-brief error", err);
    return new Response(JSON.stringify({ error: err?.message ?? String(err) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
