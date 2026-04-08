-- Migration 036: Add RLS policies for all animal import tables
-- Tables: animals, animal_purchases, animal_weight_records, animal_release_records,
--         breeding_events, pregnancy_records, calving_records, calf_records,
--         lactation_cycle_records
--
-- Pattern:
--   SELECT  → all farm members (any role in user_roles for this farm)
--   INSERT  → farm_owner + farm_manager only
--   UPDATE  → farm_owner + farm_manager only
--   DELETE  → farm_owner + farm_manager only

-- ─────────────────────────────────────────────────────────────────────────────
-- HELPER: reusable subqueries (inline — no functions needed)
-- ─────────────────────────────────────────────────────────────────────────────

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. animals
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE animals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farm members can view animals" ON animals;
DROP POLICY IF EXISTS "Farm owners and managers can insert animals" ON animals;
DROP POLICY IF EXISTS "Farm owners and managers can update animals" ON animals;
DROP POLICY IF EXISTS "Farm owners and managers can delete animals" ON animals;

CREATE POLICY "Farm members can view animals"
  ON animals FOR SELECT
  USING (
    farm_id IN (
      SELECT farm_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Farm owners and managers can insert animals"
  ON animals FOR INSERT
  WITH CHECK (
    farm_id IN (
      SELECT farm_id FROM user_roles
      WHERE user_id = auth.uid()
        AND role_type IN ('farm_owner', 'farm_manager')
    )
  );

CREATE POLICY "Farm owners and managers can update animals"
  ON animals FOR UPDATE
  USING (
    farm_id IN (
      SELECT farm_id FROM user_roles
      WHERE user_id = auth.uid()
        AND role_type IN ('farm_owner', 'farm_manager')
    )
  );

CREATE POLICY "Farm owners and managers can delete animals"
  ON animals FOR DELETE
  USING (
    farm_id IN (
      SELECT farm_id FROM user_roles
      WHERE user_id = auth.uid()
        AND role_type IN ('farm_owner', 'farm_manager')
    )
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. animal_purchases
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE animal_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farm members can view animal purchases" ON animal_purchases;
DROP POLICY IF EXISTS "Farm owners and managers can insert animal purchases" ON animal_purchases;
DROP POLICY IF EXISTS "Farm owners and managers can update animal purchases" ON animal_purchases;
DROP POLICY IF EXISTS "Farm owners and managers can delete animal purchases" ON animal_purchases;

CREATE POLICY "Farm members can view animal purchases"
  ON animal_purchases FOR SELECT
  USING (
    farm_id IN (
      SELECT farm_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Farm owners and managers can insert animal purchases"
  ON animal_purchases FOR INSERT
  WITH CHECK (
    farm_id IN (
      SELECT farm_id FROM user_roles
      WHERE user_id = auth.uid()
        AND role_type IN ('farm_owner', 'farm_manager')
    )
  );

CREATE POLICY "Farm owners and managers can update animal purchases"
  ON animal_purchases FOR UPDATE
  USING (
    farm_id IN (
      SELECT farm_id FROM user_roles
      WHERE user_id = auth.uid()
        AND role_type IN ('farm_owner', 'farm_manager')
    )
  );

CREATE POLICY "Farm owners and managers can delete animal purchases"
  ON animal_purchases FOR DELETE
  USING (
    farm_id IN (
      SELECT farm_id FROM user_roles
      WHERE user_id = auth.uid()
        AND role_type IN ('farm_owner', 'farm_manager')
    )
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. animal_weight_records
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE animal_weight_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farm members can view animal weight records" ON animal_weight_records;
DROP POLICY IF EXISTS "Farm owners and managers can insert animal weight records" ON animal_weight_records;
DROP POLICY IF EXISTS "Farm owners and managers can update animal weight records" ON animal_weight_records;
DROP POLICY IF EXISTS "Farm owners and managers can delete animal weight records" ON animal_weight_records;

CREATE POLICY "Farm members can view animal weight records"
  ON animal_weight_records FOR SELECT
  USING (
    farm_id IN (
      SELECT farm_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Farm owners and managers can insert animal weight records"
  ON animal_weight_records FOR INSERT
  WITH CHECK (
    farm_id IN (
      SELECT farm_id FROM user_roles
      WHERE user_id = auth.uid()
        AND role_type IN ('farm_owner', 'farm_manager')
    )
  );

CREATE POLICY "Farm owners and managers can update animal weight records"
  ON animal_weight_records FOR UPDATE
  USING (
    farm_id IN (
      SELECT farm_id FROM user_roles
      WHERE user_id = auth.uid()
        AND role_type IN ('farm_owner', 'farm_manager')
    )
  );

CREATE POLICY "Farm owners and managers can delete animal weight records"
  ON animal_weight_records FOR DELETE
  USING (
    farm_id IN (
      SELECT farm_id FROM user_roles
      WHERE user_id = auth.uid()
        AND role_type IN ('farm_owner', 'farm_manager')
    )
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. animal_release_records
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE animal_release_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farm members can view animal release records" ON animal_release_records;
DROP POLICY IF EXISTS "Farm owners and managers can insert animal release records" ON animal_release_records;
DROP POLICY IF EXISTS "Farm owners and managers can update animal release records" ON animal_release_records;
DROP POLICY IF EXISTS "Farm owners and managers can delete animal release records" ON animal_release_records;

CREATE POLICY "Farm members can view animal release records"
  ON animal_release_records FOR SELECT
  USING (
    farm_id IN (
      SELECT farm_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Farm owners and managers can insert animal release records"
  ON animal_release_records FOR INSERT
  WITH CHECK (
    farm_id IN (
      SELECT farm_id FROM user_roles
      WHERE user_id = auth.uid()
        AND role_type IN ('farm_owner', 'farm_manager')
    )
  );

CREATE POLICY "Farm owners and managers can update animal release records"
  ON animal_release_records FOR UPDATE
  USING (
    farm_id IN (
      SELECT farm_id FROM user_roles
      WHERE user_id = auth.uid()
        AND role_type IN ('farm_owner', 'farm_manager')
    )
  );

CREATE POLICY "Farm owners and managers can delete animal release records"
  ON animal_release_records FOR DELETE
  USING (
    farm_id IN (
      SELECT farm_id FROM user_roles
      WHERE user_id = auth.uid()
        AND role_type IN ('farm_owner', 'farm_manager')
    )
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. breeding_events
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE breeding_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farm members can view breeding events" ON breeding_events;
DROP POLICY IF EXISTS "Farm owners and managers can insert breeding events" ON breeding_events;
DROP POLICY IF EXISTS "Farm owners and managers can update breeding events" ON breeding_events;
DROP POLICY IF EXISTS "Farm owners and managers can delete breeding events" ON breeding_events;

CREATE POLICY "Farm members can view breeding events"
  ON breeding_events FOR SELECT
  USING (
    farm_id IN (
      SELECT farm_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Farm owners and managers can insert breeding events"
  ON breeding_events FOR INSERT
  WITH CHECK (
    farm_id IN (
      SELECT farm_id FROM user_roles
      WHERE user_id = auth.uid()
        AND role_type IN ('farm_owner', 'farm_manager')
    )
  );

CREATE POLICY "Farm owners and managers can update breeding events"
  ON breeding_events FOR UPDATE
  USING (
    farm_id IN (
      SELECT farm_id FROM user_roles
      WHERE user_id = auth.uid()
        AND role_type IN ('farm_owner', 'farm_manager')
    )
  );

CREATE POLICY "Farm owners and managers can delete breeding events"
  ON breeding_events FOR DELETE
  USING (
    farm_id IN (
      SELECT farm_id FROM user_roles
      WHERE user_id = auth.uid()
        AND role_type IN ('farm_owner', 'farm_manager')
    )
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- 6. pregnancy_records
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE pregnancy_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farm members can view pregnancy records" ON pregnancy_records;
DROP POLICY IF EXISTS "Farm owners and managers can insert pregnancy records" ON pregnancy_records;
DROP POLICY IF EXISTS "Farm owners and managers can update pregnancy records" ON pregnancy_records;
DROP POLICY IF EXISTS "Farm owners and managers can delete pregnancy records" ON pregnancy_records;

CREATE POLICY "Farm members can view pregnancy records"
  ON pregnancy_records FOR SELECT
  USING (
    farm_id IN (
      SELECT farm_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Farm owners and managers can insert pregnancy records"
  ON pregnancy_records FOR INSERT
  WITH CHECK (
    farm_id IN (
      SELECT farm_id FROM user_roles
      WHERE user_id = auth.uid()
        AND role_type IN ('farm_owner', 'farm_manager')
    )
  );

CREATE POLICY "Farm owners and managers can update pregnancy records"
  ON pregnancy_records FOR UPDATE
  USING (
    farm_id IN (
      SELECT farm_id FROM user_roles
      WHERE user_id = auth.uid()
        AND role_type IN ('farm_owner', 'farm_manager')
    )
  );

CREATE POLICY "Farm owners and managers can delete pregnancy records"
  ON pregnancy_records FOR DELETE
  USING (
    farm_id IN (
      SELECT farm_id FROM user_roles
      WHERE user_id = auth.uid()
        AND role_type IN ('farm_owner', 'farm_manager')
    )
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- 7. calving_records
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE calving_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farm members can view calving records" ON calving_records;
DROP POLICY IF EXISTS "Farm owners and managers can insert calving records" ON calving_records;
DROP POLICY IF EXISTS "Farm owners and managers can update calving records" ON calving_records;
DROP POLICY IF EXISTS "Farm owners and managers can delete calving records" ON calving_records;

CREATE POLICY "Farm members can view calving records"
  ON calving_records FOR SELECT
  USING (
    farm_id IN (
      SELECT farm_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Farm owners and managers can insert calving records"
  ON calving_records FOR INSERT
  WITH CHECK (
    farm_id IN (
      SELECT farm_id FROM user_roles
      WHERE user_id = auth.uid()
        AND role_type IN ('farm_owner', 'farm_manager')
    )
  );

CREATE POLICY "Farm owners and managers can update calving records"
  ON calving_records FOR UPDATE
  USING (
    farm_id IN (
      SELECT farm_id FROM user_roles
      WHERE user_id = auth.uid()
        AND role_type IN ('farm_owner', 'farm_manager')
    )
  );

CREATE POLICY "Farm owners and managers can delete calving records"
  ON calving_records FOR DELETE
  USING (
    farm_id IN (
      SELECT farm_id FROM user_roles
      WHERE user_id = auth.uid()
        AND role_type IN ('farm_owner', 'farm_manager')
    )
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- 8. calf_records
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE calf_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farm members can view calf records" ON calf_records;
DROP POLICY IF EXISTS "Farm owners and managers can insert calf records" ON calf_records;
DROP POLICY IF EXISTS "Farm owners and managers can update calf records" ON calf_records;
DROP POLICY IF EXISTS "Farm owners and managers can delete calf records" ON calf_records;

CREATE POLICY "Farm members can view calf records"
  ON calf_records FOR SELECT
  USING (
    farm_id IN (
      SELECT farm_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Farm owners and managers can insert calf records"
  ON calf_records FOR INSERT
  WITH CHECK (
    farm_id IN (
      SELECT farm_id FROM user_roles
      WHERE user_id = auth.uid()
        AND role_type IN ('farm_owner', 'farm_manager')
    )
  );

CREATE POLICY "Farm owners and managers can update calf records"
  ON calf_records FOR UPDATE
  USING (
    farm_id IN (
      SELECT farm_id FROM user_roles
      WHERE user_id = auth.uid()
        AND role_type IN ('farm_owner', 'farm_manager')
    )
  );

CREATE POLICY "Farm owners and managers can delete calf records"
  ON calf_records FOR DELETE
  USING (
    farm_id IN (
      SELECT farm_id FROM user_roles
      WHERE user_id = auth.uid()
        AND role_type IN ('farm_owner', 'farm_manager')
    )
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- 9. lactation_cycle_records
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE lactation_cycle_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farm members can view lactation cycle records" ON lactation_cycle_records;
DROP POLICY IF EXISTS "Farm owners and managers can insert lactation cycle records" ON lactation_cycle_records;
DROP POLICY IF EXISTS "Farm owners and managers can update lactation cycle records" ON lactation_cycle_records;
DROP POLICY IF EXISTS "Farm owners and managers can delete lactation cycle records" ON lactation_cycle_records;

CREATE POLICY "Farm members can view lactation cycle records"
  ON lactation_cycle_records FOR SELECT
  USING (
    farm_id IN (
      SELECT farm_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Farm owners and managers can insert lactation cycle records"
  ON lactation_cycle_records FOR INSERT
  WITH CHECK (
    farm_id IN (
      SELECT farm_id FROM user_roles
      WHERE user_id = auth.uid()
        AND role_type IN ('farm_owner', 'farm_manager')
    )
  );

CREATE POLICY "Farm owners and managers can update lactation cycle records"
  ON lactation_cycle_records FOR UPDATE
  USING (
    farm_id IN (
      SELECT farm_id FROM user_roles
      WHERE user_id = auth.uid()
        AND role_type IN ('farm_owner', 'farm_manager')
    )
  );

CREATE POLICY "Farm owners and managers can delete lactation cycle records"
  ON lactation_cycle_records FOR DELETE
  USING (
    farm_id IN (
      SELECT farm_id FROM user_roles
      WHERE user_id = auth.uid()
        AND role_type IN ('farm_owner', 'farm_manager')
    )
  );
