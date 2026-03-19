-- Add milking_groups column to production_settings table
ALTER TABLE public.production_settings
ADD COLUMN IF NOT EXISTS milking_groups JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_production_settings_farm_id 
ON public.production_settings(farm_id);

-- Add comment for documentation
COMMENT ON COLUMN public.production_settings.milking_groups IS 'Array of milking group configurations with category_id, category_name, animal_count, milking_schedules, and selected_schedule_id';
