-- Create access control policies table
-- Stores role-based access control rules for different farm operations

-- Create enum for resources
DO $$ BEGIN
    CREATE TYPE access_resource AS ENUM (
        'animals',
        'health',
        'production',
        'breeding',
        'financial',
        'inventory',
        'equipment',
        'reports',
        'team',
        'settings',
        'all'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create enum for actions/permissions
DO $$ BEGIN
    CREATE TYPE access_action AS ENUM (
        'view',
        'create',
        'edit',
        'delete',
        'export',
        'manage'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create access control policies table
CREATE TABLE IF NOT EXISTS public.access_control_policies (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4 (),
  farm_id uuid NOT NULL,
  role_type public.user_role NOT NULL,
  resource access_resource NOT NULL,
  action access_action NOT NULL,
  is_granted boolean NOT NULL DEFAULT true,
  description text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT access_control_policies_pkey PRIMARY KEY (id),
  CONSTRAINT access_control_policies_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES farms (id) ON DELETE CASCADE,
  CONSTRAINT access_control_policies_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users (id) ON DELETE SET NULL,
  CONSTRAINT unique_farm_role_resource_action UNIQUE (farm_id, role_type, resource, action),
  CONSTRAINT valid_role_type CHECK (
    (
      role_type = ANY (
        array[
          'farm_owner'::user_role,
          'farm_manager'::user_role,
          'worker'::user_role,
          'veterinarian'::user_role,
          'super_admin'::user_role
        ]
      )
    )
  )
) TABLESPACE pg_default;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_access_control_farm_id ON public.access_control_policies USING btree (farm_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_access_control_role_type ON public.access_control_policies USING btree (role_type) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_access_control_resource ON public.access_control_policies USING btree (resource) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_access_control_farm_role ON public.access_control_policies USING btree (farm_id, role_type) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_access_control_farm_role_resource ON public.access_control_policies USING btree (farm_id, role_type, resource) TABLESPACE pg_default
WHERE is_granted = true;

-- Enable RLS (Row Level Security)
ALTER TABLE public.access_control_policies ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy 1: Users can view policies for farms they belong to
CREATE POLICY "Users can view access control policies for their farms"
  ON public.access_control_policies
  FOR SELECT
  USING (
    farm_id IN (
      SELECT farm_id FROM user_roles
      WHERE user_id = auth.uid() AND (role_type = 'farm_owner' OR role_type = 'farm_manager')
    )
  );

-- Policy 2: Only farm owners and managers can insert
CREATE POLICY "Only farm owners and managers can create policies"
  ON public.access_control_policies
  FOR INSERT
  WITH CHECK (
    farm_id IN (
      SELECT farm_id FROM user_roles
      WHERE user_id = auth.uid() AND (role_type = 'farm_owner' OR role_type = 'farm_manager')
    )
    AND created_by = auth.uid()
  );

-- Policy 3: Only farm owners and managers can update
CREATE POLICY "Only farm owners and managers can update policies"
  ON public.access_control_policies
  FOR UPDATE
  USING (
    farm_id IN (
      SELECT farm_id FROM user_roles
      WHERE user_id = auth.uid() AND (role_type = 'farm_owner' OR role_type = 'farm_manager')
    )
  )
  WITH CHECK (
    farm_id IN (
      SELECT farm_id FROM user_roles
      WHERE user_id = auth.uid() AND (role_type = 'farm_owner' OR role_type = 'farm_manager')
    )
  );

-- Policy 4: Only farm owners and managers can delete
CREATE POLICY "Only farm owners and managers can delete policies"
  ON public.access_control_policies
  FOR DELETE
  USING (
    farm_id IN (
      SELECT farm_id FROM user_roles
      WHERE user_id = auth.uid() AND role_type = 'farm_owner'
    )
  );

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_access_control_policies_timestamp ()
  RETURNS TRIGGER
  AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$
LANGUAGE plpgsql;

CREATE TRIGGER access_control_policies_update_timestamp
  BEFORE UPDATE ON public.access_control_policies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_access_control_policies_timestamp ();

-- Insert default access control policies for each farm
-- This can be manually configured per farm
COMMENT ON TABLE public.access_control_policies IS 'Stores role-based access control policies for farm operations. Defines what each role (farm_owner, farm_manager, worker, veterinarian) can do with different resources (animals, health, production, etc.).';

COMMENT ON COLUMN public.access_control_policies.farm_id IS 'Foreign key to farms table - which farm this policy applies to';

COMMENT ON COLUMN public.access_control_policies.role_type IS 'The role type this policy applies to (farm_owner, farm_manager, worker, veterinarian, super_admin)';

COMMENT ON COLUMN public.access_control_policies.resource IS 'The resource being controlled (animals, health, production, etc.)';

COMMENT ON COLUMN public.access_control_policies.action IS 'The action being controlled (view, create, edit, delete, export, manage)';

COMMENT ON COLUMN public.access_control_policies.is_granted IS 'Whether this permission is granted (true) or denied (false)';

COMMENT ON COLUMN public.access_control_policies.created_by IS 'The user who created this policy';
