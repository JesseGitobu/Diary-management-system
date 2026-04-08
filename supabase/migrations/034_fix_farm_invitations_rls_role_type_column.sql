-- Fix farm_invitations RLS policies to use `role_type` column instead of `role`
-- The user_roles table uses role_type, not role, so the old policies were
-- silently blocking all writes/deletes because the subquery returned no rows.

-- Drop all existing farm_invitations policies
DROP POLICY IF EXISTS "Farm managers can view farm invitations" ON farm_invitations;
DROP POLICY IF EXISTS "Invited users can view their own invitation" ON farm_invitations;
DROP POLICY IF EXISTS "Farm managers can create invitations" ON farm_invitations;
DROP POLICY IF EXISTS "Farm managers can update invitations" ON farm_invitations;
DROP POLICY IF EXISTS "Farm managers can delete invitations" ON farm_invitations;
-- Also drop the original policies from 021 in case they still exist
DROP POLICY IF EXISTS "Farm owners and invited users can view invitations" ON farm_invitations;
DROP POLICY IF EXISTS "Farm owners can create invitations" ON farm_invitations;
DROP POLICY IF EXISTS "Farm owners can manage invitations" ON farm_invitations;

-- Recreate all policies using role_type (the actual column name)

CREATE POLICY "Farm managers can view farm invitations" ON farm_invitations
  FOR SELECT USING (
    farm_id IN (
      SELECT farm_id FROM user_roles
      WHERE user_id = auth.uid() AND role_type IN ('farm_owner', 'farm_manager')
    )
  );

CREATE POLICY "Invited users can view their own invitation" ON farm_invitations
  FOR SELECT USING (
    lower(email) = lower(auth.jwt() ->> 'email')
  );

CREATE POLICY "Farm managers can create invitations" ON farm_invitations
  FOR INSERT WITH CHECK (
    farm_id IN (
      SELECT farm_id FROM user_roles
      WHERE user_id = auth.uid() AND role_type IN ('farm_owner', 'farm_manager')
    )
  );

CREATE POLICY "Farm managers can update invitations" ON farm_invitations
  FOR UPDATE USING (
    farm_id IN (
      SELECT farm_id FROM user_roles
      WHERE user_id = auth.uid() AND role_type IN ('farm_owner', 'farm_manager')
    )
  );

CREATE POLICY "Farm managers can delete invitations" ON farm_invitations
  FOR DELETE USING (
    farm_id IN (
      SELECT farm_id FROM user_roles
      WHERE user_id = auth.uid() AND role_type IN ('farm_owner', 'farm_manager')
    )
  );
