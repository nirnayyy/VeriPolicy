// Vercel serverless function — wraps the existing foresight handler.
// Secret (GROQ_API_KEY) stays server-side; the SPA calls POST /api/foresight.
//
// Vercel auto-detects files in /api as Node serverless functions using the
// web-standard Request/Response signature. All shared server-only code lives
// in /api/_lib so @vercel/node bundles it into each function.
import { handleForesightRequest } from "./_lib/foresight";

export default async function handler(request: Request): Promise<Response> {
  return handleForesightRequest(request);
}
