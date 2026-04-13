// src/lib/utils/permissions.ts
// Builds typed FarmPermissions flags from a policy's operation grants.
// Input shape: { resource: operation_key[] }
// e.g. { animals: ['view_list', 'add_newborn', 'edit_profile'], health: ['view_records'] }

// ─────────────────────────────────────────────────────────────────────────────
// Static map: resource → operation_key → action_category
// This is the client-side mirror of the resource_operations DB table.
// When new operations are added to the DB, add them here too.
// ─────────────────────────────────────────────────────────────────────────────
export const OPERATION_CATEGORIES: Record<string, Record<string, string>> = {
  animals: {
    // view
    view_list: 'view', view_stats: 'view', view_profile: 'view',
    view_overview_tab: 'view', view_health_tab: 'view', view_breeding_tab: 'view',
    view_production_tab: 'view', view_feeding_tab: 'view', view_timeline: 'view',
    // create
    add_newborn: 'create', add_purchased: 'create', import: 'create',
    // edit
    edit_profile: 'edit', update_weight: 'edit', update_status: 'edit',
    release: 'edit', manage_categories: 'edit',
    // export
    export: 'export',
  },
  health: {
    // view
    view_records: 'view', view_stats: 'view', view_vaccinations: 'view',
    view_veterinarians: 'view', view_protocols: 'view',
    view_outbreaks: 'view', view_vet_visits: 'view',
    // create
    add_record: 'create', report_issue: 'create', add_vet: 'create',
    schedule_vet_visit: 'create', record_vaccination: 'create', open_outbreak: 'create',
    // edit
    edit_record: 'edit', edit_vet: 'edit', manage_protocols: 'edit', update_outbreak: 'edit',
    // delete
    delete_record: 'delete', delete_vet: 'delete',
    // export
    export: 'export',
  },
  production: {
    // view
    view_records: 'view', view_stats: 'view', view_charts: 'view',
    view_distribution: 'view', view_quality: 'view',
    // create
    record_yield: 'create', add_session: 'create',
    // edit
    edit_record: 'edit', edit_session: 'edit',
    set_targets: 'edit', configure_distribution: 'edit',
    // delete
    delete_record: 'delete', delete_session: 'delete',
    // export
    export: 'export',
  },
  breeding: {
    // view
    view_overview: 'view', view_calendar: 'view', view_pregnant: 'view',
    // create
    record_heat: 'create', record_insemination: 'create',
    record_pregnancy_check: 'create', record_calving: 'create', register_calf: 'create',
    // edit
    edit_record: 'edit', configure_settings: 'edit',
    // delete
    delete_record: 'delete',
    // export
    export: 'export',
  },
  financial: {
    // view
    view_dashboard: 'view', view_transactions: 'view', view_charts: 'view',
    // create
    add_income: 'create', add_expense: 'create',
    // edit
    edit_transaction: 'edit', configure_categories: 'edit',
    // delete
    delete_transaction: 'delete',
    // export
    export: 'export',
  },
  inventory: {
    // view
    view_items: 'view', view_stats: 'view', view_suppliers: 'view', view_low_stock: 'view',
    // create
    add_item: 'create', add_supplier: 'create',
    // edit
    edit_item: 'edit', adjust_stock: 'edit', edit_supplier: 'edit',
    // delete
    delete_item: 'delete', delete_supplier: 'delete',
    // export
    export: 'export',
  },
  equipment: {
    // view
    view_list: 'view', view_stats: 'view', view_maintenance: 'view',
    // create
    add_equipment: 'create', schedule_maintenance: 'create',
    // edit
    edit_equipment: 'edit', edit_maintenance: 'edit',
    // delete
    delete_equipment: 'delete', delete_maintenance: 'delete',
    // export
    export: 'export',
  },
  reports: {
    // view
    view_overview: 'view', view_kpi: 'view', view_trends: 'view', view_custom: 'view',
    // export
    export_pdf: 'export', export_excel: 'export',
  },
  feed: {
    // view
    view_overview: 'view', view_inventory: 'view', view_consumption: 'view', view_types: 'view',
    view_conversions: 'view',
    // create
    record_consumption: 'create', add_feed_type: 'create', add_feeding_group: 'create',
    add_weight_conversion: 'create',
    // edit
    edit_feed_type: 'edit', edit_feeding_group: 'edit',
    edit_weight_conversion: 'edit',
    // delete
    delete_feed_type: 'delete', delete_feeding_group: 'delete',
    delete_weight_conversion: 'delete',
    // export
    export: 'export',
  },
  team: {
    // view
    view_members: 'view', view_departments: 'view', view_invitations: 'view',
    view_policies: 'view', view_system_users: 'view', view_stats: 'view',
    // create
    add_worker: 'create', add_department: 'create',
    send_invitation: 'create', create_policy: 'create',
    // edit
    edit_worker: 'edit', edit_department: 'edit',
    assign_policy: 'edit', edit_policy: 'edit',
    // delete
    delete_worker: 'delete', delete_department: 'delete',
    cancel_invitation: 'delete', delete_policy: 'delete',
  },
  dashboard: {
    // view only
    view_stats: 'view', view_alerts: 'view', view_activity: 'view',
    view_management_cards: 'view', view_team_panel: 'view',
  },
  settings: {
    // view
    view_hub: 'view',
    // create
    create_backup: 'create',
    // edit
    edit_farm_profile: 'edit', configure_tagging: 'edit',
    configure_production: 'edit', configure_feed: 'edit',
    configure_health_breeding: 'edit', configure_notifications: 'edit',
    configure_financial: 'edit', manage_subscription: 'edit',
    // export
    download_backup: 'export',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// FarmPermissions — typed boolean flags consumed by components.
// Backward-compatible: same flag names as before, now derived from operations.
// ─────────────────────────────────────────────────────────────────────────────
export interface FarmPermissions {
  // Animals
  canViewAnimals: boolean
  canCreateAnimals: boolean
  canEditAnimals: boolean
  canDeleteAnimals: boolean
  canExportAnimals: boolean
  canManageAnimals: boolean   // manage_categories

  // Health
  canViewHealth: boolean
  canCreateHealth: boolean
  canEditHealth: boolean
  canDeleteHealth: boolean
  canExportHealth: boolean
  canManageHealth: boolean    // manage_protocols

  // Production
  canViewProduction: boolean
  canCreateProduction: boolean
  canEditProduction: boolean
  canDeleteProduction: boolean
  canExportProduction: boolean
  canManageProduction: boolean  // configure_distribution / set_targets

  // Breeding
  canViewBreeding: boolean
  canCreateBreeding: boolean
  canEditBreeding: boolean
  canDeleteBreeding: boolean
  canExportBreeding: boolean
  canManageBreeding: boolean    // configure_settings

  // Financial
  canViewFinancial: boolean
  canCreateFinancial: boolean
  canEditFinancial: boolean
  canDeleteFinancial: boolean
  canExportFinancial: boolean
  canManageFinancial: boolean   // configure_categories

  // Inventory
  canViewInventory: boolean
  canCreateInventory: boolean
  canEditInventory: boolean
  canDeleteInventory: boolean
  canExportInventory: boolean
  canManageInventory: boolean   // adjust_stock

  // Equipment
  canViewEquipment: boolean
  canCreateEquipment: boolean
  canEditEquipment: boolean
  canDeleteEquipment: boolean
  canExportEquipment: boolean
  canManageEquipment: boolean   // edit_equipment

  // Feed
  canViewFeed: boolean
  canCreateFeed: boolean
  canEditFeed: boolean
  canDeleteFeed: boolean
  canExportFeed: boolean

  // Reports
  canViewReports: boolean
  canExportReports: boolean

  // Team
  canViewTeam: boolean
  canCreateTeam: boolean
  canEditTeam: boolean
  canDeleteTeam: boolean
  canManageTeam: boolean        // assign_policy / create_policy

  // Dashboard
  canViewDashboard: boolean

  // Settings
  canViewSettings: boolean
  canEditSettings: boolean
  canManageSettings: boolean    // any edit settings operation
}

// ─────────────────────────────────────────────────────────────────────────────
// buildPermissions
//
// Converts a policy's operation grants into typed FarmPermissions flags.
// Input: { resource: operation_key[] }
//   e.g. { animals: ['view_list', 'add_newborn'], health: ['view_records'] }
// ─────────────────────────────────────────────────────────────────────────────
export function buildPermissions(
  operations: Record<string, string[]> | null | undefined
): FarmPermissions {
  // Returns true if any of the listed operation_keys for a resource has the given category
  const hasCategory = (resource: string, category: string): boolean => {
    const ops = operations?.[resource] ?? []
    const catMap = OPERATION_CATEGORIES[resource] ?? {}
    return ops.some(op => catMap[op] === category)
  }

  // Returns true if a specific operation_key is granted for a resource
  const hasOp = (resource: string, operationKey: string): boolean => {
    return (operations?.[resource] ?? []).includes(operationKey)
  }

  return {
    // Animals
    canViewAnimals:    hasCategory('animals', 'view'),
    canCreateAnimals:  hasCategory('animals', 'create'),
    canEditAnimals:    hasCategory('animals', 'edit'),
    canDeleteAnimals:  hasCategory('animals', 'delete'),
    canExportAnimals:  hasCategory('animals', 'export'),
    canManageAnimals:  hasOp('animals', 'manage_categories'),

    // Health
    canViewHealth:    hasCategory('health', 'view'),
    canCreateHealth:  hasCategory('health', 'create'),
    canEditHealth:    hasCategory('health', 'edit'),
    canDeleteHealth:  hasCategory('health', 'delete'),
    canExportHealth:  hasCategory('health', 'export'),
    canManageHealth:  hasOp('health', 'manage_protocols'),

    // Production
    canViewProduction:    hasCategory('production', 'view'),
    canCreateProduction:  hasCategory('production', 'create'),
    canEditProduction:    hasCategory('production', 'edit'),
    canDeleteProduction:  hasCategory('production', 'delete'),
    canExportProduction:  hasCategory('production', 'export'),
    canManageProduction:  hasOp('production', 'configure_distribution') || hasOp('production', 'set_targets'),

    // Breeding
    canViewBreeding:    hasCategory('breeding', 'view'),
    canCreateBreeding:  hasCategory('breeding', 'create'),
    canEditBreeding:    hasCategory('breeding', 'edit'),
    canDeleteBreeding:  hasCategory('breeding', 'delete'),
    canExportBreeding:  hasCategory('breeding', 'export'),
    canManageBreeding:  hasOp('breeding', 'configure_settings'),

    // Financial
    canViewFinancial:    hasCategory('financial', 'view'),
    canCreateFinancial:  hasCategory('financial', 'create'),
    canEditFinancial:    hasCategory('financial', 'edit'),
    canDeleteFinancial:  hasCategory('financial', 'delete'),
    canExportFinancial:  hasCategory('financial', 'export'),
    canManageFinancial:  hasOp('financial', 'configure_categories'),

    // Inventory
    canViewInventory:    hasCategory('inventory', 'view'),
    canCreateInventory:  hasCategory('inventory', 'create'),
    canEditInventory:    hasCategory('inventory', 'edit'),
    canDeleteInventory:  hasCategory('inventory', 'delete'),
    canExportInventory:  hasCategory('inventory', 'export'),
    canManageInventory:  hasOp('inventory', 'adjust_stock'),

    // Equipment
    canViewEquipment:    hasCategory('equipment', 'view'),
    canCreateEquipment:  hasCategory('equipment', 'create'),
    canEditEquipment:    hasCategory('equipment', 'edit'),
    canDeleteEquipment:  hasCategory('equipment', 'delete'),
    canExportEquipment:  hasCategory('equipment', 'export'),
    canManageEquipment:  hasCategory('equipment', 'edit'),

    // Feed
    canViewFeed:    hasCategory('feed', 'view'),
    canCreateFeed:  hasCategory('feed', 'create'),
    canEditFeed:    hasCategory('feed', 'edit'),
    canDeleteFeed:  hasCategory('feed', 'delete'),
    canExportFeed:  hasCategory('feed', 'export'),

    // Reports
    canViewReports:   hasCategory('reports', 'view'),
    canExportReports: hasCategory('reports', 'export'),

    // Team
    canViewTeam:    hasCategory('team', 'view'),
    canCreateTeam:  hasCategory('team', 'create'),
    canEditTeam:    hasCategory('team', 'edit'),
    canDeleteTeam:  hasCategory('team', 'delete'),
    canManageTeam:  hasOp('team', 'assign_policy') || hasOp('team', 'create_policy'),

    // Dashboard
    canViewDashboard: hasCategory('dashboard', 'view'),

    // Settings
    canViewSettings:    hasCategory('settings', 'view'),
    canEditSettings:    hasCategory('settings', 'edit'),
    canManageSettings:  hasCategory('settings', 'edit'),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pre-built constants
// ─────────────────────────────────────────────────────────────────────────────

/** All operations across every resource — used for farm_owner fallback */
const ALL_OPERATIONS: Record<string, string[]> = Object.fromEntries(
  Object.entries(OPERATION_CATEGORIES).map(([resource, ops]) => [resource, Object.keys(ops)])
)

/** Full access — farm_owner default when no policy row exists */
export const FULL_ACCESS_PERMISSIONS: FarmPermissions = buildPermissions(ALL_OPERATIONS)

/** No access — deny-by-default for uninvited users */
export const NO_ACCESS_PERMISSIONS: FarmPermissions = buildPermissions({})
