import { createClient } from "@supabase/supabase-js";
import { pipeline } from "@xenova/transformers";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Database } from "../lib/supabase/types";

type HistoricalAnalogyRow = Database["public"]["Tables"]["historical_analogies"]["Row"] & {
  embedding?: number[] | null;
};

type EmbeddingResult = {
  totalRows: number;
  embeddedRows: number;
  skippedRows: number;
  failedRows: number;
};

const MODEL_NAME = "Xenova/all-MiniLM-L6-v2";
const EXPECTED_EMBEDDING_DIMENSIONS = 384;
const HISTORICAL_ANALOGIES_TABLE = "historical_analogies";

function log(message: string, details?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  if (details) {
    console.log(`[${timestamp}] ${message}`, details);
    return;
  }

  console.log(`[${timestamp}] ${message}`);
}

function logError(message: string, error: unknown, details?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  const normalizedError = error instanceof Error ? error.message : String(error);
  console.error(`[${timestamp}] ${message}`, {
    error: normalizedError,
    ...details,
  });
}

function loadLocalEnv(): void {
  for (const fileName of [".env.local", ".env"]) {
    if (!existsSync(fileName)) continue;

    const contents = readFileSync(fileName, "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

      const separatorIndex = trimmed.indexOf("=");
      const key = trimmed.slice(0, separatorIndex).trim();
      const rawValue = trimmed.slice(separatorIndex + 1).trim();
      const value = rawValue.replace(/^['"]|['"]$/g, "");

      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

function getRequiredEnv(name: string, fallbackName?: string): string {
  const value = process.env[name] || (fallbackName ? process.env[fallbackName] : undefined);
  if (!value) {
    throw new Error(
      fallbackName
        ? `Missing ${name} or ${fallbackName} environment variable`
        : `Missing ${name} environment variable`,
    );
  }

  return value;
}

function createSupabaseClient() {
  loadLocalEnv();

  const supabaseUrl = getRequiredEnv("SUPABASE_URL", "VITE_SUPABASE_URL");
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ACCESS_TOKEN ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseKey) {
    throw new Error(
      "Missing Supabase credentials. Set SUPABASE_SERVICE_ROLE_KEY for this maintenance script.",
    );
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    log(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Continuing with a non-service key; RLS may block reads or updates.",
    );
  }

  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function buildHistoricalAnalogyText(row: HistoricalAnalogyRow): string {
  return [
    `Country: ${row.country}`,
    `Period: ${row.period}`,
    `Defense Trend: ${row.defense_trend}`,
    `Emissions Trend: ${row.emissions_trend}`,
    `Industry Effect: ${row.industry_effect}`,
    `What Followed: ${row.what_followed}`,
  ].join("\n\n");
}

function hasValidEmbedding(row: HistoricalAnalogyRow): boolean {
  return (
    Array.isArray(row.embedding) &&
    row.embedding.length === EXPECTED_EMBEDDING_DIMENSIONS &&
    row.embedding.every((value) => typeof value === "number" && Number.isFinite(value))
  );
}

function tensorToEmbedding(output: unknown): number[] {
  const maybeTensor = output as { data?: Iterable<number>; dims?: number[] };
  const embedding = Array.from(maybeTensor.data ?? [], Number);

  if (embedding.length !== EXPECTED_EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Expected ${EXPECTED_EMBEDDING_DIMENSIONS} embedding dimensions, received ${embedding.length}`,
    );
  }

  if (embedding.some((value) => !Number.isFinite(value))) {
    throw new Error("Generated embedding contains non-finite values");
  }

  return embedding;
}

export async function generateHistoricalEmbeddings(): Promise<EmbeddingResult> {
  const startedAt = Date.now();
  const supabase = createSupabaseClient();
  const historicalAnalogies = supabase.from(HISTORICAL_ANALOGIES_TABLE) as any;

  log("Fetching historical analogies", { table: HISTORICAL_ANALOGIES_TABLE });
  const { data, error } = await historicalAnalogies
    .select(
      "id,country,period,defense_trend,emissions_trend,industry_effect,what_followed,embedding",
    )
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to read historical analogies: ${error.message}`);
  }

  const rows = (data ?? []) as HistoricalAnalogyRow[];
  const result: EmbeddingResult = {
    totalRows: rows.length,
    embeddedRows: 0,
    skippedRows: 0,
    failedRows: 0,
  };

  log("Historical analogies fetched", { totalRows: rows.length });

  if (rows.length === 0) {
    log("No rows found. Nothing to embed.");
    return result;
  }

  log("Loading embedding model", { model: MODEL_NAME });
  const extractor = await pipeline("feature-extraction", MODEL_NAME);
  log("Embedding model loaded", {
    model: MODEL_NAME,
    expectedDimensions: EXPECTED_EMBEDDING_DIMENSIONS,
  });

  for (const row of rows) {
    const rowLabel = `${row.country} ${row.period}`;

    if (hasValidEmbedding(row)) {
      result.skippedRows += 1;
      log("Skipping already embedded row", {
        id: row.id,
        row: rowLabel,
        dimensions: row.embedding?.length,
      });
      continue;
    }

    try {
      log("Generating embedding", { id: row.id, row: rowLabel });
      const text = buildHistoricalAnalogyText(row);
      const output = await extractor(text, {
        pooling: "mean",
        normalize: true,
      });
      const embedding = tensorToEmbedding(output);

      log("Storing embedding", {
        id: row.id,
        row: rowLabel,
        dimensions: embedding.length,
      });
      const { error: updateError } = await historicalAnalogies
        .update({ embedding })
        .eq("id", row.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      result.embeddedRows += 1;
      log("Embedding stored", { id: row.id, row: rowLabel });
    } catch (error) {
      result.failedRows += 1;
      logError("Failed to embed row", error, { id: row.id, row: rowLabel });
    }
  }

  log("Historical embedding generation complete", {
    ...result,
    durationMs: Date.now() - startedAt,
  });

  return result;
}

const executedDirectly = process.argv[1] === fileURLToPath(import.meta.url);

if (executedDirectly) {
  generateHistoricalEmbeddings()
    .then((result) => {
      log("Script finished successfully", result);
      process.exit(0);
    })
    .catch((error) => {
      logError("Script failed", error);
      process.exit(1);
    });
}
