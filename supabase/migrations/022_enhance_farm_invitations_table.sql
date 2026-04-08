-- Add full_name and status columns to farm_invitations table
ALTER TABLE public.farm_invitations
ADD COLUMN IF NOT EXISTS full_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired'));

-- Add sent_by and sent_at columns (aliases for invited_by and created_at for clarity)
ALTER TABLE public.farm_invitations
ADD COLUMN IF NOT EXISTS sent_by UUID,
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE;

-- Update any existing sent_by and sent_at with values from invited_by and created_at
UPDATE public.farm_invitations 
SET sent_by = invited_by, sent_at = created_at 
WHERE sent_by IS NULL AND sent_at IS NULL;

-- Make sent_by NOT NULL with proper foreign key constraint
ALTER TABLE public.farm_invitations
ALTER COLUMN sent_by SET NOT NULL,
ALTER COLUMN sent_at SET NOT NULL;

-- Rename role column to role_type to match user roles enum
ALTER TABLE public.farm_invitations
RENAME COLUMN role TO role_type;

-- Update constraints to check role_type values
ALTER TABLE public.farm_invitations
DROP CONSTRAINT IF EXISTS farm_invitations_role_check;

ALTER TABLE public.farm_invitations
ADD CONSTRAINT farm_invitations_role_type_check 
CHECK (role_type IN ('farm_owner', 'farm_manager', 'worker', 'veterinarian'));

-- Add comment documentation
COMMENT ON COLUMN public.farm_invitations.full_name IS 'Full name of the person being invited';
COMMENT ON COLUMN public.farm_invitations.role_type IS 'Role to be assigned to the invited user';
COMMENT ON COLUMN public.farm_invitations.status IS 'Status of the invitation: pending, accepted, rejected, or expired';
COMMENT ON COLUMN public.farm_invitations.sent_by IS 'User who sent the invitation';
COMMENT ON COLUMN public.farm_invitations.sent_at IS 'Timestamp when the invitation was sent';
