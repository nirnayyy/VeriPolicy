// Vercel serverless function — admin endpoint that backfills AI impact
// briefs for all policy rows missing one. Secret (GROQ_API_KEY) stays server-side.
import { handleGenerateAllImpactBriefsRequest } from "../src/lib/generate-all-impact-briefs-api";

export default async function handler(request: Request): Promise<Response> {
  return handleGenerateAllImpactBriefsRequest(request);
}
