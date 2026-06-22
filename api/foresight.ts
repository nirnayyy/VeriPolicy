// Vercel serverless function — wraps the existing foresight handler.
// Secret (GROQ_API_KEY) stays server-side; the SPA calls POST /api/foresight.
//
// Use named HTTP exports (POST) so Vercel treats this as a Web Request/Response
// handler. A default export is interpreted as legacy (req, res) and ignores
// returned Response objects.
import { handleForesightRequest } from "../server/foresight.js";

export async function POST(request: Request): Promise<Response> {
  return handleForesightRequest(request);
}
