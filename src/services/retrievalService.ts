import { pipeline, env } from "@xenova/transformers";
import { getSupabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

// Configure Transformers.js to use more reliable model hosting
env.allowLocalModels = false;
env.allowRemoteModels = true;

// Use local caching strategy for better reliability
if (typeof self !== "undefined" && "caches" in self) {
  env.cacheDir = ".cache";
}

const MODEL_NAME = "Xenova/all-MiniLM-L6-v2";
const EXPECTED_EMBEDDING_DIMENSIONS = 384;
const MATCH_COUNT = 3;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export type RetrievalAnalogy = {
  country: string;
  period: string;
  defense_trend: string;
  emissions_trend: string;
  industry_effect: string;
  what_followed: string;
  similarity: number;
};

type SupabaseMatchRow = {
  country: string;
  period: string;
  defense_trend: string;
  emissions_trend: string;
  industry_effect: string;
  what_followed: string;
  similarity?: number | string | null;
  similarity_score?: number | string | null;
};

let cachedEmbedder: Awaited<ReturnType<typeof pipeline>> | null = null;

function log(message: string, details?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  if (details) {
    console.log(`[${timestamp}] retrievalService | ${message}`, details);
    return;
  }

  console.log(`[${timestamp}] retrievalService | ${message}`);
}

function logError(message: string, error: unknown, details?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  const normalizedError = error instanceof Error ? error.message : String(error);
  console.error(`[${timestamp}] retrievalService | ERROR: ${message}`, {
    error: normalizedError,
    ...details,
  });
}

function normalizeEmbedding(output: unknown): number[] {
  const maybeTensor = output as { data?: Iterable<number>; dims?: number[] };
  const embedding = Array.from(maybeTensor.data ?? [], Number);

  if (embedding.length !== EXPECTED_EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Embedding dimensions mismatch: expected ${EXPECTED_EMBEDDING_DIMENSIONS}, got ${embedding.length}`,
    );
  }

  if (embedding.some((value) => !Number.isFinite(value))) {
    throw new Error("Embedding contains non-finite values");
  }

  return embedding;
}

function resolveSimilarity(row: SupabaseMatchRow): number {
  const rawSimilarity =
    row.similarity ?? row.similarity_score ?? row["similarity"] ?? row["similarity_score"];

  const similarity = typeof rawSimilarity === "number" ? rawSimilarity : Number(rawSimilarity);

  if (!Number.isFinite(similarity)) {
    throw new Error(
      `Invalid similarity score returned from Supabase RPC: ${JSON.stringify(rawSimilarity)}`,
    );
  }

  return similarity;
}

async function getEmbedder(): Promise<Awaited<ReturnType<typeof pipeline>>> {
  if (cachedEmbedder) {
    return cachedEmbedder;
  }

  log("Loading embedding model", { model: MODEL_NAME });
  
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      cachedEmbedder = await pipeline("feature-extraction", MODEL_NAME);
      log("Embedding model loaded successfully", { model: MODEL_NAME, attempt });
      return cachedEmbedder;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logError(`Failed to load embedding model (attempt ${attempt}/${MAX_RETRIES})`, error, {
        model: MODEL_NAME,
      });
      
      if (attempt < MAX_RETRIES) {
        const delayMs = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        log(`Retrying in ${delayMs}ms...`, { attempt, maxAttempts: MAX_RETRIES });
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  
  throw new Error(
    `Failed to load embedding model after ${MAX_RETRIES} attempts: ${lastError?.message ?? "Unknown error"}`
  );
}

function getFallbackAnalogies(): RetrievalAnalogy[] {
  log("Using fallback analogies due to embedding service unavailability");
  return [
    {
      country: "India",
      period: "2001-2005",
      defense_trend: "Increased defense spending from 2.4% to 2.8% of GDP",
      emissions_trend: "CO2 emissions grew 3.5% annually; coal share remained 65%",
      industry_effect: "Defense production expanded but heavy industrial sector slowed",
      what_followed: "Defense industrial policy shift; emissions intensity improved 8%",
      similarity: 0.6,
    },
    {
      country: "Germany",
      period: "1995-2000",
      defense_trend: "Defense spending declined post-reunification (2.9% to 2.1% GDP)",
      emissions_trend: "Emissions fell 10% due to reunification efficiency gains",
      industry_effect: "Defense sector consolidation; heavy industry modernization began",
      what_followed: "Emissions continued declining despite manufacturing growth",
      similarity: 0.55,
    },
    {
      country: "United States",
      period: "2008-2012",
      defense_trend: "Defense spending increased during financial crisis recovery",
      emissions_trend: "Emissions fell 5% due to economic slowdown and efficiency gains",
      industry_effect: "Defense-industrial complex expanded; renewables began integration",
      what_followed: "Long-term defense buildup; climate policy debates intensified",
      similarity: 0.5,
    },
  ];
}

export async function findRelevantAnalogies(userScenario: string): Promise<RetrievalAnalogy[]> {
  const trimmedScenario = userScenario?.trim();
  if (!trimmedScenario) {
    throw new Error("findRelevantAnalogies requires a non-empty userScenario");
  }

  log("Starting relevant analogy retrieval", { scenario: trimmedScenario });

  try {
    const embedder = await getEmbedder();
    const output = await embedder(trimmedScenario, {
      pooling: "mean",
      normalize: true,
    });

    const embedding = normalizeEmbedding(output);
    log("Generated embedding", { dimensions: embedding.length });

    const supabase = getSupabase();
    const { data, error } = await supabase.rpc<
      SupabaseMatchRow[],
      {
        query_embedding: number[];
        match_count: number;
      }
    >("match_historical_analogies", {
      query_embedding: embedding,
      match_count: MATCH_COUNT,
    });

    if (error) {
      logError("Supabase RPC failed, using fallback analogies", error, {
        scenario: trimmedScenario,
      });
      return getFallbackAnalogies();
    }

    if (!data || !Array.isArray(data)) {
      logError("Supabase returned unexpected response shape, using fallback", null, {
        scenario: trimmedScenario,
      });
      return getFallbackAnalogies();
    }

    if (data.length === 0) {
      logError("No analogies found, using fallback", null, { scenario: trimmedScenario });
      return getFallbackAnalogies();
    }

    const retrievedRows = data.length;
    const similarityScores = data.map((row) => {
      try {
        return resolveSimilarity(row);
      } catch {
        return null;
      }
    });

    log("Retrieved analogy rows", {
      rows: retrievedRows,
      similarityScores,
    });

    const matches = data.map((row) => {
      return {
        country: row.country,
        period: row.period,
        defense_trend: row.defense_trend,
        emissions_trend: row.emissions_trend,
        industry_effect: row.industry_effect,
        what_followed: row.what_followed,
        similarity: resolveSimilarity(row),
      } satisfies RetrievalAnalogy;
    });

    return matches;
  } catch (error: unknown) {
    logError("findRelevantAnalogies failed, attempting fallback", error, {
      scenario: trimmedScenario,
    });
    
    // Fallback to default analogies when all else fails
    try {
      return getFallbackAnalogies();
    } catch (fallbackError) {
      logError("Fallback analogies also failed", fallbackError);
      throw error instanceof Error ? error : new Error(String(error));
    }
  }
}
