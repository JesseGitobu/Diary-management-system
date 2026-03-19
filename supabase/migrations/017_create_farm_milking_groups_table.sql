-- Create farm_milking_groups table to store milking group configurations
-- This table maintains a one-to-one relationship between farms and animal categories for milking
-- Each record represents a unified configuration of a single animal category within a farm

CREATE TABLE IF NOT EXISTS public.farm_milking_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL,
  category_id uuid NOT NULL,
  category_name text NOT NULL,
  animal_count integer DEFAULT 0 NOT NULL,
  
  -- Milking schedule configuration (JSONB for flexibility)
  -- Structure: [{ id: string, name: string, frequency: number, times: string[] }, ...]
  milking_schedules jsonb DEFAULT '[]'::jsonb NOT NULL,
  
  -- Selected schedule ID from the milking_schedules array
  selected_schedule_id text,
  
  -- Audit timestamps
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  
  -- Foreign keys
  CONSTRAINT fk_farm_milking_groups_farm 
    FOREIGN KEY (farm_id) 
    REFERENCES public.farms(id) 
    ON DELETE CASCADE,
    
  -- Unique constraint ensures one milking group configuration per farm+category combination
  CONSTRAINT unique_farm_category_milking_group 
    UNIQUE(farm_id, category_id)
);

-- Create indexes for optimal query performance
-- Primary access pattern: fetch groups by farm_id for a farm's dashboard
CREATE INDEX IF NOT EXISTS idx_farm_milking_groups_farm_id 
  ON public.farm_milking_groups(farm_id);

-- Secondary access pattern: find group by farm and category
CREATE INDEX IF NOT EXISTS idx_farm_milking_groups_farm_category 
  ON public.farm_milking_groups(farm_id, category_id);

-- Temporal queries: get recently updated groups
CREATE INDEX IF NOT EXISTS idx_farm_milking_groups_updated_at_desc 
  ON public.farm_milking_groups(farm_id, updated_at DESC);

-- Full-text search on category_name if needed for filtering
CREATE INDEX IF NOT EXISTS idx_farm_milking_groups_category_name 
  ON public.farm_milking_groups USING GiST (to_tsvector('english', category_name));

-- Enable Row Level Security
ALTER TABLE public.farm_milking_groups ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can SELECT milking groups from their farms
CREATE POLICY "Users can view farm milking groups"
  ON public.farm_milking_groups
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.farm_id = farm_milking_groups.farm_id
    )
  );

-- RLS Policy: Farm managers can INSERT new milking groups
CREATE POLICY "Farm managers can create milking groups"
  ON public.farm_milking_groups
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.farm_id = farm_milking_groups.farm_id
        AND ur.role_type IN ('farm_owner', 'farm_manager')
    )
  );

-- RLS Policy: Farm managers can UPDATE milking groups in their farms
CREATE POLICY "Farm managers can update milking groups"
  ON public.farm_milking_groups
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.farm_id = farm_milking_groups.farm_id
        AND ur.role_type IN ('farm_owner', 'farm_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.farm_id = farm_milking_groups.farm_id
        AND ur.role_type IN ('farm_owner', 'farm_manager')
    )
  );

-- RLS Policy: Farm managers can DELETE milking groups
CREATE POLICY "Farm managers can delete milking groups"
  ON public.farm_milking_groups
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.farm_id = farm_milking_groups.farm_id
        AND ur.role_type IN ('farm_owner', 'farm_manager')
    )
  );

-- Add helpful comments
COMMENT ON TABLE public.farm_milking_groups IS 'Stores milking group configurations per farm. Each row represents an animal category configured for milking with its schedule. One-to-one relationship per farm-category pair.';
COMMENT ON COLUMN public.farm_milking_groups.id IS 'Unique identifier for the milking group record';
COMMENT ON COLUMN public.farm_milking_groups.farm_id IS 'Reference to the farm this milking group belongs to';
COMMENT ON COLUMN public.farm_milking_groups.category_id IS 'Reference to the animal category in this milking group';
COMMENT ON COLUMN public.farm_milking_groups.category_name IS 'Denormalized category name for faster queries';
COMMENT ON COLUMN public.farm_milking_groups.animal_count IS 'Number of animals in this category/group (cached for performance)';
COMMENT ON COLUMN public.farm_milking_groups.milking_schedules IS 'Array of available milking schedules with times and frequency';
COMMENT ON COLUMN public.farm_milking_groups.selected_schedule_id IS 'Currently selected milking schedule ID from the schedules array';
COMMENT ON COLUMN public.farm_milking_groups.created_at IS 'When this milking group was created';
COMMENT ON COLUMN public.farm_milking_groups.updated_at IS 'When this milking group was last updated';
