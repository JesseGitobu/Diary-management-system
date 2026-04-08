-- Fix RLS policies on farm_invitations to work with current schema and user_roles table

-- Drop existing policies
DROP POLICY IF EXISTS "Farm owners and invited users can view invitations" ON farm_invitations;
DROP POLICY IF EXISTS "Farm owners can create invitations" ON farm_invitations;
DROP POLICY IF EXISTS "Farm owners can manage invitations" ON farm_invitations;

-- Create new policies that correctly reference user_roles table

-- Policy 1: Allow farm_owner and farm_manager to view all invitations for their farms
CREATE POLICY "Farm managers can view farm invitations" ON farm_invitations
  FOR SELECT USING (
    farm_id IN (
      SELECT farm_id FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('farm_owner', 'farm_manager')
    )
  );

-- Policy 2: Allow the invited person to view their own invitation (via email match)
CREATE POLICY "Invited users can view their own invitation" ON farm_invitations
  FOR SELECT USING (
    lower(email) = lower(auth.jwt() ->> 'email')
  );

-- Policy 3: Allow farm_owner and farm_manager to insert invitations
CREATE POLICY "Farm managers can create invitations" ON farm_invitations
  FOR INSERT WITH CHECK (
    farm_id IN (
      SELECT farm_id FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('farm_owner', 'farm_manager')
    )
  );

-- Policy 4: Allow farm_owner and farm_manager to update invitations
CREATE POLICY "Farm managers can update invitations" ON farm_invitations
  FOR UPDATE USING (
    farm_id IN (
      SELECT farm_id FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('farm_owner', 'farm_manager')
    )
  );

-- Policy 5: Allow farm_owner and farm_manager to delete invitations
CREATE POLICY "Farm managers can delete invitations" ON farm_invitations
  FOR DELETE USING (
    farm_id IN (
      SELECT farm_id FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('farm_owner', 'farm_manager')
    )
  );
