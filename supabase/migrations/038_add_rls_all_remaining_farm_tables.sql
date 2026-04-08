-- Migration 038: RLS policies for all remaining farm-specific tables
--
-- Depends on: migration 037 (check_farm_permission function must exist)
--
-- Covers every farm-specific table NOT already handled in migrations 035-037.
-- Organised by module. Pattern for each table:
--   SELECT  → any farm member (no operation grant needed; view gated in UI)
--   INSERT  → check_farm_permission(farm_id, '<resource>', 'create')
--   UPDATE  → check_farm_permission(farm_id, '<resource>', 'edit')
--   DELETE  → check_farm_permission(farm_id, '<resource>', 'delete')
--
-- For junction tables without a direct farm_id column, farm_id is resolved
-- through the parent table using an EXISTS subquery.
--
-- Settings tables always map to resource 'settings', action_category 'edit'
-- (only farm_owner / farm_manager get this via the fast-path in the function).


-- ─────────────────────────────────────────────────────────────────────────────
-- MODULE: HEALTH
-- ─────────────────────────────────────────────────────────────────────────────

-- ── animal_health_records ────────────────────────────────────────────────────
ALTER TABLE animal_health_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view animal health records"                  ON animal_health_records;
DROP POLICY IF EXISTS "Farm members with permission can insert animal health records" ON animal_health_records;
DROP POLICY IF EXISTS "Farm members with permission can update animal health records" ON animal_health_records;
DROP POLICY IF EXISTS "Farm members with permission can delete animal health records" ON animal_health_records;

CREATE POLICY "Farm members can view animal health records"
  ON animal_health_records FOR SELECT
  USING (farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Farm members with permission can insert animal health records"
  ON animal_health_records FOR INSERT
  WITH CHECK (check_farm_permission(farm_id, 'health', 'create'));

CREATE POLICY "Farm members with permission can update animal health records"
  ON animal_health_records FOR UPDATE
  USING (check_farm_permission(farm_id, 'health', 'edit'));

CREATE POLICY "Farm members with permission can delete animal health records"
  ON animal_health_records FOR DELETE
  USING (check_farm_permission(farm_id, 'health', 'delete'));


-- ── health_record_follow_ups (no farm_id — links via original_record_id) ─────
-- Columns: id, original_record_id, follow_up_record_id, status, is_resolved, etc.
ALTER TABLE health_record_follow_ups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view health record follow ups"                  ON health_record_follow_ups;
DROP POLICY IF EXISTS "Farm members with permission can insert health record follow ups" ON health_record_follow_ups;
DROP POLICY IF EXISTS "Farm members with permission can update health record follow ups" ON health_record_follow_ups;
DROP POLICY IF EXISTS "Farm members with permission can delete health record follow ups" ON health_record_follow_ups;

CREATE POLICY "Farm members can view health record follow ups"
  ON health_record_follow_ups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM animal_health_records ahr
      WHERE ahr.id = original_record_id
        AND ahr.farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Farm members with permission can insert health record follow ups"
  ON health_record_follow_ups FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM animal_health_records ahr
      WHERE ahr.id = original_record_id
        AND check_farm_permission(ahr.farm_id, 'health', 'create')
    )
  );

CREATE POLICY "Farm members with permission can update health record follow ups"
  ON health_record_follow_ups FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM animal_health_records ahr
      WHERE ahr.id = original_record_id
        AND check_farm_permission(ahr.farm_id, 'health', 'edit')
    )
  );

CREATE POLICY "Farm members with permission can delete health record follow ups"
  ON health_record_follow_ups FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM animal_health_records ahr
      WHERE ahr.id = original_record_id
        AND check_farm_permission(ahr.farm_id, 'health', 'delete')
    )
  );


-- ── health_record_images (links via animal_health_records.farm_id) ───────────
ALTER TABLE health_record_images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view health record images"                  ON health_record_images;
DROP POLICY IF EXISTS "Farm members with permission can insert health record images" ON health_record_images;
DROP POLICY IF EXISTS "Farm members with permission can delete health record images" ON health_record_images;

CREATE POLICY "Farm members can view health record images"
  ON health_record_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM animal_health_records ahr
      WHERE ahr.id = health_record_id
        AND ahr.farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Farm members with permission can insert health record images"
  ON health_record_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM animal_health_records ahr
      WHERE ahr.id = health_record_id
        AND check_farm_permission(ahr.farm_id, 'health', 'create')
    )
  );

CREATE POLICY "Farm members with permission can delete health record images"
  ON health_record_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM animal_health_records ahr
      WHERE ahr.id = health_record_id
        AND check_farm_permission(ahr.farm_id, 'health', 'delete')
    )
  );


-- ── health_issues ────────────────────────────────────────────────────────────
ALTER TABLE health_issues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view health issues"                  ON health_issues;
DROP POLICY IF EXISTS "Farm members with permission can insert health issues" ON health_issues;
DROP POLICY IF EXISTS "Farm members with permission can update health issues" ON health_issues;
DROP POLICY IF EXISTS "Farm members with permission can delete health issues" ON health_issues;

CREATE POLICY "Farm members can view health issues"
  ON health_issues FOR SELECT
  USING (farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Farm members with permission can insert health issues"
  ON health_issues FOR INSERT
  WITH CHECK (check_farm_permission(farm_id, 'health', 'create'));

CREATE POLICY "Farm members with permission can update health issues"
  ON health_issues FOR UPDATE
  USING (check_farm_permission(farm_id, 'health', 'edit'));

CREATE POLICY "Farm members with permission can delete health issues"
  ON health_issues FOR DELETE
  USING (check_farm_permission(farm_id, 'health', 'delete'));


-- ── animal_health_status_log ─────────────────────────────────────────────────
ALTER TABLE animal_health_status_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view animal health status log"                  ON animal_health_status_log;
DROP POLICY IF EXISTS "Farm members with permission can insert animal health status log" ON animal_health_status_log;
DROP POLICY IF EXISTS "Farm members with permission can update animal health status log" ON animal_health_status_log;
DROP POLICY IF EXISTS "Farm members with permission can delete animal health status log" ON animal_health_status_log;

CREATE POLICY "Farm members can view animal health status log"
  ON animal_health_status_log FOR SELECT
  USING (farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Farm members with permission can insert animal health status log"
  ON animal_health_status_log FOR INSERT
  WITH CHECK (check_farm_permission(farm_id, 'health', 'create'));

CREATE POLICY "Farm members with permission can update animal health status log"
  ON animal_health_status_log FOR UPDATE
  USING (check_farm_permission(farm_id, 'health', 'edit'));

CREATE POLICY "Farm members with permission can delete animal health status log"
  ON animal_health_status_log FOR DELETE
  USING (check_farm_permission(farm_id, 'health', 'delete'));


-- NOTE: animal_health_status_attention is a VIEW — RLS cannot be applied to views.
-- Access is inherited from the underlying animal_health_records table.


-- ── disease_outbreaks ────────────────────────────────────────────────────────
ALTER TABLE disease_outbreaks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view disease outbreaks"                  ON disease_outbreaks;
DROP POLICY IF EXISTS "Farm members with permission can insert disease outbreaks" ON disease_outbreaks;
DROP POLICY IF EXISTS "Farm members with permission can update disease outbreaks" ON disease_outbreaks;
DROP POLICY IF EXISTS "Farm members with permission can delete disease outbreaks" ON disease_outbreaks;

CREATE POLICY "Farm members can view disease outbreaks"
  ON disease_outbreaks FOR SELECT
  USING (farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Farm members with permission can insert disease outbreaks"
  ON disease_outbreaks FOR INSERT
  WITH CHECK (check_farm_permission(farm_id, 'health', 'create'));

CREATE POLICY "Farm members with permission can update disease outbreaks"
  ON disease_outbreaks FOR UPDATE
  USING (check_farm_permission(farm_id, 'health', 'edit'));

CREATE POLICY "Farm members with permission can delete disease outbreaks"
  ON disease_outbreaks FOR DELETE
  USING (check_farm_permission(farm_id, 'health', 'delete'));


-- ── animal_disease_records ───────────────────────────────────────────────────
ALTER TABLE animal_disease_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view animal disease records"                  ON animal_disease_records;
DROP POLICY IF EXISTS "Farm members with permission can insert animal disease records" ON animal_disease_records;
DROP POLICY IF EXISTS "Farm members with permission can update animal disease records" ON animal_disease_records;
DROP POLICY IF EXISTS "Farm members with permission can delete animal disease records" ON animal_disease_records;

CREATE POLICY "Farm members can view animal disease records"
  ON animal_disease_records FOR SELECT
  USING (farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Farm members with permission can insert animal disease records"
  ON animal_disease_records FOR INSERT
  WITH CHECK (check_farm_permission(farm_id, 'health', 'create'));

CREATE POLICY "Farm members with permission can update animal disease records"
  ON animal_disease_records FOR UPDATE
  USING (check_farm_permission(farm_id, 'health', 'edit'));

CREATE POLICY "Farm members with permission can delete animal disease records"
  ON animal_disease_records FOR DELETE
  USING (check_farm_permission(farm_id, 'health', 'delete'));


-- ── outbreak_animals (no farm_id — resolves via disease_outbreaks) ───────────
ALTER TABLE outbreak_animals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view outbreak animals"                  ON outbreak_animals;
DROP POLICY IF EXISTS "Farm members with permission can insert outbreak animals" ON outbreak_animals;
DROP POLICY IF EXISTS "Farm members with permission can delete outbreak animals" ON outbreak_animals;

CREATE POLICY "Farm members can view outbreak animals"
  ON outbreak_animals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM disease_outbreaks o
      WHERE o.id = outbreak_id
        AND o.farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Farm members with permission can insert outbreak animals"
  ON outbreak_animals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM disease_outbreaks o
      WHERE o.id = outbreak_id
        AND check_farm_permission(o.farm_id, 'health', 'create')
    )
  );

CREATE POLICY "Farm members with permission can delete outbreak animals"
  ON outbreak_animals FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM disease_outbreaks o
      WHERE o.id = outbreak_id
        AND check_farm_permission(o.farm_id, 'health', 'delete')
    )
  );


-- ── health_protocols ─────────────────────────────────────────────────────────
ALTER TABLE health_protocols ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view health protocols"                  ON health_protocols;
DROP POLICY IF EXISTS "Farm members with permission can insert health protocols" ON health_protocols;
DROP POLICY IF EXISTS "Farm members with permission can update health protocols" ON health_protocols;
DROP POLICY IF EXISTS "Farm members with permission can delete health protocols" ON health_protocols;

CREATE POLICY "Farm members can view health protocols"
  ON health_protocols FOR SELECT
  USING (farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Farm members with permission can insert health protocols"
  ON health_protocols FOR INSERT
  WITH CHECK (check_farm_permission(farm_id, 'health', 'edit'));

CREATE POLICY "Farm members with permission can update health protocols"
  ON health_protocols FOR UPDATE
  USING (check_farm_permission(farm_id, 'health', 'edit'));

CREATE POLICY "Farm members with permission can delete health protocols"
  ON health_protocols FOR DELETE
  USING (check_farm_permission(farm_id, 'health', 'delete'));


-- ── veterinarians ────────────────────────────────────────────────────────────
ALTER TABLE veterinarians ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view veterinarians"                  ON veterinarians;
DROP POLICY IF EXISTS "Farm members with permission can insert veterinarians" ON veterinarians;
DROP POLICY IF EXISTS "Farm members with permission can update veterinarians" ON veterinarians;
DROP POLICY IF EXISTS "Farm members with permission can delete veterinarians" ON veterinarians;

CREATE POLICY "Farm members can view veterinarians"
  ON veterinarians FOR SELECT
  USING (farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Farm members with permission can insert veterinarians"
  ON veterinarians FOR INSERT
  WITH CHECK (check_farm_permission(farm_id, 'health', 'create'));

CREATE POLICY "Farm members with permission can update veterinarians"
  ON veterinarians FOR UPDATE
  USING (check_farm_permission(farm_id, 'health', 'edit'));

CREATE POLICY "Farm members with permission can delete veterinarians"
  ON veterinarians FOR DELETE
  USING (check_farm_permission(farm_id, 'health', 'delete'));


-- ── veterinary_visits ────────────────────────────────────────────────────────
ALTER TABLE veterinary_visits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view veterinary visits"                  ON veterinary_visits;
DROP POLICY IF EXISTS "Farm members with permission can insert veterinary visits" ON veterinary_visits;
DROP POLICY IF EXISTS "Farm members with permission can update veterinary visits" ON veterinary_visits;
DROP POLICY IF EXISTS "Farm members with permission can delete veterinary visits" ON veterinary_visits;

CREATE POLICY "Farm members can view veterinary visits"
  ON veterinary_visits FOR SELECT
  USING (farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Farm members with permission can insert veterinary visits"
  ON veterinary_visits FOR INSERT
  WITH CHECK (check_farm_permission(farm_id, 'health', 'create'));

CREATE POLICY "Farm members with permission can update veterinary visits"
  ON veterinary_visits FOR UPDATE
  USING (check_farm_permission(farm_id, 'health', 'edit'));

CREATE POLICY "Farm members with permission can delete veterinary visits"
  ON veterinary_visits FOR DELETE
  USING (check_farm_permission(farm_id, 'health', 'delete'));


-- ── visit_animals (no farm_id — resolves via veterinary_visits) ──────────────
ALTER TABLE visit_animals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view visit animals"                  ON visit_animals;
DROP POLICY IF EXISTS "Farm members with permission can insert visit animals" ON visit_animals;
DROP POLICY IF EXISTS "Farm members with permission can delete visit animals" ON visit_animals;

CREATE POLICY "Farm members can view visit animals"
  ON visit_animals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM veterinary_visits vv
      WHERE vv.id = visit_id
        AND vv.farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Farm members with permission can insert visit animals"
  ON visit_animals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM veterinary_visits vv
      WHERE vv.id = visit_id
        AND check_farm_permission(vv.farm_id, 'health', 'create')
    )
  );

CREATE POLICY "Farm members with permission can delete visit animals"
  ON visit_animals FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM veterinary_visits vv
      WHERE vv.id = visit_id
        AND check_farm_permission(vv.farm_id, 'health', 'delete')
    )
  );


-- ── vaccinations ─────────────────────────────────────────────────────────────
ALTER TABLE vaccinations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view vaccinations"                  ON vaccinations;
DROP POLICY IF EXISTS "Farm members with permission can insert vaccinations" ON vaccinations;
DROP POLICY IF EXISTS "Farm members with permission can update vaccinations" ON vaccinations;
DROP POLICY IF EXISTS "Farm members with permission can delete vaccinations" ON vaccinations;

CREATE POLICY "Farm members can view vaccinations"
  ON vaccinations FOR SELECT
  USING (farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Farm members with permission can insert vaccinations"
  ON vaccinations FOR INSERT
  WITH CHECK (check_farm_permission(farm_id, 'health', 'create'));

CREATE POLICY "Farm members with permission can update vaccinations"
  ON vaccinations FOR UPDATE
  USING (check_farm_permission(farm_id, 'health', 'edit'));

CREATE POLICY "Farm members with permission can delete vaccinations"
  ON vaccinations FOR DELETE
  USING (check_farm_permission(farm_id, 'health', 'delete'));


-- ── vaccination_animals (no farm_id — resolves via vaccinations) ─────────────
ALTER TABLE vaccination_animals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view vaccination animals"                  ON vaccination_animals;
DROP POLICY IF EXISTS "Farm members with permission can insert vaccination animals" ON vaccination_animals;
DROP POLICY IF EXISTS "Farm members with permission can delete vaccination animals" ON vaccination_animals;

CREATE POLICY "Farm members can view vaccination animals"
  ON vaccination_animals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM vaccinations v
      WHERE v.id = vaccination_id
        AND v.farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Farm members with permission can insert vaccination animals"
  ON vaccination_animals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vaccinations v
      WHERE v.id = vaccination_id
        AND check_farm_permission(v.farm_id, 'health', 'create')
    )
  );

CREATE POLICY "Farm members with permission can delete vaccination animals"
  ON vaccination_animals FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM vaccinations v
      WHERE v.id = vaccination_id
        AND check_farm_permission(v.farm_id, 'health', 'delete')
    )
  );


-- ── vaccination_protocols ────────────────────────────────────────────────────
ALTER TABLE vaccination_protocols ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view vaccination protocols"                  ON vaccination_protocols;
DROP POLICY IF EXISTS "Farm members with permission can insert vaccination protocols" ON vaccination_protocols;
DROP POLICY IF EXISTS "Farm members with permission can update vaccination protocols" ON vaccination_protocols;
DROP POLICY IF EXISTS "Farm members with permission can delete vaccination protocols" ON vaccination_protocols;

CREATE POLICY "Farm members can view vaccination protocols"
  ON vaccination_protocols FOR SELECT
  USING (farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Farm members with permission can insert vaccination protocols"
  ON vaccination_protocols FOR INSERT
  WITH CHECK (check_farm_permission(farm_id, 'health', 'edit'));

CREATE POLICY "Farm members with permission can update vaccination protocols"
  ON vaccination_protocols FOR UPDATE
  USING (check_farm_permission(farm_id, 'health', 'edit'));

CREATE POLICY "Farm members with permission can delete vaccination protocols"
  ON vaccination_protocols FOR DELETE
  USING (check_farm_permission(farm_id, 'health', 'delete'));


-- ── vaccination_schedules ────────────────────────────────────────────────────
ALTER TABLE vaccination_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view vaccination schedules"                  ON vaccination_schedules;
DROP POLICY IF EXISTS "Farm members with permission can insert vaccination schedules" ON vaccination_schedules;
DROP POLICY IF EXISTS "Farm members with permission can update vaccination schedules" ON vaccination_schedules;
DROP POLICY IF EXISTS "Farm members with permission can delete vaccination schedules" ON vaccination_schedules;

CREATE POLICY "Farm members can view vaccination schedules"
  ON vaccination_schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM animals a
      WHERE a.id = animal_id
        AND a.farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Farm members with permission can insert vaccination schedules"
  ON vaccination_schedules FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM animals a
      WHERE a.id = animal_id
        AND check_farm_permission(a.farm_id, 'health', 'create')
    )
  );

CREATE POLICY "Farm members with permission can update vaccination schedules"
  ON vaccination_schedules FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM animals a
      WHERE a.id = animal_id
        AND check_farm_permission(a.farm_id, 'health', 'edit')
    )
  );

CREATE POLICY "Farm members with permission can delete vaccination schedules"
  ON vaccination_schedules FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM animals a
      WHERE a.id = animal_id
        AND check_farm_permission(a.farm_id, 'health', 'delete')
    )
  );


-- ── medication_administrations ───────────────────────────────────────────────
ALTER TABLE medication_administrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view medication administrations"                  ON medication_administrations;
DROP POLICY IF EXISTS "Farm members with permission can insert medication administrations" ON medication_administrations;
DROP POLICY IF EXISTS "Farm members with permission can update medication administrations" ON medication_administrations;
DROP POLICY IF EXISTS "Farm members with permission can delete medication administrations" ON medication_administrations;

CREATE POLICY "Farm members can view medication administrations"
  ON medication_administrations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM animals a
      WHERE a.id = animal_id
        AND a.farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Farm members with permission can insert medication administrations"
  ON medication_administrations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM animals a
      WHERE a.id = animal_id
        AND check_farm_permission(a.farm_id, 'health', 'create')
    )
  );

CREATE POLICY "Farm members with permission can update medication administrations"
  ON medication_administrations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM animals a
      WHERE a.id = animal_id
        AND check_farm_permission(a.farm_id, 'health', 'edit')
    )
  );

CREATE POLICY "Farm members with permission can delete medication administrations"
  ON medication_administrations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM animals a
      WHERE a.id = animal_id
        AND check_farm_permission(a.farm_id, 'health', 'delete')
    )
  );


-- ── abortion_records ─────────────────────────────────────────────────────────
ALTER TABLE abortion_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view abortion records"                  ON abortion_records;
DROP POLICY IF EXISTS "Farm members with permission can insert abortion records" ON abortion_records;
DROP POLICY IF EXISTS "Farm members with permission can update abortion records" ON abortion_records;
DROP POLICY IF EXISTS "Farm members with permission can delete abortion records" ON abortion_records;

CREATE POLICY "Farm members can view abortion records"
  ON abortion_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM animals a
      WHERE a.id = animal_id
        AND a.farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Farm members with permission can insert abortion records"
  ON abortion_records FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM animals a
      WHERE a.id = animal_id
        AND check_farm_permission(a.farm_id, 'breeding', 'create')
    )
  );

CREATE POLICY "Farm members with permission can update abortion records"
  ON abortion_records FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM animals a
      WHERE a.id = animal_id
        AND check_farm_permission(a.farm_id, 'breeding', 'edit')
    )
  );

CREATE POLICY "Farm members with permission can delete abortion records"
  ON abortion_records FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM animals a
      WHERE a.id = animal_id
        AND check_farm_permission(a.farm_id, 'breeding', 'delete')
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- MODULE: ANIMALS (remaining tables not in migration 036/037)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── animal_categories ────────────────────────────────────────────────────────
ALTER TABLE animal_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view animal categories"                  ON animal_categories;
DROP POLICY IF EXISTS "Farm members with permission can insert animal categories" ON animal_categories;
DROP POLICY IF EXISTS "Farm members with permission can update animal categories" ON animal_categories;
DROP POLICY IF EXISTS "Farm members with permission can delete animal categories" ON animal_categories;

CREATE POLICY "Farm members can view animal categories"
  ON animal_categories FOR SELECT
  USING (farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Farm members with permission can insert animal categories"
  ON animal_categories FOR INSERT
  WITH CHECK (check_farm_permission(farm_id, 'animals', 'edit'));

CREATE POLICY "Farm members with permission can update animal categories"
  ON animal_categories FOR UPDATE
  USING (check_farm_permission(farm_id, 'animals', 'edit'));

CREATE POLICY "Farm members with permission can delete animal categories"
  ON animal_categories FOR DELETE
  USING (check_farm_permission(farm_id, 'animals', 'delete'));


-- ── animal_category_assignments ──────────────────────────────────────────────
ALTER TABLE animal_category_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view animal category assignments"                  ON animal_category_assignments;
DROP POLICY IF EXISTS "Farm members with permission can insert animal category assignments" ON animal_category_assignments;
DROP POLICY IF EXISTS "Farm members with permission can update animal category assignments" ON animal_category_assignments;
DROP POLICY IF EXISTS "Farm members with permission can delete animal category assignments" ON animal_category_assignments;

CREATE POLICY "Farm members can view animal category assignments"
  ON animal_category_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM animals a
      WHERE a.id = animal_id
        AND a.farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Farm members with permission can insert animal category assignments"
  ON animal_category_assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM animals a
      WHERE a.id = animal_id
        AND check_farm_permission(a.farm_id, 'animals', 'edit')
    )
  );

CREATE POLICY "Farm members with permission can update animal category assignments"
  ON animal_category_assignments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM animals a
      WHERE a.id = animal_id
        AND check_farm_permission(a.farm_id, 'animals', 'edit')
    )
  );

CREATE POLICY "Farm members with permission can delete animal category assignments"
  ON animal_category_assignments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM animals a
      WHERE a.id = animal_id
        AND check_farm_permission(a.farm_id, 'animals', 'edit')
    )
  );


-- NOTE: animal_status_changes is not in the DB schema (not in types.ts) — skipped.


-- ── animal_tags ──────────────────────────────────────────────────────────────
ALTER TABLE animal_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view animal tags"                  ON animal_tags;
DROP POLICY IF EXISTS "Farm members with permission can insert animal tags" ON animal_tags;
DROP POLICY IF EXISTS "Farm members with permission can update animal tags" ON animal_tags;
DROP POLICY IF EXISTS "Farm members with permission can delete animal tags" ON animal_tags;

-- animal_tags has no farm_id — link via animal_id → animals.farm_id
CREATE POLICY "Farm members can view animal tags"
  ON animal_tags FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM animals a WHERE a.id = animal_id
      AND a.farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid())
  ));

CREATE POLICY "Farm members with permission can insert animal tags"
  ON animal_tags FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM animals a WHERE a.id = animal_id
      AND check_farm_permission(a.farm_id, 'animals', 'edit')
  ));

CREATE POLICY "Farm members with permission can update animal tags"
  ON animal_tags FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM animals a WHERE a.id = animal_id
      AND check_farm_permission(a.farm_id, 'animals', 'edit')
  ));

CREATE POLICY "Farm members with permission can delete animal tags"
  ON animal_tags FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM animals a WHERE a.id = animal_id
      AND check_farm_permission(a.farm_id, 'animals', 'delete')
  ));


-- ── animal_qr_codes ──────────────────────────────────────────────────────────
ALTER TABLE animal_qr_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view animal qr codes"                  ON animal_qr_codes;
DROP POLICY IF EXISTS "Farm members with permission can insert animal qr codes" ON animal_qr_codes;
DROP POLICY IF EXISTS "Farm members with permission can delete animal qr codes" ON animal_qr_codes;

CREATE POLICY "Farm members can view animal qr codes"
  ON animal_qr_codes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM animals a
      WHERE a.id = animal_id
        AND a.farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Farm members with permission can insert animal qr codes"
  ON animal_qr_codes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM animals a
      WHERE a.id = animal_id
        AND check_farm_permission(a.farm_id, 'animals', 'edit')
    )
  );

CREATE POLICY "Farm members with permission can delete animal qr codes"
  ON animal_qr_codes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM animals a
      WHERE a.id = animal_id
        AND check_farm_permission(a.farm_id, 'animals', 'delete')
    )
  );


-- NOTE: animal_audit_logs is not in the DB schema (not in types.ts) — skipped.


-- ─────────────────────────────────────────────────────────────────────────────
-- MODULE: PRODUCTION
-- ─────────────────────────────────────────────────────────────────────────────

-- ── production_records ───────────────────────────────────────────────────────
ALTER TABLE production_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view production records"                  ON production_records;
DROP POLICY IF EXISTS "Farm members with permission can insert production records" ON production_records;
DROP POLICY IF EXISTS "Farm members with permission can update production records" ON production_records;
DROP POLICY IF EXISTS "Farm members with permission can delete production records" ON production_records;

CREATE POLICY "Farm members can view production records"
  ON production_records FOR SELECT
  USING (farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Farm members with permission can insert production records"
  ON production_records FOR INSERT
  WITH CHECK (check_farm_permission(farm_id, 'production', 'create'));

CREATE POLICY "Farm members with permission can update production records"
  ON production_records FOR UPDATE
  USING (check_farm_permission(farm_id, 'production', 'edit'));

CREATE POLICY "Farm members with permission can delete production records"
  ON production_records FOR DELETE
  USING (check_farm_permission(farm_id, 'production', 'delete'));


-- NOTE: production_dry_off_records is not in the DB schema (not in types.ts) — skipped.


-- ── farm_milking_groups ──────────────────────────────────────────────────────
ALTER TABLE farm_milking_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view farm milking groups"                  ON farm_milking_groups;
DROP POLICY IF EXISTS "Farm members with permission can insert farm milking groups" ON farm_milking_groups;
DROP POLICY IF EXISTS "Farm members with permission can update farm milking groups" ON farm_milking_groups;
DROP POLICY IF EXISTS "Farm members with permission can delete farm milking groups" ON farm_milking_groups;

CREATE POLICY "Farm members can view farm milking groups"
  ON farm_milking_groups FOR SELECT
  USING (farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Farm members with permission can insert farm milking groups"
  ON farm_milking_groups FOR INSERT
  WITH CHECK (check_farm_permission(farm_id, 'production', 'edit'));

CREATE POLICY "Farm members with permission can update farm milking groups"
  ON farm_milking_groups FOR UPDATE
  USING (check_farm_permission(farm_id, 'production', 'edit'));

CREATE POLICY "Farm members with permission can delete farm milking groups"
  ON farm_milking_groups FOR DELETE
  USING (check_farm_permission(farm_id, 'production', 'delete'));


-- ── daily_production_summary ─────────────────────────────────────────────────
-- Written by server-side triggers/upserts; farm members can read.
ALTER TABLE daily_production_summary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view daily production summary"                  ON daily_production_summary;
DROP POLICY IF EXISTS "Farm members with permission can upsert daily production summary" ON daily_production_summary;

CREATE POLICY "Farm members can view daily production summary"
  ON daily_production_summary FOR SELECT
  USING (farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Farm members with permission can upsert daily production summary"
  ON daily_production_summary FOR INSERT
  WITH CHECK (check_farm_permission(farm_id, 'production', 'create'));

CREATE POLICY "Farm members with permission can update daily production summary"
  ON daily_production_summary FOR UPDATE
  USING (check_farm_permission(farm_id, 'production', 'edit'));


-- ── distribution_channels ────────────────────────────────────────────────────
ALTER TABLE distribution_channels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view distribution channels"                  ON distribution_channels;
DROP POLICY IF EXISTS "Farm members with permission can insert distribution channels" ON distribution_channels;
DROP POLICY IF EXISTS "Farm members with permission can update distribution channels" ON distribution_channels;
DROP POLICY IF EXISTS "Farm members with permission can delete distribution channels" ON distribution_channels;

CREATE POLICY "Farm members can view distribution channels"
  ON distribution_channels FOR SELECT
  USING (farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Farm members with permission can insert distribution channels"
  ON distribution_channels FOR INSERT
  WITH CHECK (check_farm_permission(farm_id, 'production', 'edit'));

CREATE POLICY "Farm members with permission can update distribution channels"
  ON distribution_channels FOR UPDATE
  USING (check_farm_permission(farm_id, 'production', 'edit'));

CREATE POLICY "Farm members with permission can delete distribution channels"
  ON distribution_channels FOR DELETE
  USING (check_farm_permission(farm_id, 'production', 'delete'));


-- ── distribution_records ─────────────────────────────────────────────────────
ALTER TABLE distribution_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view distribution records"                  ON distribution_records;
DROP POLICY IF EXISTS "Farm members with permission can insert distribution records" ON distribution_records;
DROP POLICY IF EXISTS "Farm members with permission can update distribution records" ON distribution_records;
DROP POLICY IF EXISTS "Farm members with permission can delete distribution records" ON distribution_records;

CREATE POLICY "Farm members can view distribution records"
  ON distribution_records FOR SELECT
  USING (farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Farm members with permission can insert distribution records"
  ON distribution_records FOR INSERT
  WITH CHECK (check_farm_permission(farm_id, 'production', 'create'));

CREATE POLICY "Farm members with permission can update distribution records"
  ON distribution_records FOR UPDATE
  USING (check_farm_permission(farm_id, 'production', 'edit'));

CREATE POLICY "Farm members with permission can delete distribution records"
  ON distribution_records FOR DELETE
  USING (check_farm_permission(farm_id, 'production', 'delete'));


-- ─────────────────────────────────────────────────────────────────────────────
-- MODULE: FINANCIAL
-- ─────────────────────────────────────────────────────────────────────────────

-- ── financial_transactions ───────────────────────────────────────────────────
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view financial transactions"                  ON financial_transactions;
DROP POLICY IF EXISTS "Farm members with permission can insert financial transactions" ON financial_transactions;
DROP POLICY IF EXISTS "Farm members with permission can update financial transactions" ON financial_transactions;
DROP POLICY IF EXISTS "Farm members with permission can delete financial transactions" ON financial_transactions;

CREATE POLICY "Farm members can view financial transactions"
  ON financial_transactions FOR SELECT
  USING (farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Farm members with permission can insert financial transactions"
  ON financial_transactions FOR INSERT
  WITH CHECK (check_farm_permission(farm_id, 'financial', 'create'));

CREATE POLICY "Farm members with permission can update financial transactions"
  ON financial_transactions FOR UPDATE
  USING (check_farm_permission(farm_id, 'financial', 'edit'));

CREATE POLICY "Farm members with permission can delete financial transactions"
  ON financial_transactions FOR DELETE
  USING (check_farm_permission(farm_id, 'financial', 'delete'));


-- ── milk_sales ───────────────────────────────────────────────────────────────
ALTER TABLE milk_sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view milk sales"                  ON milk_sales;
DROP POLICY IF EXISTS "Farm members with permission can insert milk sales" ON milk_sales;
DROP POLICY IF EXISTS "Farm members with permission can update milk sales" ON milk_sales;
DROP POLICY IF EXISTS "Farm members with permission can delete milk sales" ON milk_sales;

CREATE POLICY "Farm members can view milk sales"
  ON milk_sales FOR SELECT
  USING (farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Farm members with permission can insert milk sales"
  ON milk_sales FOR INSERT
  WITH CHECK (check_farm_permission(farm_id, 'financial', 'create'));

CREATE POLICY "Farm members with permission can update milk sales"
  ON milk_sales FOR UPDATE
  USING (check_farm_permission(farm_id, 'financial', 'edit'));

CREATE POLICY "Farm members with permission can delete milk sales"
  ON milk_sales FOR DELETE
  USING (check_farm_permission(farm_id, 'financial', 'delete'));


-- NOTE: animal_sales is not in the DB schema (not in types.ts) — skipped.


-- ─────────────────────────────────────────────────────────────────────────────
-- MODULE: INVENTORY
-- ─────────────────────────────────────────────────────────────────────────────

-- ── inventory_items ──────────────────────────────────────────────────────────
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view inventory items"                  ON inventory_items;
DROP POLICY IF EXISTS "Farm members with permission can insert inventory items" ON inventory_items;
DROP POLICY IF EXISTS "Farm members with permission can update inventory items" ON inventory_items;
DROP POLICY IF EXISTS "Farm members with permission can delete inventory items" ON inventory_items;

CREATE POLICY "Farm members can view inventory items"
  ON inventory_items FOR SELECT
  USING (farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Farm members with permission can insert inventory items"
  ON inventory_items FOR INSERT
  WITH CHECK (check_farm_permission(farm_id, 'inventory', 'create'));

CREATE POLICY "Farm members with permission can update inventory items"
  ON inventory_items FOR UPDATE
  USING (check_farm_permission(farm_id, 'inventory', 'edit'));

CREATE POLICY "Farm members with permission can delete inventory items"
  ON inventory_items FOR DELETE
  USING (check_farm_permission(farm_id, 'inventory', 'delete'));


-- ── inventory_transactions ───────────────────────────────────────────────────
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view inventory transactions"                  ON inventory_transactions;
DROP POLICY IF EXISTS "Farm members with permission can insert inventory transactions" ON inventory_transactions;
DROP POLICY IF EXISTS "Farm members with permission can update inventory transactions" ON inventory_transactions;
DROP POLICY IF EXISTS "Farm members with permission can delete inventory transactions" ON inventory_transactions;

CREATE POLICY "Farm members can view inventory transactions"
  ON inventory_transactions FOR SELECT
  USING (farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Farm members with permission can insert inventory transactions"
  ON inventory_transactions FOR INSERT
  WITH CHECK (check_farm_permission(farm_id, 'inventory', 'edit'));

CREATE POLICY "Farm members with permission can update inventory transactions"
  ON inventory_transactions FOR UPDATE
  USING (check_farm_permission(farm_id, 'inventory', 'edit'));

CREATE POLICY "Farm members with permission can delete inventory transactions"
  ON inventory_transactions FOR DELETE
  USING (check_farm_permission(farm_id, 'inventory', 'delete'));


-- ── suppliers ────────────────────────────────────────────────────────────────
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view suppliers"                  ON suppliers;
DROP POLICY IF EXISTS "Farm members with permission can insert suppliers" ON suppliers;
DROP POLICY IF EXISTS "Farm members with permission can update suppliers" ON suppliers;
DROP POLICY IF EXISTS "Farm members with permission can delete suppliers" ON suppliers;

CREATE POLICY "Farm members can view suppliers"
  ON suppliers FOR SELECT
  USING (farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Farm members with permission can insert suppliers"
  ON suppliers FOR INSERT
  WITH CHECK (check_farm_permission(farm_id, 'inventory', 'create'));

CREATE POLICY "Farm members with permission can update suppliers"
  ON suppliers FOR UPDATE
  USING (check_farm_permission(farm_id, 'inventory', 'edit'));

CREATE POLICY "Farm members with permission can delete suppliers"
  ON suppliers FOR DELETE
  USING (check_farm_permission(farm_id, 'inventory', 'delete'));


-- ─────────────────────────────────────────────────────────────────────────────
-- MODULE: EQUIPMENT
-- ─────────────────────────────────────────────────────────────────────────────

-- ── equipment ────────────────────────────────────────────────────────────────
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view equipment"                  ON equipment;
DROP POLICY IF EXISTS "Farm members with permission can insert equipment" ON equipment;
DROP POLICY IF EXISTS "Farm members with permission can update equipment" ON equipment;
DROP POLICY IF EXISTS "Farm members with permission can delete equipment" ON equipment;

CREATE POLICY "Farm members can view equipment"
  ON equipment FOR SELECT
  USING (farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Farm members with permission can insert equipment"
  ON equipment FOR INSERT
  WITH CHECK (check_farm_permission(farm_id, 'equipment', 'create'));

CREATE POLICY "Farm members with permission can update equipment"
  ON equipment FOR UPDATE
  USING (check_farm_permission(farm_id, 'equipment', 'edit'));

CREATE POLICY "Farm members with permission can delete equipment"
  ON equipment FOR DELETE
  USING (check_farm_permission(farm_id, 'equipment', 'delete'));


-- ── equipment_maintenance (no farm_id — resolves via equipment) ──────────────
ALTER TABLE equipment_maintenance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view equipment maintenance"                  ON equipment_maintenance;
DROP POLICY IF EXISTS "Farm members with permission can insert equipment maintenance" ON equipment_maintenance;
DROP POLICY IF EXISTS "Farm members with permission can update equipment maintenance" ON equipment_maintenance;
DROP POLICY IF EXISTS "Farm members with permission can delete equipment maintenance" ON equipment_maintenance;

CREATE POLICY "Farm members can view equipment maintenance"
  ON equipment_maintenance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM equipment e
      WHERE e.id = equipment_id
        AND e.farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Farm members with permission can insert equipment maintenance"
  ON equipment_maintenance FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM equipment e
      WHERE e.id = equipment_id
        AND check_farm_permission(e.farm_id, 'equipment', 'create')
    )
  );

CREATE POLICY "Farm members with permission can update equipment maintenance"
  ON equipment_maintenance FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM equipment e
      WHERE e.id = equipment_id
        AND check_farm_permission(e.farm_id, 'equipment', 'edit')
    )
  );

CREATE POLICY "Farm members with permission can delete equipment maintenance"
  ON equipment_maintenance FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM equipment e
      WHERE e.id = equipment_id
        AND check_farm_permission(e.farm_id, 'equipment', 'delete')
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- MODULE: FEED
-- ─────────────────────────────────────────────────────────────────────────────

-- ── feed_types ───────────────────────────────────────────────────────────────
ALTER TABLE feed_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view feed types"                  ON feed_types;
DROP POLICY IF EXISTS "Farm members with permission can insert feed types" ON feed_types;
DROP POLICY IF EXISTS "Farm members with permission can update feed types" ON feed_types;
DROP POLICY IF EXISTS "Farm members with permission can delete feed types" ON feed_types;

CREATE POLICY "Farm members can view feed types"
  ON feed_types FOR SELECT
  USING (farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Farm members with permission can insert feed types"
  ON feed_types FOR INSERT
  WITH CHECK (check_farm_permission(farm_id, 'feed', 'create'));

CREATE POLICY "Farm members with permission can update feed types"
  ON feed_types FOR UPDATE
  USING (check_farm_permission(farm_id, 'feed', 'edit'));

CREATE POLICY "Farm members with permission can delete feed types"
  ON feed_types FOR DELETE
  USING (check_farm_permission(farm_id, 'feed', 'delete'));


-- ── feed_type_categories ─────────────────────────────────────────────────────
ALTER TABLE feed_type_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view feed type categories"                  ON feed_type_categories;
DROP POLICY IF EXISTS "Farm members with permission can insert feed type categories" ON feed_type_categories;
DROP POLICY IF EXISTS "Farm members with permission can update feed type categories" ON feed_type_categories;
DROP POLICY IF EXISTS "Farm members with permission can delete feed type categories" ON feed_type_categories;

CREATE POLICY "Farm members can view feed type categories"
  ON feed_type_categories FOR SELECT
  USING (farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Farm members with permission can insert feed type categories"
  ON feed_type_categories FOR INSERT
  WITH CHECK (check_farm_permission(farm_id, 'feed', 'create'));

CREATE POLICY "Farm members with permission can update feed type categories"
  ON feed_type_categories FOR UPDATE
  USING (check_farm_permission(farm_id, 'feed', 'edit'));

CREATE POLICY "Farm members with permission can delete feed type categories"
  ON feed_type_categories FOR DELETE
  USING (check_farm_permission(farm_id, 'feed', 'delete'));


-- ── feed_inventory ───────────────────────────────────────────────────────────
ALTER TABLE feed_inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view feed inventory"                  ON feed_inventory;
DROP POLICY IF EXISTS "Farm members with permission can insert feed inventory" ON feed_inventory;
DROP POLICY IF EXISTS "Farm members with permission can update feed inventory" ON feed_inventory;
DROP POLICY IF EXISTS "Farm members with permission can delete feed inventory" ON feed_inventory;

CREATE POLICY "Farm members can view feed inventory"
  ON feed_inventory FOR SELECT
  USING (farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Farm members with permission can insert feed inventory"
  ON feed_inventory FOR INSERT
  WITH CHECK (check_farm_permission(farm_id, 'feed', 'create'));

CREATE POLICY "Farm members with permission can update feed inventory"
  ON feed_inventory FOR UPDATE
  USING (check_farm_permission(farm_id, 'feed', 'edit'));

CREATE POLICY "Farm members with permission can delete feed inventory"
  ON feed_inventory FOR DELETE
  USING (check_farm_permission(farm_id, 'feed', 'delete'));


-- ── feed_consumption_records ─────────────────────────────────────────────────
ALTER TABLE feed_consumption_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view feed consumption records"                  ON feed_consumption_records;
DROP POLICY IF EXISTS "Farm members with permission can insert feed consumption records" ON feed_consumption_records;
DROP POLICY IF EXISTS "Farm members with permission can update feed consumption records" ON feed_consumption_records;
DROP POLICY IF EXISTS "Farm members with permission can delete feed consumption records" ON feed_consumption_records;

CREATE POLICY "Farm members can view feed consumption records"
  ON feed_consumption_records FOR SELECT
  USING (farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Farm members with permission can insert feed consumption records"
  ON feed_consumption_records FOR INSERT
  WITH CHECK (check_farm_permission(farm_id, 'feed', 'create'));

CREATE POLICY "Farm members with permission can update feed consumption records"
  ON feed_consumption_records FOR UPDATE
  USING (check_farm_permission(farm_id, 'feed', 'edit'));

CREATE POLICY "Farm members with permission can delete feed consumption records"
  ON feed_consumption_records FOR DELETE
  USING (check_farm_permission(farm_id, 'feed', 'delete'));


-- ── feed_consumption_animals (no farm_id — FK column is consumption_id) ──────
ALTER TABLE feed_consumption_animals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view feed consumption animals"                  ON feed_consumption_animals;
DROP POLICY IF EXISTS "Farm members with permission can insert feed consumption animals" ON feed_consumption_animals;
DROP POLICY IF EXISTS "Farm members with permission can delete feed consumption animals" ON feed_consumption_animals;

CREATE POLICY "Farm members can view feed consumption animals"
  ON feed_consumption_animals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM feed_consumption_records fcr
      WHERE fcr.id = consumption_id
        AND fcr.farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Farm members with permission can insert feed consumption animals"
  ON feed_consumption_animals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM feed_consumption_records fcr
      WHERE fcr.id = consumption_id
        AND check_farm_permission(fcr.farm_id, 'feed', 'create')
    )
  );

CREATE POLICY "Farm members with permission can delete feed consumption animals"
  ON feed_consumption_animals FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM feed_consumption_records fcr
      WHERE fcr.id = consumption_id
        AND check_farm_permission(fcr.farm_id, 'feed', 'delete')
    )
  );


-- NOTE: daily_feed_summary is a VIEW — RLS cannot be applied to views.
-- Access is inherited from the underlying feed_consumption_records table.


-- ── scheduled_feedings ───────────────────────────────────────────────────────
ALTER TABLE scheduled_feedings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view scheduled feedings"                  ON scheduled_feedings;
DROP POLICY IF EXISTS "Farm members with permission can insert scheduled feedings" ON scheduled_feedings;
DROP POLICY IF EXISTS "Farm members with permission can update scheduled feedings" ON scheduled_feedings;
DROP POLICY IF EXISTS "Farm members with permission can delete scheduled feedings" ON scheduled_feedings;

CREATE POLICY "Farm members can view scheduled feedings"
  ON scheduled_feedings FOR SELECT
  USING (farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Farm members with permission can insert scheduled feedings"
  ON scheduled_feedings FOR INSERT
  WITH CHECK (check_farm_permission(farm_id, 'feed', 'create'));

CREATE POLICY "Farm members with permission can update scheduled feedings"
  ON scheduled_feedings FOR UPDATE
  USING (check_farm_permission(farm_id, 'feed', 'edit'));

CREATE POLICY "Farm members with permission can delete scheduled feedings"
  ON scheduled_feedings FOR DELETE
  USING (check_farm_permission(farm_id, 'feed', 'delete'));


-- ── scheduled_feeding_animals ────────────────────────────────────────────────
ALTER TABLE scheduled_feeding_animals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view scheduled feeding animals"                  ON scheduled_feeding_animals;
DROP POLICY IF EXISTS "Farm members with permission can insert scheduled feeding animals" ON scheduled_feeding_animals;
DROP POLICY IF EXISTS "Farm members with permission can delete scheduled feeding animals" ON scheduled_feeding_animals;

CREATE POLICY "Farm members can view scheduled feeding animals"
  ON scheduled_feeding_animals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM scheduled_feedings sf
      WHERE sf.id = scheduled_feeding_id
        AND sf.farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Farm members with permission can insert scheduled feeding animals"
  ON scheduled_feeding_animals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM scheduled_feedings sf
      WHERE sf.id = scheduled_feeding_id
        AND check_farm_permission(sf.farm_id, 'feed', 'create')
    )
  );

CREATE POLICY "Farm members with permission can delete scheduled feeding animals"
  ON scheduled_feeding_animals FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM scheduled_feedings sf
      WHERE sf.id = scheduled_feeding_id
        AND check_farm_permission(sf.farm_id, 'feed', 'delete')
    )
  );


-- ── consumption_batches ──────────────────────────────────────────────────────
ALTER TABLE consumption_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view consumption batches"                  ON consumption_batches;
DROP POLICY IF EXISTS "Farm members with permission can insert consumption batches" ON consumption_batches;
DROP POLICY IF EXISTS "Farm members with permission can update consumption batches" ON consumption_batches;
DROP POLICY IF EXISTS "Farm members with permission can delete consumption batches" ON consumption_batches;

CREATE POLICY "Farm members can view consumption batches"
  ON consumption_batches FOR SELECT
  USING (farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Farm members with permission can insert consumption batches"
  ON consumption_batches FOR INSERT
  WITH CHECK (check_farm_permission(farm_id, 'feed', 'create'));

CREATE POLICY "Farm members with permission can update consumption batches"
  ON consumption_batches FOR UPDATE
  USING (check_farm_permission(farm_id, 'feed', 'edit'));

CREATE POLICY "Farm members with permission can delete consumption batches"
  ON consumption_batches FOR DELETE
  USING (check_farm_permission(farm_id, 'feed', 'delete'));


-- NOTE: consumption_batch_animals is not in the DB schema (not in types.ts) — skipped.


-- ── consumption_batch_factors (has farm_id directly) ────────────────────────
ALTER TABLE consumption_batch_factors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view consumption batch factors"                  ON consumption_batch_factors;
DROP POLICY IF EXISTS "Farm members with permission can insert consumption batch factors" ON consumption_batch_factors;
DROP POLICY IF EXISTS "Farm members with permission can update consumption batch factors" ON consumption_batch_factors;
DROP POLICY IF EXISTS "Farm members with permission can delete consumption batch factors" ON consumption_batch_factors;

CREATE POLICY "Farm members can view consumption batch factors"
  ON consumption_batch_factors FOR SELECT
  USING (farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Farm members with permission can insert consumption batch factors"
  ON consumption_batch_factors FOR INSERT
  WITH CHECK (check_farm_permission(farm_id, 'feed', 'create'));

CREATE POLICY "Farm members with permission can update consumption batch factors"
  ON consumption_batch_factors FOR UPDATE
  USING (check_farm_permission(farm_id, 'feed', 'edit'));

CREATE POLICY "Farm members with permission can delete consumption batch factors"
  ON consumption_batch_factors FOR DELETE
  USING (check_farm_permission(farm_id, 'feed', 'delete'));


-- ── feed_mix_recipes ─────────────────────────────────────────────────────────
ALTER TABLE feed_mix_recipes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view feed mix recipes"                  ON feed_mix_recipes;
DROP POLICY IF EXISTS "Farm members with permission can insert feed mix recipes" ON feed_mix_recipes;
DROP POLICY IF EXISTS "Farm members with permission can update feed mix recipes" ON feed_mix_recipes;
DROP POLICY IF EXISTS "Farm members with permission can delete feed mix recipes" ON feed_mix_recipes;

CREATE POLICY "Farm members can view feed mix recipes"
  ON feed_mix_recipes FOR SELECT
  USING (farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Farm members with permission can insert feed mix recipes"
  ON feed_mix_recipes FOR INSERT
  WITH CHECK (check_farm_permission(farm_id, 'feed', 'create'));

CREATE POLICY "Farm members with permission can update feed mix recipes"
  ON feed_mix_recipes FOR UPDATE
  USING (check_farm_permission(farm_id, 'feed', 'edit'));

CREATE POLICY "Farm members with permission can delete feed mix recipes"
  ON feed_mix_recipes FOR DELETE
  USING (check_farm_permission(farm_id, 'feed', 'delete'));


-- NOTE: feed_mix_recommendations is not in the DB schema (not in types.ts) — skipped.


-- ── feed_recommendation_logs ─────────────────────────────────────────────────
ALTER TABLE feed_recommendation_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view feed recommendation logs"                  ON feed_recommendation_logs;
DROP POLICY IF EXISTS "Farm members with permission can insert feed recommendation logs" ON feed_recommendation_logs;

CREATE POLICY "Farm members can view feed recommendation logs"
  ON feed_recommendation_logs FOR SELECT
  USING (farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Farm members with permission can insert feed recommendation logs"
  ON feed_recommendation_logs FOR INSERT
  WITH CHECK (check_farm_permission(farm_id, 'feed', 'create'));


-- ── feeding_schedules ────────────────────────────────────────────────────────
ALTER TABLE feeding_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view feeding schedules"                  ON feeding_schedules;
DROP POLICY IF EXISTS "Farm members with permission can insert feeding schedules" ON feeding_schedules;
DROP POLICY IF EXISTS "Farm members with permission can update feeding schedules" ON feeding_schedules;
DROP POLICY IF EXISTS "Farm members with permission can delete feeding schedules" ON feeding_schedules;

CREATE POLICY "Farm members can view feeding schedules"
  ON feeding_schedules FOR SELECT
  USING (farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Farm members with permission can insert feeding schedules"
  ON feeding_schedules FOR INSERT
  WITH CHECK (check_farm_permission(farm_id, 'feed', 'create'));

CREATE POLICY "Farm members with permission can update feeding schedules"
  ON feeding_schedules FOR UPDATE
  USING (check_farm_permission(farm_id, 'feed', 'edit'));

CREATE POLICY "Farm members with permission can delete feeding schedules"
  ON feeding_schedules FOR DELETE
  USING (check_farm_permission(farm_id, 'feed', 'delete'));


-- ── animal_nutrition_targets ─────────────────────────────────────────────────
ALTER TABLE animal_nutrition_targets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view animal nutrition targets"                  ON animal_nutrition_targets;
DROP POLICY IF EXISTS "Farm members with permission can insert animal nutrition targets" ON animal_nutrition_targets;
DROP POLICY IF EXISTS "Farm members with permission can update animal nutrition targets" ON animal_nutrition_targets;
DROP POLICY IF EXISTS "Farm members with permission can delete animal nutrition targets" ON animal_nutrition_targets;

CREATE POLICY "Farm members can view animal nutrition targets"
  ON animal_nutrition_targets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM animals a
      WHERE a.id = animal_id
        AND a.farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Farm members with permission can insert animal nutrition targets"
  ON animal_nutrition_targets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM animals a
      WHERE a.id = animal_id
        AND check_farm_permission(a.farm_id, 'feed', 'edit')
    )
  );

CREATE POLICY "Farm members with permission can update animal nutrition targets"
  ON animal_nutrition_targets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM animals a
      WHERE a.id = animal_id
        AND check_farm_permission(a.farm_id, 'feed', 'edit')
    )
  );

CREATE POLICY "Farm members with permission can delete animal nutrition targets"
  ON animal_nutrition_targets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM animals a
      WHERE a.id = animal_id
        AND check_farm_permission(a.farm_id, 'feed', 'delete')
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- MODULE: SETTINGS
-- All settings tables: only farm_owner / farm_manager can write.
-- check_farm_permission(farm_id, 'settings', 'edit') returns true only for
-- farm_owner and farm_manager (step-3 fast path in the function).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── farm_profiles ────────────────────────────────────────────────────────────
ALTER TABLE farm_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view farm profiles"                  ON farm_profiles;
DROP POLICY IF EXISTS "Farm owners and managers can update farm profiles"     ON farm_profiles;

CREATE POLICY "Farm members can view farm profiles"
  ON farm_profiles FOR SELECT
  USING (farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Farm owners and managers can update farm profiles"
  ON farm_profiles FOR UPDATE
  USING (check_farm_permission(farm_id, 'settings', 'edit'));

CREATE POLICY "Farm owners can insert farm profiles"
  ON farm_profiles FOR INSERT
  WITH CHECK (
    farm_id IN (
      SELECT farm_id FROM user_roles
      WHERE user_id = auth.uid() AND role_type = 'farm_owner'
    )
  );


-- ── farm_profile_settings ────────────────────────────────────────────────────
ALTER TABLE farm_profile_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view farm profile settings"                  ON farm_profile_settings;
DROP POLICY IF EXISTS "Farm members with permission can manage farm profile settings" ON farm_profile_settings;

CREATE POLICY "Farm members can view farm profile settings"
  ON farm_profile_settings FOR SELECT
  USING (farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Farm members with permission can manage farm profile settings"
  ON farm_profile_settings FOR ALL
  USING (check_farm_permission(farm_id, 'settings', 'edit'));


-- ── farm_production_settings ─────────────────────────────────────────────────
ALTER TABLE farm_production_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view farm production settings"                  ON farm_production_settings;
DROP POLICY IF EXISTS "Farm members with permission can manage farm production settings" ON farm_production_settings;

CREATE POLICY "Farm members can view farm production settings"
  ON farm_production_settings FOR SELECT
  USING (farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Farm members with permission can manage farm production settings"
  ON farm_production_settings FOR ALL
  USING (check_farm_permission(farm_id, 'settings', 'edit'));


-- ── farm_health_settings ─────────────────────────────────────────────────────
ALTER TABLE farm_health_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view farm health settings"                  ON farm_health_settings;
DROP POLICY IF EXISTS "Farm members with permission can manage farm health settings" ON farm_health_settings;

CREATE POLICY "Farm members can view farm health settings"
  ON farm_health_settings FOR SELECT
  USING (farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Farm members with permission can manage farm health settings"
  ON farm_health_settings FOR ALL
  USING (check_farm_permission(farm_id, 'settings', 'edit'));


-- ── farm_breeding_settings ───────────────────────────────────────────────────
ALTER TABLE farm_breeding_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view farm breeding settings"                  ON farm_breeding_settings;
DROP POLICY IF EXISTS "Farm members with permission can manage farm breeding settings" ON farm_breeding_settings;

CREATE POLICY "Farm members can view farm breeding settings"
  ON farm_breeding_settings FOR SELECT
  USING (farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Farm members with permission can manage farm breeding settings"
  ON farm_breeding_settings FOR ALL
  USING (check_farm_permission(farm_id, 'settings', 'edit'));


-- ── distribution_settings ────────────────────────────────────────────────────
ALTER TABLE distribution_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view distribution settings"                  ON distribution_settings;
DROP POLICY IF EXISTS "Farm members with permission can manage distribution settings" ON distribution_settings;

CREATE POLICY "Farm members can view distribution settings"
  ON distribution_settings FOR SELECT
  USING (farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Farm members with permission can manage distribution settings"
  ON distribution_settings FOR ALL
  USING (check_farm_permission(farm_id, 'settings', 'edit'));


-- ── notification_settings ────────────────────────────────────────────────────
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view notification settings"                  ON notification_settings;
DROP POLICY IF EXISTS "Farm members with permission can manage notification settings" ON notification_settings;

CREATE POLICY "Farm members can view notification settings"
  ON notification_settings FOR SELECT
  USING (farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Farm members with permission can manage notification settings"
  ON notification_settings FOR ALL
  USING (check_farm_permission(farm_id, 'settings', 'edit'));


-- ── financial_settings ───────────────────────────────────────────────────────
ALTER TABLE financial_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view financial settings"                  ON financial_settings;
DROP POLICY IF EXISTS "Farm members with permission can manage financial settings" ON financial_settings;

CREATE POLICY "Farm members can view financial settings"
  ON financial_settings FOR SELECT
  USING (farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Farm members with permission can manage financial settings"
  ON financial_settings FOR ALL
  USING (check_farm_permission(farm_id, 'settings', 'edit'));


-- ── animal_tagging_settings ──────────────────────────────────────────────────
ALTER TABLE animal_tagging_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view animal tagging settings"                  ON animal_tagging_settings;
DROP POLICY IF EXISTS "Farm members with permission can manage animal tagging settings" ON animal_tagging_settings;

CREATE POLICY "Farm members can view animal tagging settings"
  ON animal_tagging_settings FOR SELECT
  USING (farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Farm members with permission can manage animal tagging settings"
  ON animal_tagging_settings FOR ALL
  USING (check_farm_permission(farm_id, 'settings', 'edit'));


-- ── farm_vaccination_diseases ────────────────────────────────────────────────
ALTER TABLE farm_vaccination_diseases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view farm vaccination diseases"                  ON farm_vaccination_diseases;
DROP POLICY IF EXISTS "Farm members with permission can manage farm vaccination diseases" ON farm_vaccination_diseases;

CREATE POLICY "Farm members can view farm vaccination diseases"
  ON farm_vaccination_diseases FOR SELECT
  USING (farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Farm members with permission can manage farm vaccination diseases"
  ON farm_vaccination_diseases FOR ALL
  USING (check_farm_permission(farm_id, 'settings', 'edit'));


-- ── farm_data_backup_settings ────────────────────────────────────────────────
ALTER TABLE farm_data_backup_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view farm data backup settings"                  ON farm_data_backup_settings;
DROP POLICY IF EXISTS "Farm members with permission can manage farm data backup settings" ON farm_data_backup_settings;

CREATE POLICY "Farm members can view farm data backup settings"
  ON farm_data_backup_settings FOR SELECT
  USING (farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Farm members with permission can manage farm data backup settings"
  ON farm_data_backup_settings FOR ALL
  USING (check_farm_permission(farm_id, 'settings', 'edit'));


-- ── farm_backup_history ──────────────────────────────────────────────────────
ALTER TABLE farm_backup_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view farm backup history"                  ON farm_backup_history;
DROP POLICY IF EXISTS "Farm members with permission can insert farm backup history" ON farm_backup_history;

CREATE POLICY "Farm members can view farm backup history"
  ON farm_backup_history FOR SELECT
  USING (farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Farm members with permission can insert farm backup history"
  ON farm_backup_history FOR INSERT
  WITH CHECK (check_farm_permission(farm_id, 'settings', 'edit'));


-- ── milk_buyers ──────────────────────────────────────────────────────────────
ALTER TABLE milk_buyers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm members can view milk buyers"                  ON milk_buyers;
DROP POLICY IF EXISTS "Farm members with permission can insert milk buyers" ON milk_buyers;
DROP POLICY IF EXISTS "Farm members with permission can update milk buyers" ON milk_buyers;
DROP POLICY IF EXISTS "Farm members with permission can delete milk buyers" ON milk_buyers;

CREATE POLICY "Farm members can view milk buyers"
  ON milk_buyers FOR SELECT
  USING (farm_id IN (SELECT farm_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Farm members with permission can insert milk buyers"
  ON milk_buyers FOR INSERT
  WITH CHECK (check_farm_permission(farm_id, 'financial', 'create'));

CREATE POLICY "Farm members with permission can update milk buyers"
  ON milk_buyers FOR UPDATE
  USING (check_farm_permission(farm_id, 'financial', 'edit'));

CREATE POLICY "Farm members with permission can delete milk buyers"
  ON milk_buyers FOR DELETE
  USING (check_farm_permission(farm_id, 'financial', 'delete'));
