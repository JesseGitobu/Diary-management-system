-- Migration 047: Add RLS policies for feed_purchases and feed_nutritional_records
--
-- Problem: feed_purchases and feed_nutritional_records tables were created in 
-- migrations 045-046 AFTER migration 038 (which handles RLS for other feed tables).
-- These tables had no RLS policies, causing default-deny on all operations.
--
-- Solution: Add comprehensive RLS policies for both tables following the same
-- pattern as other farm-scoped tables (feed_types, feed_inventory, etc.)


-- ─────────────────────────────────────────────────────────────────────────────
-- MODULE: FEED
-- ─────────────────────────────────────────────────────────────────────────────

-- ── feed_purchases ───────────────────────────────────────────────────────────
-- Stores individual purchase/restock transactions for feed
ALTER TABLE public.feed_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farm members can view feed purchases" ON public.feed_purchases;
DROP POLICY IF EXISTS "Farm members with permission can insert feed purchases" ON public.feed_purchases;
DROP POLICY IF EXISTS "Farm members with permission can update feed purchases" ON public.feed_purchases;
DROP POLICY IF EXISTS "Farm members with permission can delete feed purchases" ON public.feed_purchases;

CREATE POLICY "Farm members can view feed purchases"
  ON public.feed_purchases FOR SELECT
  USING (farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Farm members with permission can insert feed purchases"
  ON public.feed_purchases FOR INSERT
  WITH CHECK (check_farm_permission(farm_id, 'feed', 'create'));

CREATE POLICY "Farm members with permission can update feed purchases"
  ON public.feed_purchases FOR UPDATE
  USING (check_farm_permission(farm_id, 'feed', 'edit'));

CREATE POLICY "Farm members with permission can delete feed purchases"
  ON public.feed_purchases FOR DELETE
  USING (check_farm_permission(farm_id, 'feed', 'delete'));


-- ── feed_nutritional_records ────────────────────────────────────────────────
-- Stores actual measured nutritional values for a specific batch of feed
ALTER TABLE public.feed_nutritional_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farm members can view feed nutritional records" ON public.feed_nutritional_records;
DROP POLICY IF EXISTS "Farm members with permission can insert feed nutritional records" ON public.feed_nutritional_records;
DROP POLICY IF EXISTS "Farm members with permission can update feed nutritional records" ON public.feed_nutritional_records;
DROP POLICY IF EXISTS "Farm members with permission can delete feed nutritional records" ON public.feed_nutritional_records;

CREATE POLICY "Farm members can view feed nutritional records"
  ON public.feed_nutritional_records FOR SELECT
  USING (farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Farm members with permission can insert feed nutritional records"
  ON public.feed_nutritional_records FOR INSERT
  WITH CHECK (check_farm_permission(farm_id, 'feed', 'create'));

CREATE POLICY "Farm members with permission can update feed nutritional records"
  ON public.feed_nutritional_records FOR UPDATE
  USING (check_farm_permission(farm_id, 'feed', 'edit'));

CREATE POLICY "Farm members with permission can delete feed nutritional records"
  ON public.feed_nutritional_records FOR DELETE
  USING (check_farm_permission(farm_id, 'feed', 'delete'));
