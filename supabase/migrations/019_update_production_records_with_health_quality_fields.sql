-- Add missing health and quality fields to production_records table
-- This migration adds support for:
-- - Milking session tracking
-- - Health monitoring (temperature, mastitis)
-- - Quality metrics (lactose, pH)
-- - Recorded by tracking
-- - Updated at timestamp

ALTER TABLE public.production_records 
ADD COLUMN IF NOT EXISTS milking_session text,
ADD COLUMN IF NOT EXISTS temperature numeric(5, 2) NULL,
ADD COLUMN IF NOT EXISTS mastitis_test_performed boolean NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS mastitis_result text NULL,
ADD COLUMN IF NOT EXISTS affected_quarters text[] NULL,
ADD COLUMN IF NOT EXISTS lactose_content numeric(5, 2) NULL,
ADD COLUMN IF NOT EXISTS ph_level numeric(4, 2) NULL,
ADD COLUMN IF NOT EXISTS recorded_by uuid NULL,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NULL DEFAULT CURRENT_TIMESTAMP;

-- Add foreign key for recorded_by if not exists
ALTER TABLE public.production_records
ADD CONSTRAINT production_records_recorded_by_fkey 
FOREIGN KEY (recorded_by) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;

-- Create an index on milking_session for better query performance
CREATE INDEX IF NOT EXISTS idx_production_records_milking_session 
ON public.production_records(milking_session);

-- Create an index on recorded_by for user records tracking
CREATE INDEX IF NOT EXISTS idx_production_records_recorded_by 
ON public.production_records(recorded_by);

-- Create composite index for session-based queries
CREATE INDEX IF NOT EXISTS idx_production_records_session_date 
ON public.production_records(farm_id, record_date, milking_session);

-- Add check constraints for quality fields
ALTER TABLE public.production_records
ADD CONSTRAINT check_temperature_range 
CHECK (temperature IS NULL OR (temperature >= 35 AND temperature <= 41)),
ADD CONSTRAINT check_fat_content_range 
CHECK (fat_content IS NULL OR (fat_content >= 0 AND fat_content <= 15)),
ADD CONSTRAINT check_protein_content_range 
CHECK (protein_content IS NULL OR (protein_content >= 0 AND protein_content <= 10)),
ADD CONSTRAINT check_lactose_content_range 
CHECK (lactose_content IS NULL OR (lactose_content >= 0 AND lactose_content <= 10)),
ADD CONSTRAINT check_ph_level_range 
CHECK (ph_level IS NULL OR (ph_level >= 0 AND ph_level <= 14));

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_production_records_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS production_records_timestamp_trigger ON public.production_records;

CREATE TRIGGER production_records_timestamp_trigger
BEFORE UPDATE ON public.production_records
FOR EACH ROW
EXECUTE FUNCTION public.update_production_records_timestamp();

-- Add RLS policies if they don't exist (RLS should already be enabled)
-- Verify RLS is enabled
ALTER TABLE public.production_records ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view production records for their farm" ON public.production_records;
DROP POLICY IF EXISTS "Users can create production records for their farm" ON public.production_records;
DROP POLICY IF EXISTS "Users can update their own production records" ON public.production_records;
DROP POLICY IF EXISTS "Users can delete their own production records" ON public.production_records;

-- Create policies for production_records
CREATE POLICY "Users can view production records for their farm"
  ON public.production_records FOR SELECT
  USING (
    farm_id IN (
      SELECT farm_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create production records for their farm"
  ON public.production_records FOR INSERT
  WITH CHECK (
    farm_id IN (
      SELECT farm_id FROM public.user_roles WHERE user_id = auth.uid()
    ) AND
    recorded_by = auth.uid()
  );

CREATE POLICY "Users can update their own production records"
  ON public.production_records FOR UPDATE
  USING (
    farm_id IN (
      SELECT farm_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own production records"
  ON public.production_records FOR DELETE
  USING (
    farm_id IN (
      SELECT farm_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

-- Add comment for documentation
COMMENT ON COLUMN public.production_records.milking_session IS 'Name of the milking session (e.g., morning, afternoon, evening)';
COMMENT ON COLUMN public.production_records.temperature IS 'Animal body temperature in Celsius';
COMMENT ON COLUMN public.production_records.mastitis_test_performed IS 'Whether mastitis test was performed';
COMMENT ON COLUMN public.production_records.mastitis_result IS 'Mastitis test result (negative, mild, severe)';
COMMENT ON COLUMN public.production_records.affected_quarters IS 'Array of affected quarters (if mastitis detected)';
COMMENT ON COLUMN public.production_records.lactose_content IS 'Lactose content percentage';
COMMENT ON COLUMN public.production_records.ph_level IS 'pH level of milk';
COMMENT ON COLUMN public.production_records.recorded_by IS 'User who recorded this production record';
