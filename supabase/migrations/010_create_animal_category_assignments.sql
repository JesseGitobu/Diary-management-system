-- Migration: Create animal_category_assignments table
-- Purpose: Track which animals are assigned to which categories
-- Supports both auto-synced and manually assigned animals
-- Enables tracking of assignment history and method (auto vs manual)

CREATE TABLE IF NOT EXISTS public.animal_category_assignments (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  farm_id uuid NOT NULL,
  animal_id uuid NOT NULL,
  category_id uuid NOT NULL,
  assignment_method character varying(20) NOT NULL DEFAULT 'auto'::character varying,
  -- 'auto' = assigned automatically based on characteristics
  -- 'manual' = assigned manually by user
  assigned_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  removed_at timestamp with time zone NULL,
  -- NULL = currently assigned, NOT NULL = previously removed (soft delete)
  notes text NULL,
  created_at timestamp with time zone NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT animal_category_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT animal_category_assignments_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES public.farms (id) ON DELETE CASCADE,
  CONSTRAINT animal_category_assignments_animal_id_fkey FOREIGN KEY (animal_id) REFERENCES public.animals (id) ON DELETE CASCADE,
  CONSTRAINT animal_category_assignments_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.animal_categories (id) ON DELETE CASCADE,
  CONSTRAINT animal_category_assignments_method_check CHECK (
    (assignment_method)::text = ANY (ARRAY['auto'::character varying, 'manual'::character varying]::text[])
  )
) TABLESPACE pg_default;

-- Create partial unique index to prevent duplicate active assignments for the same animal-category pair
CREATE UNIQUE INDEX IF NOT EXISTS idx_animal_category_assignments_unique_active 
ON public.animal_category_assignments (animal_id, category_id)
TABLESPACE pg_default
WHERE (removed_at IS NULL);

-- Create indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_animal_category_assignments_farm_id 
ON public.animal_category_assignments USING btree (farm_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_animal_category_assignments_animal_id 
ON public.animal_category_assignments USING btree (animal_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_animal_category_assignments_category_id 
ON public.animal_category_assignments USING btree (category_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_animal_category_assignments_active 
ON public.animal_category_assignments USING btree (farm_id, category_id) TABLESPACE pg_default
WHERE (removed_at IS NULL);

CREATE INDEX IF NOT EXISTS idx_animal_category_assignments_animal_active 
ON public.animal_category_assignments USING btree (animal_id, removed_at) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_animal_category_assignments_method_assigned 
ON public.animal_category_assignments USING btree (assignment_method, assigned_at) TABLESPACE pg_default;

-- Create composite index for assignment method and category
CREATE INDEX IF NOT EXISTS idx_animal_category_assignments_category_method 
ON public.animal_category_assignments USING btree (category_id, assignment_method) TABLESPACE pg_default
WHERE (removed_at IS NULL);

-- Add column documentation
COMMENT ON TABLE public.animal_category_assignments 
IS 'Tracks which animals are assigned to which categories. 
    Supports auto-sync (based on characteristics) and manual assignments.
    Historical tracking via soft-delete using removed_at field.';

COMMENT ON COLUMN public.animal_category_assignments.farm_id 
IS 'Farm this assignment belongs to for data isolation.';

COMMENT ON COLUMN public.animal_category_assignments.assignment_method 
IS 'Method used for assignment: ''auto'' = characteristic-based, ''manual'' = user-selected.';

COMMENT ON COLUMN public.animal_category_assignments.removed_at 
IS 'Timestamp when assignment was removed. NULL = currently active assignment. Used for soft-delete and historical tracking.';

COMMENT ON COLUMN public.animal_category_assignments.notes 
IS 'Optional notes about why the animal was assigned/removed from this category.';

-- Create trigger function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_animal_category_assignments_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating timestamp
DROP TRIGGER IF EXISTS trg_animal_category_assignments_update_timestamp 
ON public.animal_category_assignments;

CREATE TRIGGER trg_animal_category_assignments_update_timestamp
BEFORE UPDATE ON public.animal_category_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_animal_category_assignments_timestamp();
