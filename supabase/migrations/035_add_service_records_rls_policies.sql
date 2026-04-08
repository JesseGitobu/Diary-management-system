-- Add RLS policies for service_records table.
-- The table already has RLS enabled but no INSERT/UPDATE/DELETE policies,
-- which blocks all writes from the session-based (anon key) client.

-- Allow farm owners and managers to SELECT their farm's records
CREATE POLICY "Farm members can view service records"
  ON service_records FOR SELECT
  USING (
    farm_id IN (
      SELECT farm_id FROM user_roles
      WHERE user_id = auth.uid()
    )
  );

-- Allow farm owners and managers to INSERT service records
CREATE POLICY "Farm owners and managers can insert service records"
  ON service_records FOR INSERT
  WITH CHECK (
    farm_id IN (
      SELECT farm_id FROM user_roles
      WHERE user_id = auth.uid()
        AND role_type IN ('farm_owner', 'farm_manager')
    )
  );

-- Allow farm owners and managers to UPDATE service records
CREATE POLICY "Farm owners and managers can update service records"
  ON service_records FOR UPDATE
  USING (
    farm_id IN (
      SELECT farm_id FROM user_roles
      WHERE user_id = auth.uid()
        AND role_type IN ('farm_owner', 'farm_manager')
    )
  );

-- Allow farm owners and managers to DELETE service records
CREATE POLICY "Farm owners and managers can delete service records"
  ON service_records FOR DELETE
  USING (
    farm_id IN (
      SELECT farm_id FROM user_roles
      WHERE user_id = auth.uid()
        AND role_type IN ('farm_owner', 'farm_manager')
    )
  );
