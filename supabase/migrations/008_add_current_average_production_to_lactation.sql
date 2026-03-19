-- Add current_average_production column to lactation_cycle_records
-- This column stores the current average daily production (liters per day)
-- and is used for filtering animals by milk yield range in categories

ALTER TABLE public.lactation_cycle_records
ADD COLUMN IF NOT EXISTS current_average_production numeric(10, 2) NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.lactation_cycle_records.current_average_production IS 'Current average daily milk production in liters per day. Calculated as total_yield_litres / days in current lactation cycle';

-- Create index on current_average_production for faster filtering
CREATE INDEX IF NOT EXISTS idx_lactation_cycle_records_avg_production 
ON public.lactation_cycle_records(current_average_production) 
TABLESPACE pg_default;

-- Create composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_lactation_cycle_records_status_production
ON public.lactation_cycle_records(status, current_average_production)
TABLESPACE pg_default;
