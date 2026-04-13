-- Migration 043: Add RLS policies for weight_conversions table
--
-- Depends on: migration 037 (check_farm_permission function must exist)
--
-- Purpose: Enable row-level security for the weight_conversions table used by the feed
-- management system. Weight conversions allow farms to define custom unit conversions
-- (e.g., "1 debe = 15 kg") for recording feed measurements.
--
-- Pattern for this table:
--   SELECT  → any farm member (required for dropdown lists and calculator)
--   INSERT  → check_farm_permission(farm_id, 'feed', 'create')
--   UPDATE  → check_farm_permission(farm_id, 'feed', 'edit')
--   DELETE  → check_farm_permission(farm_id, 'feed', 'delete')

-- ── weight_conversions ───────────────────────────────────────────────────────

ALTER TABLE public.weight_conversions ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Farm members can view weight conversions" ON public.weight_conversions;
DROP POLICY IF EXISTS "Farm members with permission can insert weight conversions" ON public.weight_conversions;
DROP POLICY IF EXISTS "Farm members with permission can update weight conversions" ON public.weight_conversions;
DROP POLICY IF EXISTS "Farm members with permission can delete weight conversions" ON public.weight_conversions;

-- SELECT: Any farm member can view weight conversions (needed for UI dropdowns, calculator, etc.)
-- No permission check here — view access is controlled in the UI itself
CREATE POLICY "Farm members can view weight conversions"
  ON public.weight_conversions FOR SELECT
  USING (farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid()));

-- INSERT: Only users with feed 'create' permission can add weight conversions
CREATE POLICY "Farm members with permission can insert weight conversions"
  ON public.weight_conversions FOR INSERT
  WITH CHECK (check_farm_permission(farm_id, 'feed', 'create'));

-- UPDATE: Only users with feed 'edit' permission can modify weight conversions
CREATE POLICY "Farm members with permission can update weight conversions"
  ON public.weight_conversions FOR UPDATE
  USING (check_farm_permission(farm_id, 'feed', 'edit'));

-- DELETE: Only users with feed 'delete' permission can remove weight conversions
CREATE POLICY "Farm members with permission can delete weight conversions"
  ON public.weight_conversions FOR DELETE
  USING (check_farm_permission(farm_id, 'feed', 'delete'));

-- Add comment documenting the RLS strategy
COMMENT ON TABLE public.weight_conversions IS 'Stores custom weight unit conversions per farm (e.g., debe to kg). RLS policies enforce farm isolation and check feed resource permissions.';
