import type { ForesightResult } from "../lib/foresight-types";
import { findRelevantAnalogies } from "./retrievalService";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase/client";

async function createAuthorizedHeaders() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (isSupabaseConfigured()) {
    const supabase = getSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
  }

  return headers;
}

export async function generateForesightMemo(userScenario: string): Promise<ForesightResult> {
  const headers = await createAuthorizedHeaders();

  const relevantAnalogies = await findRelevantAnalogies(userScenario);
  console.log("Retrieved Analogies:", relevantAnalogies);
  console.log("Similarity Scores:", relevantAnalogies.map((analogy) => analogy.similarity));

  const response = await fetch("/api/foresight", {
    method: "POST",
    headers,
    body: JSON.stringify({ userScenario, relevantAnalogies }),
  });

  const body = await response.text();
  const contentType = response.headers.get("content-type") ?? "";

  if (!response.ok) {
    throw new Error(`Foresight API failed: ${response.status} ${response.statusText} - ${body}`);
  }

  if (!contentType.includes("application/json")) {
    throw new Error(
      "Foresight API returned HTML instead of JSON. Restart with npm run dev so /api routes are served locally.",
    );
  }

  const data = JSON.parse(body) as ForesightResult;
  return data;
}

export type SimulationHistoryItem = {
  id: string;
  scenario: string;
  created_at: string;
};

export async function fetchSimulationHistory(): Promise<SimulationHistoryItem[]> {
  const headers = await createAuthorizedHeaders();
  const response = await fetch("/api/simulation-history", {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Simulation history failed: ${response.status} ${response.statusText} - ${body}`);
  }

  const data = await response.json();
  return data.simulations as SimulationHistoryItem[];
}

export default { generateForesightMemo, fetchSimulationHistory };
