-- Migration 040: Create dry_off_records table
--
-- Stores structured records of animals being dried off. Supports multiple
-- entry paths: manual via the Animal Profile Quick Actions modal, automatic
-- via production-status transitions, and future bulk imports.
--
-- Related tables:
--   animals              → the animal being dried off
--   farms                → multi-tenancy scope
--   service_records      → links expected calving date from latest pregnancy
--   lactation_cycle_records → lactation number and days-in-milk at dry-off
--   auth.users           → recorded_by audit trail
--
-- Depends on: all prior migrations
-- Safe to run multiple times (uses IF EXISTS / IF NOT EXISTS guards)

-- ============================================================
-- DRY OFF REASON ENUM
-- ============================================================
DO $$ BEGIN
  CREATE TYPE dry_off_reason_type AS ENUM (
    'end_of_lactation',
    'low_production',
    'health_issue',
    'pregnancy',
    'involuntary',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- DRY_OFF_RECORDS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.dry_off_records (
  id                       uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  farm_id                  uuid NOT NULL
                           REFERENCES public.farms (id) ON DELETE CASCADE,
  animal_id                uuid NOT NULL
                           REFERENCES public.animals (id) ON DELETE CASCADE,

  -- Core dry-off details
  dry_off_date             date NOT NULL,
  dry_off_reason           dry_off_reason_type NOT NULL,

  -- Production context at time of dry-off
  last_milk_yield          numeric(8, 2),          -- litres/day at dry-off
  lactation_number         smallint,               -- which lactation cycle
  days_in_milk             int,                    -- DIM at dry-off

  -- Pregnancy / calving context
  service_record_id        uuid
                           REFERENCES public.service_records (id) ON DELETE SET NULL,
  expected_calving_date    date,                   -- pre-filled from pregnancy_records

  -- Dry period planning
  expected_dry_period_days smallint DEFAULT 60,    -- typically 60 days

  -- Treatment
  dry_cow_therapy          boolean NOT NULL DEFAULT false,
  treatment_notes          text,                   -- antibiotic / teat sealant details

  -- General
  notes                    text,
  recorded_by              uuid REFERENCES auth.users (id),
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.dry_off_records IS
  'Records each animal dry-off event with production context, treatment details, and expected reopen date.';


-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_dry_off_records_farm_id
  ON public.dry_off_records USING btree (farm_id);

CREATE INDEX IF NOT EXISTS idx_dry_off_records_animal_id
  ON public.dry_off_records USING btree (animal_id);

CREATE INDEX IF NOT EXISTS idx_dry_off_records_dry_off_date
  ON public.dry_off_records USING btree (dry_off_date);

CREATE INDEX IF NOT EXISTS idx_dry_off_records_service_record_id
  ON public.dry_off_records USING btree (service_record_id)
  WHERE service_record_id IS NOT NULL;

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS dry_off_records_updated_at ON public.dry_off_records;
CREATE TRIGGER dry_off_records_updated_at
  BEFORE UPDATE ON public.dry_off_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.dry_off_records ENABLE ROW LEVEL SECURITY;

-- SELECT: any farm member
CREATE POLICY "Farm members can view dry off records"
  ON public.dry_off_records
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.farm_id = dry_off_records.farm_id
        AND ur.user_id = auth.uid()
    )
  );

-- INSERT: farm members with production create permission
CREATE POLICY "Farm members can insert dry off records"
  ON public.dry_off_records
  FOR INSERT
  WITH CHECK (
    check_farm_permission(farm_id, 'production', 'create')
  );

-- UPDATE: farm members with production update permission
CREATE POLICY "Farm members can update dry off records"
  ON public.dry_off_records
  FOR UPDATE
  USING (
    check_farm_permission(farm_id, 'production', 'update')
  );

-- DELETE: farm members with production delete permission
CREATE POLICY "Farm members can delete dry off records"
  ON public.dry_off_records
  FOR DELETE
  USING (
    check_farm_permission(farm_id, 'production', 'delete')
  );
