-- Create simulation_history table for storing generated foresight memos.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.simulation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scenario text NOT NULL,
  memo text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS simulation_history_user_id_created_at_idx
  ON public.simulation_history (user_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.simulation_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own simulation history
DROP POLICY IF EXISTS "Simulation history is viewable by owner" ON public.simulation_history;
CREATE POLICY "Simulation history is viewable by owner"
  ON public.simulation_history FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own simulation history
DROP POLICY IF EXISTS "Simulation history is insertable by owner" ON public.simulation_history;
CREATE POLICY "Simulation history is insertable by owner"
  ON public.simulation_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own simulation history
DROP POLICY IF EXISTS "Simulation history is deletable by owner" ON public.simulation_history;
CREATE POLICY "Simulation history is deletable by owner"
  ON public.simulation_history FOR DELETE
  USING (auth.uid() = user_id);
