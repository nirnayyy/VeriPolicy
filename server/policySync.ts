// Server-only policy-sync handler.
//
// Mirrors the handler from src/lib/policy-sync-api.ts but lives in /api/_lib
// so Vercel bundles it into the policy-sync function.
import { ingestPoliciesFromNewsData } from "./policyIngestionService.js";

export async function handlePolicySyncRequest(request: Request): Promise<Response> {
  if (request.method !== "POST" && request.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const result = await ingestPoliciesFromNewsData();
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (error: any) {
    console.error("Policy sync error", error);
    return new Response(JSON.stringify({ error: error?.message ?? String(error) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
