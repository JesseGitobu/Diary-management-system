-- Create enums for employment status and position types
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employment_status') THEN
    CREATE TYPE public.employment_status AS ENUM (
      'full_time',
      'part_time',
      'casual',
      'contract'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'worker_position') THEN
    CREATE TYPE public.worker_position AS ENUM (
      'farm_manager',
      'worker',
      'veterinarian',
      'other'
    );
  END IF;
END $$;

-- Recreate workers table with improved structure
DROP TABLE IF EXISTS public.workers CASCADE;

CREATE TABLE public.workers (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  farm_id uuid NOT NULL,
  name character varying(255) NOT NULL,
  worker_number character varying(100) NOT NULL,
  employment_status public.employment_status NOT NULL DEFAULT 'full_time',
  position character varying(255) NOT NULL,
  shift character varying(100) NULL,
  department_id uuid NULL,
  casual_rate numeric(10, 2) NULL,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT workers_pkey PRIMARY KEY (id),
  CONSTRAINT workers_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES public.farms (id) ON DELETE CASCADE,
  CONSTRAINT workers_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments (id) ON DELETE SET NULL,
  CONSTRAINT workers_farm_worker_number_key UNIQUE (farm_id, worker_number),
  CONSTRAINT workers_casual_rate_check CHECK (
    CASE 
      WHEN employment_status = 'casual' THEN casual_rate IS NOT NULL AND casual_rate > 0
      ELSE casual_rate IS NULL
    END
  ),
  CONSTRAINT workers_position_not_empty CHECK (position != '' AND position IS NOT NULL),
  CONSTRAINT workers_shift_not_empty CHECK (shift = '' OR shift IS NOT NULL)
) TABLESPACE pg_default;

-- Create optimized indexes
CREATE INDEX IF NOT EXISTS idx_workers_farm_id 
  ON public.workers USING btree (farm_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_workers_department_id 
  ON public.workers USING btree (department_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_workers_employment_status 
  ON public.workers USING btree (employment_status) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_workers_farm_employment 
  ON public.workers USING btree (farm_id, employment_status) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_workers_farm_department 
  ON public.workers USING btree (farm_id, department_id) 
  TABLESPACE pg_default
  WHERE department_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workers_created_at 
  ON public.workers USING btree (created_at DESC) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_workers_worker_number 
  ON public.workers USING btree (farm_id, worker_number) TABLESPACE pg_default;

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_workers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS workers_update_timestamp ON public.workers;
CREATE TRIGGER workers_update_timestamp
  BEFORE UPDATE ON public.workers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_workers_updated_at();

-- Enable RLS
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS workers_farm_isolation ON public.workers;
DROP POLICY IF EXISTS workers_select_policy ON public.workers;
DROP POLICY IF EXISTS workers_insert_policy ON public.workers;
DROP POLICY IF EXISTS workers_update_policy ON public.workers;
DROP POLICY IF EXISTS workers_delete_policy ON public.workers;

-- Create RLS policies for farm isolation
CREATE POLICY workers_farm_isolation ON public.workers
  AS RESTRICTIVE FOR ALL
  USING (
    farm_id IN (
      SELECT farm_id FROM public.user_farm_roles 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY workers_select_policy ON public.workers
  FOR SELECT
  USING (
    farm_id IN (
      SELECT farm_id FROM public.user_farm_roles 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY workers_insert_policy ON public.workers
  FOR INSERT
  WITH CHECK (
    farm_id IN (
      SELECT farm_id FROM public.user_farm_roles 
      WHERE user_id = auth.uid() AND role_type IN ('farm_owner', 'farm_manager')
    )
  );

CREATE POLICY workers_update_policy ON public.workers
  FOR UPDATE
  USING (
    farm_id IN (
      SELECT farm_id FROM public.user_farm_roles 
      WHERE user_id = auth.uid() AND role_type IN ('farm_owner', 'farm_manager')
    )
  )
  WITH CHECK (
    farm_id IN (
      SELECT farm_id FROM public.user_farm_roles 
      WHERE user_id = auth.uid() AND role_type IN ('farm_owner', 'farm_manager')
    )
  );

CREATE POLICY workers_delete_policy ON public.workers
  FOR DELETE
  USING (
    farm_id IN (
      SELECT farm_id FROM public.user_farm_roles 
      WHERE user_id = auth.uid() AND role_type IN ('farm_owner', 'farm_manager')
    )
  );

-- Add table comments
COMMENT ON TABLE public.workers IS 'Farm worker records with employment details and position tracking';
COMMENT ON COLUMN public.workers.employment_status IS 'Employment type: full_time, part_time, casual, contract';
COMMENT ON COLUMN public.workers.position IS 'Job position or title (flexible for custom values)';
COMMENT ON COLUMN public.workers.casual_rate IS 'Hourly rate in Kenyan Shillings (Kes) - only for casual workers';
COMMENT ON COLUMN public.workers.shift IS 'Work shift assignment (e.g., Morning, Evening, Night)';
