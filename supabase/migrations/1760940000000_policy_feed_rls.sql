-- policy_feed is a shared feed table. Authenticated users (and server-side
-- service role) need read/update access for Impact Brief generation.

ALTER TABLE IF EXISTS public.policy_feed ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "policy_feed_select_authenticated" ON public.policy_feed;
DROP POLICY IF EXISTS "policy_feed_update_authenticated" ON public.policy_feed;

CREATE POLICY "policy_feed_select_authenticated"
  ON public.policy_feed
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "policy_feed_update_authenticated"
  ON public.policy_feed
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
