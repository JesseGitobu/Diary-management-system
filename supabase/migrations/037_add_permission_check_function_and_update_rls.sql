-- Migration 037: Replace blunt role-type RLS checks with policy-aware permission function
--
-- PROBLEM:
--   Migration 036 only allowed farm_owner/farm_manager to INSERT/UPDATE/DELETE.
--   Workers and veterinarians with granted access control policies were still blocked
--   at the database level, even if the app had resolved their permissions correctly.
--
-- SOLUTION:
--   1. Create check_farm_permission(farm_id, resource, action_category) — a
--      SECURITY DEFINER function that mirrors the getUserPermissions() resolution
--      chain from src/lib/database/user-permissions.ts:
--        Step 1: individual policy assigned via team_member_policy_assignments
--        Step 2: role-type default policy for the farm
--        Step 3: farm_owner / farm_manager → always true (no policy needed)
--        Step 4: everyone else → false
--
--   2. Replace the INSERT / UPDATE / DELETE policies on all 9 import tables
--      (and service_records from migration 035) to call this function instead
--      of doing a raw role_type check.
--
-- RESOURCE → TABLE MAPPING:
--   animals resource  → animals, animal_purchases, animal_weight_records,
--                        animal_release_records
--   breeding resource → service_records, breeding_events, pregnancy_records,
--                        calving_records, calf_records, lactation_cycle_records


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1: Create the check_farm_permission helper function
-- ─────────────────────────────────────────────────────────────────────────────
-- SECURITY DEFINER: runs as the function owner (postgres), so it can read
-- user_roles, team_member_policy_assignments, access_control_policies, and
-- policy_operation_grants / resource_operations without being blocked by their
-- own RLS policies. The calling user's auth.uid() is still available inside.

CREATE OR REPLACE FUNCTION check_farm_permission(
  p_farm_id        UUID,
  p_resource       TEXT,
  p_action_category TEXT   -- 'view' | 'create' | 'edit' | 'delete' | 'export'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_user_role_id   UUID;
  v_role_type      TEXT;
  v_policy_id      UUID;
  v_has_grant      BOOLEAN := FALSE;
BEGIN
  -- ── Step 0: resolve the calling user's role for this farm ─────────────────
  SELECT id, role_type
    INTO v_user_role_id, v_role_type
    FROM user_roles
   WHERE user_id = auth.uid()
     AND farm_id = p_farm_id
   LIMIT 1;

  -- Not a member of this farm → deny immediately
  IF v_user_role_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- ── Step 3 (fast path): farm_owner and farm_manager always have full access ─
  IF v_role_type IN ('farm_owner', 'farm_manager') THEN
    RETURN TRUE;
  END IF;

  -- ── Step 1: check individually assigned policy ────────────────────────────
  SELECT tmpa.policy_id
    INTO v_policy_id
    FROM team_member_policy_assignments tmpa
    JOIN access_control_policies acp
      ON acp.id = tmpa.policy_id
     AND acp.is_granted = TRUE
   WHERE tmpa.farm_id   = p_farm_id
     AND tmpa.user_role_id = v_user_role_id
   LIMIT 1;

  IF v_policy_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
        FROM policy_operation_grants pog
        JOIN resource_operations     ro
          ON ro.resource      = pog.resource
         AND ro.operation_key = pog.operation_key
       WHERE pog.policy_id      = v_policy_id
         AND pog.resource       = p_resource
         AND ro.action_category = p_action_category
         AND ro.is_active       = TRUE
    ) INTO v_has_grant;

    IF v_has_grant THEN
      RETURN TRUE;
    END IF;
  END IF;

  -- ── Step 2: fall back to the role-type default policy for this farm ────────
  SELECT acp.id
    INTO v_policy_id
    FROM access_control_policies acp
   WHERE acp.farm_id    = p_farm_id
     AND acp.role_type  = v_role_type
     AND acp.is_granted = TRUE
   LIMIT 1;

  IF v_policy_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
        FROM policy_operation_grants pog
        JOIN resource_operations     ro
          ON ro.resource      = pog.resource
         AND ro.operation_key = pog.operation_key
       WHERE pog.policy_id      = v_policy_id
         AND pog.resource       = p_resource
         AND ro.action_category = p_action_category
         AND ro.is_active       = TRUE
    ) INTO v_has_grant;

    IF v_has_grant THEN
      RETURN TRUE;
    END IF;
  END IF;

  -- ── Step 4: deny by default ───────────────────────────────────────────────
  RETURN FALSE;
END;
$$;

-- Grant execute to the authenticated role so RLS policies can call it
GRANT EXECUTE ON FUNCTION check_farm_permission(UUID, TEXT, TEXT)
  TO authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: Replace INSERT / UPDATE / DELETE policies on all 9 import tables
--         and service_records to use check_farm_permission().
--
-- SELECT policies remain unchanged (any farm member can read — no per-operation
-- grant needed for reads; view access is enforced at the component level).
-- ─────────────────────────────────────────────────────────────────────────────


-- ══════════════════════════════════════════════════════════════════════════════
-- animals  (resource: 'animals')
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Farm owners and managers can insert animals"     ON animals;
DROP POLICY IF EXISTS "Farm owners and managers can update animals"     ON animals;
DROP POLICY IF EXISTS "Farm owners and managers can delete animals"     ON animals;

CREATE POLICY "Farm members with permission can insert animals"
  ON animals FOR INSERT
  WITH CHECK ( check_farm_permission(farm_id, 'animals', 'create') );

CREATE POLICY "Farm members with permission can update animals"
  ON animals FOR UPDATE
  USING ( check_farm_permission(farm_id, 'animals', 'edit') );

CREATE POLICY "Farm members with permission can delete animals"
  ON animals FOR DELETE
  USING ( check_farm_permission(farm_id, 'animals', 'delete') );


-- ══════════════════════════════════════════════════════════════════════════════
-- animal_purchases  (resource: 'animals' — add_purchased = 'create')
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Farm owners and managers can insert animal purchases"  ON animal_purchases;
DROP POLICY IF EXISTS "Farm owners and managers can update animal purchases"  ON animal_purchases;
DROP POLICY IF EXISTS "Farm owners and managers can delete animal purchases"  ON animal_purchases;

CREATE POLICY "Farm members with permission can insert animal purchases"
  ON animal_purchases FOR INSERT
  WITH CHECK ( check_farm_permission(farm_id, 'animals', 'create') );

CREATE POLICY "Farm members with permission can update animal purchases"
  ON animal_purchases FOR UPDATE
  USING ( check_farm_permission(farm_id, 'animals', 'edit') );

CREATE POLICY "Farm members with permission can delete animal purchases"
  ON animal_purchases FOR DELETE
  USING ( check_farm_permission(farm_id, 'animals', 'delete') );


-- ══════════════════════════════════════════════════════════════════════════════
-- animal_weight_records  (resource: 'animals' — update_weight = 'edit')
-- INSERT maps to 'edit' because recording a weight IS an edit operation
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Farm owners and managers can insert animal weight records"  ON animal_weight_records;
DROP POLICY IF EXISTS "Farm owners and managers can update animal weight records"  ON animal_weight_records;
DROP POLICY IF EXISTS "Farm owners and managers can delete animal weight records"  ON animal_weight_records;

CREATE POLICY "Farm members with permission can insert animal weight records"
  ON animal_weight_records FOR INSERT
  WITH CHECK ( check_farm_permission(farm_id, 'animals', 'edit') );

CREATE POLICY "Farm members with permission can update animal weight records"
  ON animal_weight_records FOR UPDATE
  USING ( check_farm_permission(farm_id, 'animals', 'edit') );

CREATE POLICY "Farm members with permission can delete animal weight records"
  ON animal_weight_records FOR DELETE
  USING ( check_farm_permission(farm_id, 'animals', 'delete') );


-- ══════════════════════════════════════════════════════════════════════════════
-- animal_release_records  (resource: 'animals' — release = 'edit')
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Farm owners and managers can insert animal release records"  ON animal_release_records;
DROP POLICY IF EXISTS "Farm owners and managers can update animal release records"  ON animal_release_records;
DROP POLICY IF EXISTS "Farm owners and managers can delete animal release records"  ON animal_release_records;

CREATE POLICY "Farm members with permission can insert animal release records"
  ON animal_release_records FOR INSERT
  WITH CHECK ( check_farm_permission(farm_id, 'animals', 'edit') );

CREATE POLICY "Farm members with permission can update animal release records"
  ON animal_release_records FOR UPDATE
  USING ( check_farm_permission(farm_id, 'animals', 'edit') );

CREATE POLICY "Farm members with permission can delete animal release records"
  ON animal_release_records FOR DELETE
  USING ( check_farm_permission(farm_id, 'animals', 'delete') );


-- ══════════════════════════════════════════════════════════════════════════════
-- service_records  (resource: 'breeding' — record_insemination = 'create')
-- Replaces the blunt policies from migration 035
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Farm owners and managers can insert service records"  ON service_records;
DROP POLICY IF EXISTS "Farm owners and managers can update service records"  ON service_records;
DROP POLICY IF EXISTS "Farm owners and managers can delete service records"  ON service_records;

CREATE POLICY "Farm members with permission can insert service records"
  ON service_records FOR INSERT
  WITH CHECK ( check_farm_permission(farm_id, 'breeding', 'create') );

CREATE POLICY "Farm members with permission can update service records"
  ON service_records FOR UPDATE
  USING ( check_farm_permission(farm_id, 'breeding', 'edit') );

CREATE POLICY "Farm members with permission can delete service records"
  ON service_records FOR DELETE
  USING ( check_farm_permission(farm_id, 'breeding', 'delete') );


-- ══════════════════════════════════════════════════════════════════════════════
-- breeding_events  (resource: 'breeding')
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Farm owners and managers can insert breeding events"  ON breeding_events;
DROP POLICY IF EXISTS "Farm owners and managers can update breeding events"  ON breeding_events;
DROP POLICY IF EXISTS "Farm owners and managers can delete breeding events"  ON breeding_events;

CREATE POLICY "Farm members with permission can insert breeding events"
  ON breeding_events FOR INSERT
  WITH CHECK ( check_farm_permission(farm_id, 'breeding', 'create') );

CREATE POLICY "Farm members with permission can update breeding events"
  ON breeding_events FOR UPDATE
  USING ( check_farm_permission(farm_id, 'breeding', 'edit') );

CREATE POLICY "Farm members with permission can delete breeding events"
  ON breeding_events FOR DELETE
  USING ( check_farm_permission(farm_id, 'breeding', 'delete') );


-- ══════════════════════════════════════════════════════════════════════════════
-- pregnancy_records  (resource: 'breeding')
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Farm owners and managers can insert pregnancy records"  ON pregnancy_records;
DROP POLICY IF EXISTS "Farm owners and managers can update pregnancy records"  ON pregnancy_records;
DROP POLICY IF EXISTS "Farm owners and managers can delete pregnancy records"  ON pregnancy_records;

CREATE POLICY "Farm members with permission can insert pregnancy records"
  ON pregnancy_records FOR INSERT
  WITH CHECK ( check_farm_permission(farm_id, 'breeding', 'create') );

CREATE POLICY "Farm members with permission can update pregnancy records"
  ON pregnancy_records FOR UPDATE
  USING ( check_farm_permission(farm_id, 'breeding', 'edit') );

CREATE POLICY "Farm members with permission can delete pregnancy records"
  ON pregnancy_records FOR DELETE
  USING ( check_farm_permission(farm_id, 'breeding', 'delete') );


-- ══════════════════════════════════════════════════════════════════════════════
-- calving_records  (resource: 'breeding' — record_calving = 'create')
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Farm owners and managers can insert calving records"  ON calving_records;
DROP POLICY IF EXISTS "Farm owners and managers can update calving records"  ON calving_records;
DROP POLICY IF EXISTS "Farm owners and managers can delete calving records"  ON calving_records;

CREATE POLICY "Farm members with permission can insert calving records"
  ON calving_records FOR INSERT
  WITH CHECK ( check_farm_permission(farm_id, 'breeding', 'create') );

CREATE POLICY "Farm members with permission can update calving records"
  ON calving_records FOR UPDATE
  USING ( check_farm_permission(farm_id, 'breeding', 'edit') );

CREATE POLICY "Farm members with permission can delete calving records"
  ON calving_records FOR DELETE
  USING ( check_farm_permission(farm_id, 'breeding', 'delete') );


-- ══════════════════════════════════════════════════════════════════════════════
-- calf_records  (resource: 'breeding' — register_calf = 'create')
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Farm owners and managers can insert calf records"  ON calf_records;
DROP POLICY IF EXISTS "Farm owners and managers can update calf records"  ON calf_records;
DROP POLICY IF EXISTS "Farm owners and managers can delete calf records"  ON calf_records;

CREATE POLICY "Farm members with permission can insert calf records"
  ON calf_records FOR INSERT
  WITH CHECK ( check_farm_permission(farm_id, 'breeding', 'create') );

CREATE POLICY "Farm members with permission can update calf records"
  ON calf_records FOR UPDATE
  USING ( check_farm_permission(farm_id, 'breeding', 'edit') );

CREATE POLICY "Farm members with permission can delete calf records"
  ON calf_records FOR DELETE
  USING ( check_farm_permission(farm_id, 'breeding', 'delete') );


-- ══════════════════════════════════════════════════════════════════════════════
-- lactation_cycle_records  (resource: 'breeding')
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Farm owners and managers can insert lactation cycle records"  ON lactation_cycle_records;
DROP POLICY IF EXISTS "Farm owners and managers can update lactation cycle records"  ON lactation_cycle_records;
DROP POLICY IF EXISTS "Farm owners and managers can delete lactation cycle records"  ON lactation_cycle_records;

CREATE POLICY "Farm members with permission can insert lactation cycle records"
  ON lactation_cycle_records FOR INSERT
  WITH CHECK ( check_farm_permission(farm_id, 'breeding', 'create') );

CREATE POLICY "Farm members with permission can update lactation cycle records"
  ON lactation_cycle_records FOR UPDATE
  USING ( check_farm_permission(farm_id, 'breeding', 'edit') );

CREATE POLICY "Farm members with permission can delete lactation cycle records"
  ON lactation_cycle_records FOR DELETE
  USING ( check_farm_permission(farm_id, 'breeding', 'delete') );
