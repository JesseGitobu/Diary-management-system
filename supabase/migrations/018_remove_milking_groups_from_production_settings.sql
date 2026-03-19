-- Remove milking_groups column from farm_production_settings table
-- Milking groups are now stored in a dedicated farm_milking_groups table for better data organization
-- and performance optimization

ALTER TABLE public.farm_production_settings
DROP COLUMN IF EXISTS milking_groups;

-- Update the comment on the farm_production_settings table
COMMENT ON TABLE public.farm_production_settings IS 'Stores production settings per farm. Milking group information is now stored separately in farm_milking_groups table for better data integrity and query performance.';
