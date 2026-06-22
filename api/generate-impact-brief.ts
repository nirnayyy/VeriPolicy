// Vercel serverless function — generates an AI impact brief for one policy
// and caches it in Supabase. Secret (GROQ_API_KEY) stays server-side.
import { handleGenerateImpactBriefRequest } from "./_lib/generateImpactBrief";

export default async function handler(request: Request): Promise<Response> {
  return handleGenerateImpactBriefRequest(request);
}
