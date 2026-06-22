// Vercel serverless function — admin endpoint that backfills AI impact
// briefs for all policy rows missing one. Secret (GROQ_API_KEY) stays server-side.
import { handleGenerateAllImpactBriefsRequest } from "../server/generateAllImpactBriefs.js";

export async function POST(request: Request): Promise<Response> {
  return handleGenerateAllImpactBriefsRequest(request);
}
