-- Add pgvector embeddings for semantic search over historical analogies.
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE public.historical_analogies
  ADD COLUMN IF NOT EXISTS embedding vector(384);

CREATE INDEX IF NOT EXISTS historical_analogies_embedding_idx
  ON public.historical_analogies
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100)
  WHERE embedding IS NOT NULL;
