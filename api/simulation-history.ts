// Vercel serverless function — wraps the simulation-history handler.
// Reads the caller's Supabase session from the Bearer token and returns
// their last 10 simulations.
import { handleSimulationHistoryRequest } from "../server/foresight.js";

export async function GET(request: Request): Promise<Response> {
  return handleSimulationHistoryRequest(request);
}
