-- ============================================================
-- Migration 009: Create animal_release_records Table
-- Purpose: Maintain audit trail of animal releases (sales, culling, death, etc.)
-- ============================================================

-- Create the animal_release_records table
CREATE TABLE IF NOT EXISTS public.animal_release_records (
  -- Primary Keys
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id UUID NOT NULL,
  farm_id UUID NOT NULL,
  
  -- Release Information
  release_reason TEXT NOT NULL,
  release_date DATE NOT NULL,
  
  -- Reason-specific Details (nullable based on release_reason)
  sale_price DECIMAL(10, 2),
  buyer_name TEXT,
  death_cause TEXT,
  destination_farm UUID,
  
  -- General
  notes TEXT,
  
  -- Audit Columns
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT fk_animal_id FOREIGN KEY (animal_id) 
    REFERENCES public.animals(id) ON DELETE CASCADE,
  CONSTRAINT fk_farm_id FOREIGN KEY (farm_id) 
    REFERENCES public.farms(id) ON DELETE CASCADE,
  CONSTRAINT fk_created_by FOREIGN KEY (created_by) 
    REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Validate release_reason
  CONSTRAINT ck_release_reason CHECK (
    release_reason IN ('sold', 'deceased', 'transferred', 'culled', 'retired', 'other')
  )
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX idx_animal_release_records_animal_id 
  ON public.animal_release_records(animal_id) TABLESPACE pg_default;

CREATE INDEX idx_animal_release_records_farm_id 
  ON public.animal_release_records(farm_id) TABLESPACE pg_default;

CREATE INDEX idx_animal_release_records_release_date 
  ON public.animal_release_records(release_date DESC) TABLESPACE pg_default;

CREATE INDEX idx_animal_release_records_release_reason 
  ON public.animal_release_records(release_reason) TABLESPACE pg_default;

CREATE INDEX idx_animal_release_records_created_at 
  ON public.animal_release_records(created_at DESC) TABLESPACE pg_default;

-- ============================================================
-- TRIGGER FOR UPDATED_AT TIMESTAMP
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_update_animal_release_records_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_animal_release_records_timestamp 
  ON public.animal_release_records;

CREATE TRIGGER trg_update_animal_release_records_timestamp
  BEFORE UPDATE ON public.animal_release_records
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION public.fn_update_animal_release_records_timestamp();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE public.animal_release_records ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view release records for animals in their farms
DROP POLICY IF EXISTS "release_records_view_policy" 
  ON public.animal_release_records;

CREATE POLICY "release_records_view_policy"
  ON public.animal_release_records
  FOR SELECT
  USING (
    farm_id IN (
      SELECT farm_id FROM public.user_roles 
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can insert release records for farms they have manager+ access
DROP POLICY IF EXISTS "release_records_insert_policy" 
  ON public.animal_release_records;

CREATE POLICY "release_records_insert_policy"
  ON public.animal_release_records
  FOR INSERT
  WITH CHECK (
    farm_id IN (
      SELECT farm_id FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role_type IN ('farm_owner', 'farm_manager', 'super_admin')
    )
  );

-- Policy: Users can update release records for farms they have manager+ access
DROP POLICY IF EXISTS "release_records_update_policy" 
  ON public.animal_release_records;

CREATE POLICY "release_records_update_policy"
  ON public.animal_release_records
  FOR UPDATE
  USING (
    farm_id IN (
      SELECT farm_id FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role_type IN ('farm_owner', 'farm_manager', 'super_admin')
    )
  );

-- Policy: Only admins can delete release records
DROP POLICY IF EXISTS "release_records_delete_policy" 
  ON public.animal_release_records;

CREATE POLICY "release_records_delete_policy"
  ON public.animal_release_records
  FOR DELETE
  USING (
    farm_id IN (
      SELECT farm_id FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role_type = 'farm_owner'
    )
  );

-- ============================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================
COMMENT ON TABLE public.animal_release_records IS 
  'Audit trail of animal releases from the farm. Tracks why and when animals left, including sales, deaths, transfers, culling, and retirement.';

COMMENT ON COLUMN public.animal_release_records.id IS 
  'Unique identifier for this release record';

COMMENT ON COLUMN public.animal_release_records.animal_id IS 
  'Reference to the animal being released';

COMMENT ON COLUMN public.animal_release_records.farm_id IS 
  'Reference to the farm where the animal was kept';

COMMENT ON COLUMN public.animal_release_records.release_reason IS 
  'Reason for release: sold, deceased, transferred, culled, retired, or other';

COMMENT ON COLUMN public.animal_release_records.release_date IS 
  'Date when the animal was released';

COMMENT ON COLUMN public.animal_release_records.sale_price IS 
  'Sale price if release_reason is "sold"';

COMMENT ON COLUMN public.animal_release_records.buyer_name IS 
  'Name of buyer if release_reason is "sold"';

COMMENT ON COLUMN public.animal_release_records.death_cause IS 
  'Cause of death if release_reason is "deceased"';

COMMENT ON COLUMN public.animal_release_records.destination_farm IS 
  'Destination farm if release_reason is "transferred"';

COMMENT ON COLUMN public.animal_release_records.created_by IS 
  'User who recorded the release';

COMMENT ON COLUMN public.animal_release_records.notes IS 
  'Additional notes about the release';
