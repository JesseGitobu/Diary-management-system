-- Add invitation_id column to user_roles table
-- Links user_roles to the invitation that created them

ALTER TABLE public.user_roles
ADD COLUMN invitation_id uuid null;

-- Add foreign key constraint to farm_invitations table
ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_invitation_id_fkey
FOREIGN KEY (invitation_id) REFERENCES public.farm_invitations (id) ON DELETE SET NULL;

-- Create index on invitation_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_invitation_id 
ON public.user_roles USING btree (invitation_id) 
TABLESPACE pg_default;

-- Add comment to document the column
COMMENT ON COLUMN public.user_roles.invitation_id IS 'References the farm_invitations record that created this user_role. Populated when user accepts invitation.';
