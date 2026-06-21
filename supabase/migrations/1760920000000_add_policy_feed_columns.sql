-- Migration: add missing columns to policy_feed without removing existing data
-- Generated: 2026-06-19

-- Ensure extension for uuid generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Add columns if they do not exist. Use NULLable columns to avoid breaking existing data.
ALTER TABLE IF EXISTS public.policy_feed
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();

ALTER TABLE IF EXISTS public.policy_feed
  ADD COLUMN IF NOT EXISTS title text;

ALTER TABLE IF EXISTS public.policy_feed
  ADD COLUMN IF NOT EXISTS summary text;

ALTER TABLE IF EXISTS public.policy_feed
  ADD COLUMN IF NOT EXISTS source text;

ALTER TABLE IF EXISTS public.policy_feed
  ADD COLUMN IF NOT EXISTS category text;

ALTER TABLE IF EXISTS public.policy_feed
  ADD COLUMN IF NOT EXISTS country text;

ALTER TABLE IF EXISTS public.policy_feed
  ADD COLUMN IF NOT EXISTS url text;

ALTER TABLE IF EXISTS public.policy_feed
  ADD COLUMN IF NOT EXISTS published_date timestamptz;

ALTER TABLE IF EXISTS public.policy_feed
  ADD COLUMN IF NOT EXISTS impact_brief jsonb;

ALTER TABLE IF EXISTS public.policy_feed
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Populate newly added id and created_at for existing rows if NULL
UPDATE public.policy_feed
SET id = gen_random_uuid()
WHERE id IS NULL;

UPDATE public.policy_feed
SET created_at = now()
WHERE created_at IS NULL;

-- Note: we intentionally do not set NOT NULL or PRIMARY KEY constraints here to avoid
-- potentially breaking existing integrations. If you want to add constraints,
-- run a follow-up migration after verifying data.
