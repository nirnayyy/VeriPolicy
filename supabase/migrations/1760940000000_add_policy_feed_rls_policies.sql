-- Migration: add SELECT and UPDATE RLS policies to policy_feed
-- Generated: 2026-06-30

-- Allow SELECT for anon role on policy_feed
CREATE POLICY "Allow anon read feed" ON public.policy_feed
  FOR SELECT TO anon USING (true);

-- Allow UPDATE for anon and authenticated roles on policy_feed
CREATE POLICY "Allow anon update feed" ON public.policy_feed
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated update feed" ON public.policy_feed
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
