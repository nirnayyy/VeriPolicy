import { pipeline } from "@xenova/transformers";
import { getSupabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

const MODEL_NAME = "Xenova/all-MiniLM-L6-v2";
const EXPECTED_EMBEDDING_DIMENSIONS = 384;
const MATCH_COUNT = 3;

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
  cachedEmbedder = await pipeline("feature-extraction", MODEL_NAME);
  log("Embedding model loaded", { model: MODEL_NAME });
  return cachedEmbedder;
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
      throw new Error(`Supabase RPC match_historical_analogies failed: ${error.message}`);
    }

    if (!data || !Array.isArray(data)) {
      throw new Error("Supabase RPC returned an unexpected response shape");
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
    logError("findRelevantAnalogies failed", error, { scenario: trimmedScenario });
    throw error instanceof Error ? error : new Error(String(error));
  }
}
