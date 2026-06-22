// Vercel serverless function — admin endpoint that pulls NewsData and
// ingests policy rows into Supabase. Secret (NEWSDATA_API_KEY) stays server-side.
import { handlePolicySyncRequest } from "../server/policySync.js";

export async function GET(request: Request): Promise<Response> {
  return handlePolicySyncRequest(request);
}

export async function POST(request: Request): Promise<Response> {
  return handlePolicySyncRequest(request);
}
