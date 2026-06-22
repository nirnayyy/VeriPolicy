// Vercel serverless function — admin endpoint that pulls NewsData and
// ingests policy rows into Supabase. Secret (NEWSDATA_API_KEY) stays server-side.
import { handlePolicySyncRequest } from "./_lib/policySync";

export default async function handler(request: Request): Promise<Response> {
  return handlePolicySyncRequest(request);
}
