// Server-only backfill handler.
//
// Mirrors the handler from src/lib/generate-all-impact-briefs-api.ts but lives
// in /api/_lib so Vercel bundles it into the generate-all-impact-briefs
// function.
import { getSupabase } from "./supabaseClient.js";
import { generateImpactBrief, parseStoredImpactBrief, storeImpactBriefToDb } from "./impactBriefService.js";

export async function handleGenerateAllImpactBriefsRequest(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const supabase = getSupabase();

    // Select candidate rows — fetch impact_brief so we can filter non-generated markers
    const { data: rows, error: selErr } = await supabase
      .from("policy_feed")
      .select("id, title, summary, source, category, country, impact_brief");

    if (selErr) throw selErr;
    if (!rows || rows.length === 0) {
      return new Response(JSON.stringify({ processed: 0, failed: 0 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // Filter rows that need generation: missing or invalid impact_brief content
    const candidates = rows.filter((r: any) => {
      return parseStoredImpactBrief(r.impact_brief) == null;
    });

    if (candidates.length === 0) {
      console.log(`Found 0 candidates out of ${rows.length} rows`);
      return new Response(
        JSON.stringify({ processed: 0, failed: 0, totalCandidates: 0, totalRows: rows.length }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    console.log(
      `Found ${candidates.length} candidates out of ${rows.length} rows: ${candidates
        .slice(0, 20)
        .map((r: any) => r.id)
        .join(",")}`,
    );

    const total = candidates.length;
    let processed = 0;
    let failed = 0;

    // Process sequentially to respect rate limits and avoid parallel duplicates
    for (let i = 0; i < candidates.length; i++) {
      const row: any = candidates[i];
      const policyId = row.id;

      // Re-fetch the current impact_brief for this id to avoid duplicate generation
      const { data: currentRow, error: curErr } = await supabase
        .from("policy_feed")
        .select("impact_brief")
        .eq("id", policyId)
        .limit(1)
        .maybeSingle();
      if (curErr) {
        console.error(`Failed to re-check policy ${policyId}:`, curErr);
        failed += 1;
        continue;
      }

      const current = parseStoredImpactBrief((currentRow as any)?.impact_brief);
      if (current) {
        // someone else already generated a valid brief
        console.log(`Skipping already-generated policy ${policyId}`);
        continue;
      }

      try {
        const article = {
          title: row.title,
          summary: row.summary,
          source: row.source,
          category: row.category,
          country: row.country,
        };

        const brief = await generateImpactBrief(article);

        // store the generated brief
        await storeImpactBriefToDb(policyId, brief);
        processed += 1;
        console.log(`Processed ${processed}/${total}`);
      } catch (err) {
        failed += 1;
        console.error(`Failed generating/storing brief for ${policyId}:`, err);
      }
    }

    return new Response(JSON.stringify({ processed, failed }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err: any) {
    console.error("generate-all-impact-briefs error", err);
    return new Response(JSON.stringify({ error: err?.message ?? String(err) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
