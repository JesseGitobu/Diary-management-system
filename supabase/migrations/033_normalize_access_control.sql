-- =============================================================================
-- Migration 033: Normalize Access Control Policies
-- =============================================================================
-- WHAT THIS DOES:
--   Replaces the denormalized access_control_policies table (which stored
--   permissions as JSONB + arrays) with a fully normalized 3-table design:
--
--   1. access_control_policies   → policy metadata only (name, farm, role)
--   2. resource_operations       → master catalogue of every operation in system
--   3. policy_operation_grants   → junction: which operations each policy grants
--
-- WHY:
--   The old table stored resources[], actions[], and resource_actions JSONB —
--   three redundant representations of the same data, violating 1NF and 2NF.
--   The new design is 3NF compliant with full referential integrity.
--
-- STRATEGY: non-destructive migration
--   - Old columns are kept temporarily as _legacy_ columns
--   - Existing policy data is migrated into the new junction table
--   - Old columns are dropped at the end after data is confirmed migrated
-- =============================================================================

BEGIN;

-- =============================================================================
-- STEP 1: Clean up access_control_policies table
--         Remove redundant columns: resources[], actions[], resource_actions
--         Keep: id, farm_id, role_type, name, description, is_granted,
--               created_by, created_at, updated_at
-- =============================================================================

-- Drop indexes that only served the old columns
DROP INDEX IF EXISTS idx_access_control_resources_gin;
DROP INDEX IF EXISTS idx_access_control_actions_gin;
DROP INDEX IF EXISTS idx_access_control_resource_actions_gin;

-- Drop check constraints on the old array columns
ALTER TABLE public.access_control_policies
  DROP CONSTRAINT IF EXISTS check_actions_not_empty,
  DROP CONSTRAINT IF EXISTS check_resources_not_empty;

-- Temporarily rename old columns (keep data for migration step below)
ALTER TABLE public.access_control_policies
  RENAME COLUMN resources TO _legacy_resources;

ALTER TABLE public.access_control_policies
  RENAME COLUMN actions TO _legacy_actions;

ALTER TABLE public.access_control_policies
  RENAME COLUMN resource_actions TO _legacy_resource_actions;

-- =============================================================================
-- STEP 2: Create the resource_operations master catalogue table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.resource_operations (
  resource         VARCHAR(50)   NOT NULL,
  operation_key    VARCHAR(100)  NOT NULL,
  action_category  VARCHAR(20)   NOT NULL,
  label            VARCHAR(200)  NOT NULL,
  description      TEXT,
  sort_order       SMALLINT      NOT NULL DEFAULT 0,
  is_active        BOOLEAN       NOT NULL DEFAULT true,

  CONSTRAINT resource_operations_pkey
    PRIMARY KEY (resource, operation_key),

  CONSTRAINT valid_action_category CHECK (
    action_category IN ('view', 'create', 'edit', 'delete', 'export')
  )
);

-- Index: fetch all operations for a given resource (used to build UI forms)
CREATE INDEX IF NOT EXISTS idx_ro_resource
  ON resource_operations (resource);

-- Index: fetch by action category (e.g. "all create operations")
CREATE INDEX IF NOT EXISTS idx_ro_resource_category
  ON resource_operations (resource, action_category);

-- Index: only active operations (used in permission checks)
CREATE INDEX IF NOT EXISTS idx_ro_active
  ON resource_operations (resource, action_category)
  WHERE is_active = true;

-- =============================================================================
-- STEP 3: Seed the resource_operations catalogue
--         All operations default to is_active = true
-- =============================================================================

INSERT INTO resource_operations
  (resource, operation_key, action_category, label, sort_order)
VALUES
  -- ── ANIMALS ────────────────────────────────────────────────────────────────
  ('animals', 'view_list',           'view',   'View Animals List',                   1),
  ('animals', 'view_stats',          'view',   'View Animal Stats',                   2),
  ('animals', 'view_profile',        'view',   'View Animal Profile',                 3),
  ('animals', 'view_overview_tab',   'view',   'View Overview Tab',                   4),
  ('animals', 'view_health_tab',     'view',   'View Health Records Tab',             5),
  ('animals', 'view_breeding_tab',   'view',   'View Breeding Tab',                   6),
  ('animals', 'view_production_tab', 'view',   'View Production Tab',                 7),
  ('animals', 'view_feeding_tab',    'view',   'View Feeding Tab',                    8),
  ('animals', 'view_timeline',       'view',   'View Animal Timeline',                9),
  ('animals', 'add_newborn',         'create', 'Register Newborn Calf',              10),
  ('animals', 'add_purchased',       'create', 'Register Purchased Animal',          11),
  ('animals', 'import',              'create', 'Import Animals (CSV/Excel)',          12),
  ('animals', 'edit_profile',        'edit',   'Edit Animal Profile',                13),
  ('animals', 'update_weight',       'edit',   'Update Animal Weight',               14),
  ('animals', 'update_status',       'edit',   'Update Production Status',           15),
  ('animals', 'release',             'edit',   'Release Animal (Sell/Transfer/Cull)', 16),
  ('animals', 'manage_categories',   'edit',   'Manage Animal Categories',           17),
  ('animals', 'export',              'export', 'Export Animals List',                18),

  -- ── HEALTH ─────────────────────────────────────────────────────────────────
  ('health', 'view_records',         'view',   'View Health Records',                 1),
  ('health', 'view_stats',           'view',   'View Health Stats',                   2),
  ('health', 'view_vaccinations',    'view',   'View Vaccination Records',            3),
  ('health', 'view_veterinarians',   'view',   'View Veterinarians',                  4),
  ('health', 'view_protocols',       'view',   'View Health Protocols',               5),
  ('health', 'view_outbreaks',       'view',   'View Disease Outbreaks',              6),
  ('health', 'view_vet_visits',      'view',   'View Vet Visits',                     7),
  ('health', 'add_record',           'create', 'Add Health Record',                   8),
  ('health', 'report_issue',         'create', 'Report Health Issue',                 9),
  ('health', 'add_vet',              'create', 'Register Veterinarian',              10),
  ('health', 'schedule_vet_visit',   'create', 'Schedule Vet Visit',                 11),
  ('health', 'record_vaccination',   'create', 'Record Vaccination',                 12),
  ('health', 'open_outbreak',        'create', 'Create Disease Outbreak',            13),
  ('health', 'edit_record',          'edit',   'Edit Health Record',                 14),
  ('health', 'edit_vet',             'edit',   'Edit Veterinarian',                  15),
  ('health', 'manage_protocols',     'edit',   'Manage Health Protocols',            16),
  ('health', 'update_outbreak',      'edit',   'Update / Close Outbreak',            17),
  ('health', 'delete_record',        'delete', 'Delete Health Record',               18),
  ('health', 'delete_vet',           'delete', 'Delete Veterinarian',                19),
  ('health', 'export',               'export', 'Export Health Records',              20),

  -- ── PRODUCTION ─────────────────────────────────────────────────────────────
  ('production', 'view_records',             'view',   'View Production Records',      1),
  ('production', 'view_stats',               'view',   'View Production Stats',         2),
  ('production', 'view_charts',              'view',   'View Production Charts',        3),
  ('production', 'view_distribution',        'view',   'View Distribution Tab',         4),
  ('production', 'view_quality',             'view',   'View Quality Metrics',          5),
  ('production', 'record_yield',             'create', 'Record Milk Yield',             6),
  ('production', 'add_session',              'create', 'Add Milking Session',           7),
  ('production', 'edit_record',              'edit',   'Edit Production Record',        8),
  ('production', 'edit_session',             'edit',   'Edit Milking Session',          9),
  ('production', 'set_targets',              'edit',   'Set Production Targets',       10),
  ('production', 'configure_distribution',   'edit',   'Configure Distribution',       11),
  ('production', 'delete_record',            'delete', 'Delete Production Record',     12),
  ('production', 'delete_session',           'delete', 'Delete Milking Session',       13),
  ('production', 'export',                   'export', 'Export Production Data',       14),

  -- ── BREEDING ───────────────────────────────────────────────────────────────
  ('breeding', 'view_overview',          'view',   'View Breeding Overview',            1),
  ('breeding', 'view_calendar',          'view',   'View Breeding Calendar',            2),
  ('breeding', 'view_pregnant',          'view',   'View Pregnant Animals',             3),
  ('breeding', 'record_heat',            'create', 'Record Heat Detection',             4),
  ('breeding', 'record_insemination',    'create', 'Record Insemination',               5),
  ('breeding', 'record_pregnancy_check', 'create', 'Record Pregnancy Check',            6),
  ('breeding', 'record_calving',         'create', 'Record Calving Event',              7),
  ('breeding', 'register_calf',          'create', 'Register Newborn Calf',             8),
  ('breeding', 'edit_record',            'edit',   'Edit Breeding Record',              9),
  ('breeding', 'configure_settings',     'edit',   'Configure Breeding Settings',      10),
  ('breeding', 'delete_record',          'delete', 'Delete Breeding Record',           11),
  ('breeding', 'export',                 'export', 'Export Breeding Records',          12),

  -- ── FINANCIAL ──────────────────────────────────────────────────────────────
  ('financial', 'view_dashboard',       'view',   'View Financial Dashboard',           1),
  ('financial', 'view_transactions',    'view',   'View Transactions',                  2),
  ('financial', 'view_charts',          'view',   'View Financial Charts',              3),
  ('financial', 'add_income',           'create', 'Record Income',                      4),
  ('financial', 'add_expense',          'create', 'Record Expense',                     5),
  ('financial', 'edit_transaction',     'edit',   'Edit Transaction',                   6),
  ('financial', 'configure_categories', 'edit',   'Configure Categories',               7),
  ('financial', 'delete_transaction',   'delete', 'Delete Transaction',                 8),
  ('financial', 'export',               'export', 'Export Transactions',                9),

  -- ── INVENTORY ──────────────────────────────────────────────────────────────
  ('inventory', 'view_items',           'view',   'View Inventory Items',               1),
  ('inventory', 'view_stats',           'view',   'View Inventory Stats',               2),
  ('inventory', 'view_suppliers',       'view',   'View Suppliers',                     3),
  ('inventory', 'view_low_stock',       'view',   'View Low Stock Alerts',              4),
  ('inventory', 'add_item',             'create', 'Add Inventory Item',                 5),
  ('inventory', 'add_supplier',         'create', 'Add Supplier',                       6),
  ('inventory', 'edit_item',            'edit',   'Edit Inventory Item',                7),
  ('inventory', 'adjust_stock',         'edit',   'Adjust Stock Levels',                8),
  ('inventory', 'edit_supplier',        'edit',   'Edit Supplier',                      9),
  ('inventory', 'delete_item',          'delete', 'Delete Inventory Item',             10),
  ('inventory', 'delete_supplier',      'delete', 'Delete Supplier',                   11),
  ('inventory', 'export',               'export', 'Export Inventory Data',             12),

  -- ── EQUIPMENT ──────────────────────────────────────────────────────────────
  ('equipment', 'view_list',            'view',   'View Equipment List',                1),
  ('equipment', 'view_stats',           'view',   'View Equipment Stats',               2),
  ('equipment', 'view_maintenance',     'view',   'View Maintenance History',           3),
  ('equipment', 'add_equipment',        'create', 'Add Equipment',                      4),
  ('equipment', 'schedule_maintenance', 'create', 'Schedule Maintenance',               5),
  ('equipment', 'edit_equipment',       'edit',   'Edit Equipment',                     6),
  ('equipment', 'edit_maintenance',     'edit',   'Edit Maintenance Record',            7),
  ('equipment', 'delete_equipment',     'delete', 'Delete Equipment',                   8),
  ('equipment', 'delete_maintenance',   'delete', 'Delete Maintenance Record',          9),
  ('equipment', 'export',               'export', 'Export Equipment Data',             10),

  -- ── REPORTS ────────────────────────────────────────────────────────────────
  ('reports', 'view_overview',          'view',   'View Reports Overview',              1),
  ('reports', 'view_kpi',               'view',   'View KPI Dashboard',                 2),
  ('reports', 'view_trends',            'view',   'View Trend Analysis',                3),
  ('reports', 'view_custom',            'view',   'View Custom Reports',                4),
  ('reports', 'export_pdf',             'export', 'Export Report as PDF',               5),
  ('reports', 'export_excel',           'export', 'Export Report as Excel',             6),

  -- ── FEED ───────────────────────────────────────────────────────────────────
  ('feed', 'view_overview',             'view',   'View Feed Overview',                 1),
  ('feed', 'view_inventory',            'view',   'View Feed Inventory',                2),
  ('feed', 'view_consumption',          'view',   'View Feed Consumption',              3),
  ('feed', 'view_types',                'view',   'View Feed Types',                    4),
  ('feed', 'record_consumption',        'create', 'Record Feed Consumption',            5),
  ('feed', 'add_feed_type',             'create', 'Add Feed Type',                      6),
  ('feed', 'add_feeding_group',         'create', 'Add Feeding Group',                  7),
  ('feed', 'edit_feed_type',            'edit',   'Edit Feed Type',                     8),
  ('feed', 'edit_feeding_group',        'edit',   'Edit Feeding Group',                 9),
  ('feed', 'delete_feed_type',          'delete', 'Delete Feed Type',                  10),
  ('feed', 'delete_feeding_group',      'delete', 'Delete Feeding Group',              11),
  ('feed', 'export',                    'export', 'Export Feed Data',                  12),

  -- ── TEAM ───────────────────────────────────────────────────────────────────
  ('team', 'view_members',              'view',   'View Farm Team Members',             1),
  ('team', 'view_departments',          'view',   'View Departments',                   2),
  ('team', 'view_invitations',          'view',   'View Invitations',                   3),
  ('team', 'view_policies',             'view',   'View Access Policies',               4),
  ('team', 'view_system_users',         'view',   'View System Users',                  5),
  ('team', 'view_stats',                'view',   'View Team Stats',                    6),
  ('team', 'add_worker',                'create', 'Add Worker',                         7),
  ('team', 'add_department',            'create', 'Add Department',                     8),
  ('team', 'send_invitation',           'create', 'Send Invitation',                    9),
  ('team', 'create_policy',             'create', 'Create Access Policy',              10),
  ('team', 'edit_worker',               'edit',   'Edit Worker',                       11),
  ('team', 'edit_department',           'edit',   'Edit Department',                   12),
  ('team', 'assign_policy',             'edit',   'Assign Policy to Member',           13),
  ('team', 'edit_policy',               'edit',   'Edit Access Policy',                14),
  ('team', 'delete_worker',             'delete', 'Delete Worker',                     15),
  ('team', 'delete_department',         'delete', 'Delete Department',                 16),
  ('team', 'cancel_invitation',         'delete', 'Cancel Invitation',                 17),
  ('team', 'delete_policy',             'delete', 'Delete Access Policy',              18),

  -- ── DASHBOARD ──────────────────────────────────────────────────────────────
  ('dashboard', 'view_stats',               'view', 'View Dashboard Stats',             1),
  ('dashboard', 'view_alerts',              'view', 'View Critical Alerts',             2),
  ('dashboard', 'view_activity',            'view', 'View Recent Activity',             3),
  ('dashboard', 'view_management_cards',    'view', 'View Management Cards',            4),
  ('dashboard', 'view_team_panel',          'view', 'View Team Panel',                  5),

  -- ── SETTINGS ───────────────────────────────────────────────────────────────
  ('settings', 'view_hub',                    'view',   'View Settings Hub',            1),
  ('settings', 'create_backup',               'create', 'Create Data Backup',           2),
  ('settings', 'edit_farm_profile',           'edit',   'Edit Farm Profile',            3),
  ('settings', 'configure_tagging',           'edit',   'Configure Animal Tagging',     4),
  ('settings', 'configure_production',        'edit',   'Configure Production',         5),
  ('settings', 'configure_feed',              'edit',   'Configure Feed Settings',      6),
  ('settings', 'configure_health_breeding',   'edit',   'Configure Health & Breeding',  7),
  ('settings', 'configure_notifications',     'edit',   'Configure Notifications',      8),
  ('settings', 'configure_financial',         'edit',   'Configure Financial Settings', 9),
  ('settings', 'manage_subscription',         'edit',   'Manage Subscription & Billing',10),
  ('settings', 'download_backup',             'export', 'Download Backup',             11)

ON CONFLICT (resource, operation_key) DO NOTHING;


-- =============================================================================
-- STEP 4: Create the policy_operation_grants junction table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.policy_operation_grants (
  policy_id      UUID         NOT NULL
    REFERENCES access_control_policies(id) ON DELETE CASCADE,
  resource       VARCHAR(50)  NOT NULL,
  operation_key  VARCHAR(100) NOT NULL,

  CONSTRAINT policy_operation_grants_pkey
    PRIMARY KEY (policy_id, resource, operation_key),

  CONSTRAINT fk_resource_operation
    FOREIGN KEY (resource, operation_key)
    REFERENCES resource_operations(resource, operation_key)
    ON DELETE CASCADE
);

-- Index: "what can this policy do?" (most common query)
CREATE INDEX IF NOT EXISTS idx_pog_policy_id
  ON policy_operation_grants (policy_id);

-- Index: "what can this policy do within a specific resource?"
CREATE INDEX IF NOT EXISTS idx_pog_policy_resource
  ON policy_operation_grants (policy_id, resource);


-- =============================================================================
-- STEP 5: Migrate existing policy data
--         Convert old resource_actions JSONB → rows in policy_operation_grants
--
--         Old shape: { "animals": ["view","create","edit"], "health": ["view"] }
--         New shape: one row per (policy_id, resource, operation_key)
--
--         Mapping: old action → default operations granted for that action
--         "view"   → all 'view'   operations for that resource
--         "create" → all 'create' operations for that resource
--         "edit"   → all 'edit'   operations for that resource
--         "delete" → all 'delete' operations for that resource
--         "export" → all 'export' operations for that resource
--         "manage" → ALL operations for that resource (legacy 'manage' = full)
-- =============================================================================

INSERT INTO policy_operation_grants (policy_id, resource, operation_key)
SELECT DISTINCT
  p.id                   AS policy_id,
  ro.resource            AS resource,
  ro.operation_key       AS operation_key
FROM
  access_control_policies p,
  -- Expand _legacy_resource_actions JSONB into (resource, action) pairs
  LATERAL jsonb_each(p._legacy_resource_actions) AS ra(resource, actions),
  -- Expand the actions array for each resource
  LATERAL jsonb_array_elements_text(ra.actions) AS act(action),
  -- Join to resource_operations: grant all operations matching the action category
  resource_operations ro
WHERE
  ro.resource = ra.resource
  AND (
    ro.action_category = act.action   -- exact match: 'view' → view ops, etc.
    OR act.action = 'manage'          -- 'manage' = grant everything for that resource
  )
  AND ro.is_active = true
ON CONFLICT DO NOTHING;


-- =============================================================================
-- STEP 6: Enable RLS on new tables
-- =============================================================================

ALTER TABLE public.resource_operations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_operation_grants  ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- STEP 7: RLS policies for resource_operations
--         This is a public read-only catalogue — all authenticated users can
--         read it. Only database migrations can modify it (no app-level INSERT).
-- =============================================================================

CREATE POLICY "Authenticated users can read resource operations"
  ON resource_operations
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- No INSERT / UPDATE / DELETE policies = app users cannot modify the catalogue


-- =============================================================================
-- STEP 8: RLS policies for policy_operation_grants
-- =============================================================================

-- Farm owners and managers: full control over grants for their farm's policies
CREATE POLICY "Farm owners and managers can manage policy grants"
  ON policy_operation_grants
  FOR ALL
  USING (
    policy_id IN (
      SELECT acp.id
      FROM access_control_policies acp
      WHERE acp.farm_id IN (
        SELECT ur.farm_id
        FROM user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role_type IN ('farm_owner', 'farm_manager')
      )
    )
  );

-- Invited users: can read only the grants belonging to their assigned policy
CREATE POLICY "Users can read their own policy grants"
  ON policy_operation_grants
  FOR SELECT
  USING (
    policy_id IN (
      SELECT tmpa.policy_id
      FROM team_member_policy_assignments tmpa
      WHERE tmpa.user_role_id IN (
        SELECT ur.id
        FROM user_roles ur
        WHERE ur.user_id = auth.uid()
      )
    )
  );


-- =============================================================================
-- STEP 9: Update existing RLS on access_control_policies
--         The "Users can view their own assigned policy" policy was added in a
--         prior migration. No changes needed there.
--         Drop the old redundant SELECT policy that only covers farm_owner/manager
--         and replace with one that also covers assigned users.
-- =============================================================================

-- The existing two SELECT policies already cover this correctly:
--   1. "Users can view access control policies for their farms" (owners/managers)
--   2. "Users can view their own assigned policy" (assigned workers/vets)
-- No changes needed here.


-- =============================================================================
-- STEP 10: Drop the legacy columns now that data is migrated
-- =============================================================================

ALTER TABLE public.access_control_policies
  DROP COLUMN IF EXISTS _legacy_resources,
  DROP COLUMN IF EXISTS _legacy_actions,
  DROP COLUMN IF EXISTS _legacy_resource_actions;


-- =============================================================================
-- STEP 11: Add a helpful view (optional but useful)
--          policy_grants_summary: human-readable view of what each policy grants
-- =============================================================================

CREATE OR REPLACE VIEW public.policy_grants_summary AS
SELECT
  p.id            AS policy_id,
  p.farm_id,
  p.name          AS policy_name,
  p.role_type,
  p.is_granted,
  pog.resource,
  ro.action_category,
  pog.operation_key,
  ro.label        AS operation_label
FROM access_control_policies p
JOIN policy_operation_grants pog ON pog.policy_id = p.id
JOIN resource_operations     ro  ON ro.resource = pog.resource
                                AND ro.operation_key = pog.operation_key
ORDER BY p.name, pog.resource, ro.action_category, ro.sort_order;

COMMIT;
