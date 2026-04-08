-- Add name column to access_control_policies table
-- Allows naming policies for better organization and management

-- Add name column
ALTER TABLE public.access_control_policies
ADD COLUMN IF NOT EXISTS name varchar(255) NOT NULL DEFAULT 'Unnamed Policy';

-- Add index on farm_id and name for faster queries
CREATE INDEX IF NOT EXISTS idx_access_control_farm_name ON public.access_control_policies USING btree (farm_id, name) TABLESPACE pg_default;

-- Add comment to document the new column
COMMENT ON COLUMN public.access_control_policies.name IS 'Name/title of the access control policy for better organization and management';
