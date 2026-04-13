-- Migration 039: Normalize breeding schema
--
-- Fix 2: Enforce correct use of parent FK vs free-text fields on animals table.
--        mother_name and father_info are intentionally kept for purchased animals
--        whose parents are external (not registered in the system). The integrity
--        risk is having BOTH the FK and free-text set simultaneously for the same
--        parent. CHECK constraints enforce the intended mutual exclusivity.
--
-- Fix 3: Replace breeding_events.heat_signs (text[] — 1NF violation)
--        with a dedicated heat_detection_signs child table.
--        Migrates existing array data before dropping the column.
--
-- Depends on: all prior migrations
-- Safe to run multiple times (uses IF EXISTS / IF NOT EXISTS guards)

-- ============================================================
-- FIX 2 — Enforce correct use of parent FK vs free-text fields
-- ============================================================
--
-- The animals table supports two parentage patterns:
--
--   On-farm parent (registered animal):
--     mother_id / father_id  → set to the parent animal's UUID
--     mother_name / father_info → NULL  (name derived at query time via FK join)
--
--   External parent (purchased animal, AI bull, unknown sire):
--     mother_id / father_id  → NULL  (parent not registered in the system)
--     mother_name  → free-text dam details  (e.g. "Daisy HF imported")
--     father_info  → free-text sire details (e.g. AI bull code "HOL001")
--
-- Both free-text columns are intentional and must NOT be dropped.
-- The only integrity risk is having BOTH the FK and free-text set
-- simultaneously for the same parent, creating an ambiguity.
--
-- These constraints enforce mutual exclusivity:
--   • If mother_id is set  → mother_name must be NULL
--   • If father_id is set  → father_info must be NULL

ALTER TABLE public.animals
  DROP CONSTRAINT IF EXISTS animals_mother_name_exclusive;

ALTER TABLE public.animals
  ADD CONSTRAINT animals_mother_name_exclusive CHECK (
    mother_id IS NULL OR mother_name IS NULL
  );

ALTER TABLE public.animals
  DROP CONSTRAINT IF EXISTS animals_father_info_exclusive;

ALTER TABLE public.animals
  ADD CONSTRAINT animals_father_info_exclusive CHECK (
    father_id IS NULL OR father_info IS NULL
  );

-- NOTE: Before running this migration, verify no existing rows violate the
-- new constraints by running these checks in the Supabase SQL editor:
--
--   SELECT id, tag_number, mother_id, mother_name
--   FROM public.animals
--   WHERE mother_id IS NOT NULL AND mother_name IS NOT NULL;
--
--   SELECT id, tag_number, father_id, father_info
--   FROM public.animals
--   WHERE father_id IS NOT NULL AND father_info IS NOT NULL;
--
-- If rows are returned, clean them up first:
--
--   UPDATE public.animals SET mother_name = NULL
--   WHERE mother_id IS NOT NULL AND mother_name IS NOT NULL;
--
--   UPDATE public.animals SET father_info = NULL
--   WHERE father_id IS NOT NULL AND father_info IS NOT NULL;


-- ============================================================
-- FIX 3 — Normalize heat_signs out of breeding_events
-- ============================================================

-- Step 1: Create the child table.
CREATE TABLE IF NOT EXISTS public.heat_detection_signs (
  event_id  uuid NOT NULL
            REFERENCES public.breeding_events (id) ON DELETE CASCADE,
  sign      text NOT NULL,
  CONSTRAINT heat_detection_signs_pkey PRIMARY KEY (event_id, sign)
);

COMMENT ON TABLE public.heat_detection_signs IS
  'Atomic heat signs observed per heat_detection breeding event (normalised from breeding_events.heat_signs array).';

-- Step 2: Index for fast lookup by event.
CREATE INDEX IF NOT EXISTS idx_heat_detection_signs_event_id
  ON public.heat_detection_signs USING btree (event_id);

-- Step 3: Migrate existing array data into the new table.
-- unnest() expands each element of the text[] into its own row.
-- The WHERE guard skips rows where heat_signs is null or empty.
-- ON CONFLICT DO NOTHING makes this safe to re-run.
INSERT INTO public.heat_detection_signs (event_id, sign)
SELECT
  be.id,
  sign_value
FROM public.breeding_events be,
     LATERAL unnest(be.heat_signs) AS sign_value
WHERE
  be.event_type = 'heat_detection'
  AND be.heat_signs IS NOT NULL
  AND array_length(be.heat_signs, 1) > 0
ON CONFLICT (event_id, sign) DO NOTHING;

-- Step 4: Verify counts match before dropping the column (run manually first):
--
--   SELECT
--     (SELECT COUNT(*) FROM public.heat_detection_signs)        AS migrated_signs,
--     (SELECT COALESCE(SUM(array_length(heat_signs, 1)), 0)
--      FROM public.breeding_events
--      WHERE heat_signs IS NOT NULL)                            AS original_signs;
--
-- Both numbers should be equal before proceeding.

-- Step 5: Drop the now-redundant array column.
ALTER TABLE public.breeding_events
  DROP COLUMN IF EXISTS heat_signs;

-- Step 6: Recreate the heat_detection_no_detail CHECK constraint.
-- The original referenced heat_signs which no longer exists after Step 5,
-- so we drop and recreate it scoped only to the FK columns.
ALTER TABLE public.breeding_events
  DROP CONSTRAINT IF EXISTS breeding_events_heat_detection_no_detail;

ALTER TABLE public.breeding_events
  ADD CONSTRAINT breeding_events_heat_detection_no_detail CHECK (
    CASE
      WHEN event_type = 'heat_detection'::breeding_event_type THEN
        service_record_id IS NULL
        AND pregnancy_record_id IS NULL
        AND calving_record_id IS NULL
      ELSE true
    END
  );


-- ============================================================
-- RLS for heat_detection_signs
-- ============================================================
-- Follows the same pattern as migration 038.

ALTER TABLE public.heat_detection_signs ENABLE ROW LEVEL SECURITY;

-- SELECT: any member of the farm that owns the parent breeding event
CREATE POLICY "Farm members can view heat detection signs"
  ON public.heat_detection_signs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.breeding_events be
      JOIN public.user_roles ur ON ur.farm_id = be.farm_id
      WHERE be.id = heat_detection_signs.event_id
        AND ur.user_id = auth.uid()
    )
  );

-- INSERT: farm members with breeding create permission
CREATE POLICY "Farm members can insert heat detection signs"
  ON public.heat_detection_signs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.breeding_events be
      WHERE be.id = heat_detection_signs.event_id
        AND check_farm_permission(be.farm_id, 'breeding', 'create')
    )
  );

-- DELETE: farm members with breeding delete permission
CREATE POLICY "Farm members can delete heat detection signs"
  ON public.heat_detection_signs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.breeding_events be
      WHERE be.id = heat_detection_signs.event_id
        AND check_farm_permission(be.farm_id, 'breeding', 'delete')
    )
  );
