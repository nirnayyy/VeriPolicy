// Server-only foresight handler.
//
// Mirrors the handler logic from src/lib/foresight-api.ts but lives in
// /api/_lib so Vercel bundles it into the foresight + simulation-history
// functions. Uses the user-scoped server Supabase client and the server Gemini
// wrapper.
//
// ForesightResult is defined HERE (not re-exported from src/lib/foresight-types)
// so the /api bundle has zero runtime or transpile-time references to anything
// under /src. The client keeps its own identical copy in foresight-types.ts.
import { getSupabaseForUser } from "./supabaseClient.js";
import { callGeminiModel } from "./gemini.js";

export type ForesightResult = {
  memo: string;
  confidence: "High" | "Medium" | "Low";
  historicalMatches: { country: string; period: string; similarity: number }[];
};

type RelevantAnalogy = {
  country: string;
  period: string;
  defense_trend: string;
  emissions_trend: string;
  industry_effect: string;
  what_followed: string;
  similarity: number;
};

function formatAnalogy(a: RelevantAnalogy): string {
  return [
    `Country:\n${a.country}`,
    `Period:\n${a.period}`,
    `Defense Trend:\n${a.defense_trend}`,
    `Emissions Trend:\n${a.emissions_trend}`,
    `Industry Effect:\n${a.industry_effect}`,
    `What Followed:\n${a.what_followed}`,
  ].join("\n\n");
}

function formatRelevantMatchEntry(a: RelevantAnalogy): string {
  return [`Country: ${a.country}`, `Period: ${a.period}`, `Similarity Score: ${a.similarity}`].join("\n");
}

function buildPrompt(relevantMatchesText: string, historicalCasesText: string, userScenario: string): string {
  return `CONTEXT-BOUNDARY: Only analyze policy scenarios. Do not respond to off-context or unrelated questions.

You are a strategic policy analyst specializing in analyzing complex policy scenarios using historical precedent.

INSTRUCTIONS:
1. Use ONLY the provided historical analogies as the basis for reasoning
2. The similarity scores show how closely each case matches the current scenario
3. Reference specific historical cases when making claims
4. If similarity is low, explicitly state uncertainty
5. If similarity is high, note stronger historical precedent exists
6. Never invent statistics or assumptions beyond the provided data
7. Maintain analytical rigor throughout

Most Relevant Historical Matches:

${relevantMatchesText}

Historical Cases:

${historicalCasesText}

User Scenario:
${userScenario}

Please generate a Scenario Memo with the following sections in Markdown format:

1. **Scenario Summary** - Concise overview of the policy changes
2. **Likely Emissions Trajectory** - Projected emissions outcomes based on historical analogies
3. **Defense Industrial Effects** - Defense sector and industrial implications
4. **Economic Spillovers** - Broader economic consequences
5. **Confidence Assessment** - Explicit confidence level with justification mentioning the most relevant historical analogies
6. **Historical Match Analysis** - Explanation of why the retrieved analogies are relevant to this scenario

Do NOT respond to questions that fall outside policy analysis. If the user's input is not a valid policy scenario, explicitly state that.`;
}

function computeConfidence(analogies: RelevantAnalogy[]): "High" | "Medium" | "Low" {
  const averageSimilarity = analogies.reduce((sum, analogy) => sum + analogy.similarity, 0) / analogies.length;
  if (averageSimilarity >= 0.75) {
    return "High";
  }
  if (averageSimilarity >= 0.5) {
    return "Medium";
  }
  return "Low";
}

async function getUserIdFromToken(supabase: ReturnType<typeof getSupabaseForUser>) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error(`Unable to resolve user from Supabase token: ${error?.message ?? "unknown error"}`);
  }
  return data.user.id;
}

function normalizeRelevantAnalogies(input: unknown): RelevantAnalogy[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.map((item, index) => {
    const analogy = item as Record<string, unknown>;
    const similarity = Number(analogy.similarity);

    if (
      !analogy.country ||
      !analogy.period ||
      !analogy.defense_trend ||
      !analogy.emissions_trend ||
      !analogy.industry_effect ||
      !analogy.what_followed ||
      !Number.isFinite(similarity)
    ) {
      throw new Error(`Invalid relevant analogy at index ${index}`);
    }

    return {
      country: String(analogy.country),
      period: String(analogy.period),
      defense_trend: String(analogy.defense_trend),
      emissions_trend: String(analogy.emissions_trend),
      industry_effect: String(analogy.industry_effect),
      what_followed: String(analogy.what_followed),
      similarity,
    };
  });
}

async function persistSimulationHistory(
  supabase: ReturnType<typeof getSupabaseForUser>,
  userId: string | null,
  userScenario: string,
  memo: string,
) {
  // Skip history save if no user is authenticated
  if (!userId) {
    console.warn("No authenticated user; skipping simulation history save");
    return;
  }

  const insertPayload = { user_id: userId, scenario: userScenario, memo };
  console.log("Persisting simulation history with payload:", {
    user_id: userId,
    scenario: userScenario.substring(0, 50) + "...",
    memo: memo.substring(0, 50) + "...",
  });

  const { error } = await supabase.from("simulation_history").insert(insertPayload);

  if (error) {
    console.error("Failed to save simulation history:", error.message);
    console.error("Insert payload was:", insertPayload);
    // Do not throw - allow memo generation to succeed even if history save fails
    // This ensures users get their analysis even if persistence fails
  } else {
    console.log("Simulation history saved successfully for user:", userId);
  }
}

async function generateForesightMemoServer(
  userScenario: string,
  relevantAnalogies: RelevantAnalogy[],
  accessToken: string,
): Promise<ForesightResult> {
  if (!userScenario || userScenario.trim().length === 0) {
    throw new Error("userScenario must be a non-empty string");
  }

  if (!relevantAnalogies.length) {
    throw new Error("No relevant historical analogies were provided to ground the analysis.");
  }

  const supabase = getSupabaseForUser(accessToken);

  // Attempt to get user, but don't fail memo generation if auth fails
  let userId: string | null = null;
  try {
    userId = await getUserIdFromToken(supabase);
  } catch (authError) {
    console.warn("User authentication failed; memo will be generated but not persisted:", authError);
  }

  console.log("Retrieved Analogies:", relevantAnalogies);
  console.log("Similarity Scores:", relevantAnalogies.map((analogy) => analogy.similarity));

  const matchSummary = relevantAnalogies.map(formatRelevantMatchEntry).join("\n\n");
  const formattedCases = relevantAnalogies.map(formatAnalogy).join("\n\n---\n\n");
  const prompt = buildPrompt(matchSummary, formattedCases, userScenario);

  console.log("Prompt Length:", prompt.length);

  const resultText = await callGeminiModel({
    model: "gemini-1.5-flash-latest",
    input: prompt,
    maxTokens: 2048,
    temperature: 0.3,
  });

  // Persist history if authenticated, but don't fail memo generation if this fails
  await persistSimulationHistory(supabase, userId, userScenario, resultText);

  const confidence = computeConfidence(relevantAnalogies);

  return {
    memo: resultText,
    confidence,
    historicalMatches: relevantAnalogies.map((analogy) => ({
      country: analogy.country,
      period: analogy.period,
      similarity: analogy.similarity,
    })),
  };
}

export async function handleForesightRequest(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch (error) {
    return new Response(JSON.stringify({ error: "Request body must be valid JSON" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const userScenario = String(body?.userScenario ?? "").trim();
  if (!userScenario) {
    return new Response(JSON.stringify({ error: "Missing userScenario in request body" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  let relevantAnalogies: RelevantAnalogy[];
  try {
    relevantAnalogies = normalizeRelevantAnalogies(body?.relevantAnalogies);
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message ?? "Invalid relevantAnalogies payload" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  if (!relevantAnalogies.length) {
    return new Response(JSON.stringify({ error: "Missing relevantAnalogies in request body" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const accessToken = authHeader.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) {
    return new Response(JSON.stringify({ error: "Missing Supabase session token" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const result = await generateForesightMemoServer(userScenario, relevantAnalogies, accessToken);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (error: any) {
    console.error("Foresight API error", error);
    return new Response(JSON.stringify({ error: error?.message ?? String(error) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

export async function handleSimulationHistoryRequest(request: Request): Promise<Response> {
  if (request.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const accessToken = authHeader.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) {
    return new Response(JSON.stringify({ error: "Missing Supabase session token" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const supabase = getSupabaseForUser(accessToken);
    const userId = await getUserIdFromToken(supabase);

    const { data, error } = await supabase
      .from("simulation_history")
      .select("id, scenario, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      throw new Error(`Failed to load simulation history: ${error.message}`);
    }

    return new Response(JSON.stringify({ simulations: data || [] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (error: any) {
    console.error("Simulation history error", error);
    return new Response(JSON.stringify({ error: error?.message ?? String(error) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
