-- Migration: create historical_analogies table and RLS policies
-- Ensure pgcrypto is available for gen_random_uuid
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.historical_analogies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country text NOT NULL,
  period text NOT NULL,
  defense_trend text NOT NULL,
  emissions_trend text NOT NULL,
  industry_effect text NOT NULL,
  what_followed text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.historical_analogies ENABLE ROW LEVEL SECURITY;

-- Policies: allow authenticated users to select/insert/update/delete
CREATE POLICY "Allow authenticated read" ON public.historical_analogies
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated insert" ON public.historical_analogies
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update" ON public.historical_analogies
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated delete" ON public.historical_analogies
  FOR DELETE
  USING (auth.role() = 'authenticated');
