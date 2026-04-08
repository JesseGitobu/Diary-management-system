-- supabase/migrations/030_add_team_member_policy_assignments.sql
-- Add team member to policy assignment tracking

-- Create table to track which policies are assigned to team members
CREATE TABLE IF NOT EXISTS team_member_policy_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  user_role_id UUID NOT NULL REFERENCES user_roles(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL REFERENCES access_control_policies(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_user_per_farm_policy UNIQUE (farm_id, user_role_id, policy_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_member_policy_farm_id ON team_member_policy_assignments USING btree (farm_id);
CREATE INDEX IF NOT EXISTS idx_team_member_policy_user_role_id ON team_member_policy_assignments USING btree (user_role_id);
CREATE INDEX IF NOT EXISTS idx_team_member_policy_policy_id ON team_member_policy_assignments USING btree (policy_id);
CREATE INDEX IF NOT EXISTS idx_team_member_policy_farm_user ON team_member_policy_assignments USING btree (farm_id, user_role_id);

-- Enable RLS
ALTER TABLE team_member_policy_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view assignments for farms they belong to as farm_owner or farm_manager
CREATE POLICY "Users can view team member policy assignments for their farms"
  ON team_member_policy_assignments
  FOR SELECT
  USING (
    farm_id IN (
      SELECT farm_id FROM user_roles
      WHERE user_id = auth.uid() AND (role_type = 'farm_owner' OR role_type = 'farm_manager')
    )
  );

-- RLS Policy: Only farm owners and managers can insert
CREATE POLICY "Only farm owners and managers can assign policies"
  ON team_member_policy_assignments
  FOR INSERT
  WITH CHECK (
    farm_id IN (
      SELECT farm_id FROM user_roles
      WHERE user_id = auth.uid() AND (role_type = 'farm_owner' OR role_type = 'farm_manager')
    )
  );

-- RLS Policy: Only farm owners and managers can delete
CREATE POLICY "Only farm owners and managers can revoke policies"
  ON team_member_policy_assignments
  FOR DELETE
  USING (
    farm_id IN (
      SELECT farm_id FROM user_roles
      WHERE user_id = auth.uid() AND (role_type = 'farm_owner' OR role_type = 'farm_manager')
    )
  );
