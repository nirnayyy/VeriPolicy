// Vercel serverless function — wraps the existing foresight handler.
// Secret (GROQ_API_KEY) stays server-side; the SPA calls POST /api/foresight.
//
// Vercel auto-detects files in /api as Node serverless functions using the
// web-standard Request/Response signature.
import { handleForesightRequest } from "../src/lib/foresight-api";

export default async function handler(request: Request): Promise<Response> {
  return handleForesightRequest(request);
}
