-- 015_add_production_settings_columns_production_tab.sql
-- Add new columns for the Production Settings Tab enhancements
-- Includes milking sessions configuration and production cost breakdown

ALTER TABLE public.production_settings
ADD COLUMN IF NOT EXISTS milking_sessions JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS labor_cost_per_unit NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS feed_cost_per_unit NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS utilities_cost_per_unit NUMERIC(10, 2) DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN public.production_settings.milking_sessions IS 'Array of milking sessions configuration. Each session contains: id (string), name (string), time (HH:mm format)';
COMMENT ON COLUMN public.production_settings.labor_cost_per_unit IS 'Labor cost per production unit in Kenyan Shillings (KES)';
COMMENT ON COLUMN public.production_settings.feed_cost_per_unit IS 'Feed cost per production unit in Kenyan Shillings (KES)';
COMMENT ON COLUMN public.production_settings.utilities_cost_per_unit IS 'Utilities cost per production unit in Kenyan Shillings (KES)';

-- Create index for faster lookups if not already exists
CREATE INDEX IF NOT EXISTS idx_production_settings_farm_id 
ON public.production_settings(farm_id);

-- Example structure for milking_sessions:
-- [
--   { "id": "1", "name": "Morning", "time": "06:00" },
--   { "id": "2", "name": "Afternoon", "time": "14:00" },
--   { "id": "3", "name": "Evening", "time": "18:00" }
-- ]
