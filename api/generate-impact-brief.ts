// Vercel serverless function — generates an AI impact brief for one policy
// and caches it in Supabase. Secret (GROQ_API_KEY) stays server-side.
import { handleGenerateImpactBriefRequest } from "../server/generateImpactBrief.js";

export async function POST(request: Request): Promise<Response> {
  return handleGenerateImpactBriefRequest(request);
}
