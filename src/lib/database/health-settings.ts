// lib/database/health-settings.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'

export interface HealthSettings {
  // 1. GENERAL HEALTH MANAGEMENT
  defaultVeterinarianId?: string
  requireVetApprovalForCritical: boolean
  autoAssignHealthStatus: boolean
  healthStatusUpdateMethod: 'auto' | 'manual' | 'vet_only'
  
  // 2. HEALTH MONITORING & CHECKUPS
  enableRoutineCheckups: boolean
  routineCheckupInterval: number // days
  checkupReminderDaysBefore: number
  vitalsTrackingEnabled: boolean
  requiredVitals: ('temperature' | 'pulse' | 'respiration' | 'weight' | 'bcs')[]
  bodyConditionScoreSystem: '1-5' | '1-9'
  temperatureUnit: 'celsius' | 'fahrenheit'
  weightUnit: 'kg' | 'lbs'
  
  // 3. VACCINATION MANAGEMENT
  enableVaccinationSchedules: boolean
  vaccinationReminderDaysBefore: number
  autoCreateVaccinationReminders: boolean
  requireBatchNumberTracking: boolean
  requireVetForVaccinations: boolean
  defaultVaccinationRoute: 'intramuscular' | 'subcutaneous' | 'intranasal' | 'oral'
  trackVaccineInventory: boolean
  overdueVaccinationAlert: boolean
  overdueVaccinationDays: number
  
  // 4. DISEASE & OUTBREAK MANAGEMENT
  enableOutbreakTracking: boolean
  autoQuarantineOnOutbreak: boolean
  quarantineDurationDays: number
  requireLabTestsForCriticalIllness: boolean
  diseaseNotificationMethod: ('app' | 'sms' | 'email' | 'whatsapp')[]
  isolationAreaRequired: boolean
  autoCreateTreatmentProtocol: boolean
  
  // 5. TREATMENT & MEDICATION
  requirePrescriptionForMedication: boolean
  trackMedicationInventory: boolean
  withdrawalPeriodTracking: boolean
  autoCalculateWithdrawal: boolean
  defaultWithdrawalPeriodDays: number
  medicationCostTracking: boolean
  requireDosageCalculation: boolean
  dosageCalculationBy: 'weight' | 'age' | 'fixed'
  
  // 6. FOLLOW-UP MANAGEMENT
  enableAutomaticFollowUps: boolean
  followUpIntervalDays: number
  followUpReminderDaysBefore: number
  maxFollowUpsBeforeResolution: number
  autoResolveOnRecovery: boolean
  requireVetForResolution: boolean
  
  // 7. VETERINARY VISITS
  enableVetVisitScheduling: boolean
  visitReminderDaysBefore: number
  requireVisitConfirmation: boolean
  emergencyVisitPriority: boolean
  travelRadiusKm: number
  preferredVisitTime: 'morning' | 'afternoon' | 'evening' | 'any'
  
  // 8. HEALTH PROTOCOLS
  enableStandardProtocols: boolean
  protocolAutoExecution: boolean
  requireProtocolApproval: boolean
  protocolApprovalBy: 'farm_owner' | 'farm_manager' | 'veterinarian'
  
  // 9. DEWORMING MANAGEMENT
  enableDewormingSchedule: boolean
  dewormingIntervalMonths: number
  dewormingReminderDaysBefore: number
  defaultDewormingProduct?: string
  dewormingByWeight: boolean
  
  // 10. HEALTH RECORDS & DOCUMENTATION
  requirePhotosForInjuries: boolean
  requireLabResultsUpload: boolean
  healthRecordRetentionYears: number
  exportFormat: 'pdf' | 'excel' | 'both'
  includePhotosInExport: boolean
  
  // 11. COST MANAGEMENT
  trackHealthExpenses: boolean
  defaultCurrency: 'KES' | 'USD' | 'EUR' | 'GBP'
  budgetAlertThreshold?: number
  costCategories: ('consultation' | 'medication' | 'vaccination' | 'surgery' | 'lab_tests' | 'emergency')[]
  
  // 12. ALERTS & NOTIFICATIONS
  healthAlerts: {
    checkupReminders: boolean
    vaccinationDue: boolean
    followUpRequired: boolean
    criticalHealthStatus: boolean
    outbreakDetected: boolean
    vetVisitScheduled: boolean
    medicationReminder: boolean
    withdrawalPeriodEnd: boolean
  }
  alertDeliveryMethods: ('app' | 'sms' | 'email' | 'whatsapp')[]
  criticalAlertEscalation: boolean
  escalationDelayHours: number
  
  // 13. ANIMAL-SPECIFIC SETTINGS
  enableAnimalSpecificProtocols: boolean
  ageBasedHealthPlans: boolean
  breedSpecificGuidelines: boolean
  productionStageConsideration: boolean
  
  // 14. DATA PRIVACY & COMPLIANCE
  shareDataWithVet: boolean
  allowVetRemoteAccess: boolean
  requireDataBackup: boolean
  backupFrequency: 'daily' | 'weekly' | 'monthly'
  gdprCompliance: boolean
  
  // 15. INTEGRATION SETTINGS
  syncWithBreedingRecords: boolean
  syncWithProductionRecords: boolean
  syncWithFeedingRecords: boolean
  autoUpdateAnimalStatus: boolean
}

export async function getHealthSettings(farmId: string): Promise<HealthSettings | null> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('farm_health_settings')
      .select('*')
      .eq('farm_id', farmId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return getDefaultHealthSettings()
      }
      throw error
    }

    return transformDbToHealthSettings(data)
  } catch (error) {
    console.error('Error fetching health settings:', error)
    return getDefaultHealthSettings()
  }
}

export function getDefaultHealthSettings(): HealthSettings {
  return {
    // General Health Management
    defaultVeterinarianId: undefined,
    requireVetApprovalForCritical: true,
    autoAssignHealthStatus: true,
    healthStatusUpdateMethod: 'auto',
    
    // Health Monitoring & Checkups
    enableRoutineCheckups: true,
    routineCheckupInterval: 90,
    checkupReminderDaysBefore: 7,
    vitalsTrackingEnabled: true,
    requiredVitals: ['temperature', 'weight'],
    bodyConditionScoreSystem: '1-5',
    temperatureUnit: 'celsius',
    weightUnit: 'kg',
    
    // Vaccination Management
    enableVaccinationSchedules: true,
    vaccinationReminderDaysBefore: 14,
    autoCreateVaccinationReminders: true,
    requireBatchNumberTracking: true,
    requireVetForVaccinations: false,
    defaultVaccinationRoute: 'intramuscular',
    trackVaccineInventory: true,
    overdueVaccinationAlert: true,
    overdueVaccinationDays: 7,
    
    // Disease & Outbreak Management
    enableOutbreakTracking: true,
    autoQuarantineOnOutbreak: true,
    quarantineDurationDays: 14,
    requireLabTestsForCriticalIllness: true,
    diseaseNotificationMethod: ['app', 'sms'],
    isolationAreaRequired: true,
    autoCreateTreatmentProtocol: false,
    
    // Treatment & Medication
    requirePrescriptionForMedication: false,
    trackMedicationInventory: true,
    withdrawalPeriodTracking: true,
    autoCalculateWithdrawal: true,
    defaultWithdrawalPeriodDays: 7,
    medicationCostTracking: true,
    requireDosageCalculation: true,
    dosageCalculationBy: 'weight',
    
    // Follow-up Management
    enableAutomaticFollowUps: true,
    followUpIntervalDays: 7,
    followUpReminderDaysBefore: 2,
    maxFollowUpsBeforeResolution: 5,
    autoResolveOnRecovery: false,
    requireVetForResolution: false,
    
    // Veterinary Visits
    enableVetVisitScheduling: true,
    visitReminderDaysBefore: 3,
    requireVisitConfirmation: false,
    emergencyVisitPriority: true,
    travelRadiusKm: 50,
    preferredVisitTime: 'morning',
    
    // Health Protocols
    enableStandardProtocols: true,
    protocolAutoExecution: false,
    requireProtocolApproval: true,
    protocolApprovalBy: 'farm_manager',
    
    // Deworming Management
    enableDewormingSchedule: true,
    dewormingIntervalMonths: 3,
    dewormingReminderDaysBefore: 7,
    defaultDewormingProduct: undefined,
    dewormingByWeight: true,
    
    // Health Records & Documentation
    requirePhotosForInjuries: false,
    requireLabResultsUpload: false,
    healthRecordRetentionYears: 5,
    exportFormat: 'both',
    includePhotosInExport: false,
    
    // Cost Management
    trackHealthExpenses: true,
    defaultCurrency: 'KES',
    budgetAlertThreshold: undefined,
    costCategories: ['consultation', 'medication', 'vaccination', 'surgery', 'lab_tests', 'emergency'],
    
    // Alerts & Notifications
    healthAlerts: {
      checkupReminders: true,
      vaccinationDue: true,
      followUpRequired: true,
      criticalHealthStatus: true,
      outbreakDetected: true,
      vetVisitScheduled: true,
      medicationReminder: true,
      withdrawalPeriodEnd: true
    },
    alertDeliveryMethods: ['app', 'sms'],
    criticalAlertEscalation: true,
    escalationDelayHours: 2,
    
    // Animal-Specific Settings
    enableAnimalSpecificProtocols: false,
    ageBasedHealthPlans: true,
    breedSpecificGuidelines: false,
    productionStageConsideration: true,
    
    // Data Privacy & Compliance
    shareDataWithVet: true,
    allowVetRemoteAccess: false,
    requireDataBackup: true,
    backupFrequency: 'weekly',
    gdprCompliance: false,
    
    // Integration Settings
    syncWithBreedingRecords: true,
    syncWithProductionRecords: true,
    syncWithFeedingRecords: false,
    autoUpdateAnimalStatus: true
  }
}

function transformDbToHealthSettings(data: any): HealthSettings {
  return {
    defaultVeterinarianId: data.default_veterinarian_id,
    requireVetApprovalForCritical: data.require_vet_approval_for_critical,
    autoAssignHealthStatus: data.auto_assign_health_status,
    healthStatusUpdateMethod: data.health_status_update_method,
    
    enableRoutineCheckups: data.enable_routine_checkups,
    routineCheckupInterval: data.routine_checkup_interval,
    checkupReminderDaysBefore: data.checkup_reminder_days_before,
    vitalsTrackingEnabled: data.vitals_tracking_enabled,
    requiredVitals: data.required_vitals,
    bodyConditionScoreSystem: data.body_condition_score_system,
    temperatureUnit: data.temperature_unit,
    weightUnit: data.weight_unit,
    
    enableVaccinationSchedules: data.enable_vaccination_schedules,
    vaccinationReminderDaysBefore: data.vaccination_reminder_days_before,
    autoCreateVaccinationReminders: data.auto_create_vaccination_reminders,
    requireBatchNumberTracking: data.require_batch_number_tracking,
    requireVetForVaccinations: data.require_vet_for_vaccinations,
    defaultVaccinationRoute: data.default_vaccination_route,
    trackVaccineInventory: data.track_vaccine_inventory,
    overdueVaccinationAlert: data.overdue_vaccination_alert,
    overdueVaccinationDays: data.overdue_vaccination_days,
    
    enableOutbreakTracking: data.enable_outbreak_tracking,
    autoQuarantineOnOutbreak: data.auto_quarantine_on_outbreak,
    quarantineDurationDays: data.quarantine_duration_days,
    requireLabTestsForCriticalIllness: data.require_lab_tests_for_critical_illness,
    diseaseNotificationMethod: data.disease_notification_method,
    isolationAreaRequired: data.isolation_area_required,
    autoCreateTreatmentProtocol: data.auto_create_treatment_protocol,
    
    requirePrescriptionForMedication: data.require_prescription_for_medication,
    trackMedicationInventory: data.track_medication_inventory,
    withdrawalPeriodTracking: data.withdrawal_period_tracking,
    autoCalculateWithdrawal: data.auto_calculate_withdrawal,
    defaultWithdrawalPeriodDays: data.default_withdrawal_period_days,
    medicationCostTracking: data.medication_cost_tracking,
    requireDosageCalculation: data.require_dosage_calculation,
    dosageCalculationBy: data.dosage_calculation_by,
    
    enableAutomaticFollowUps: data.enable_automatic_follow_ups,
    followUpIntervalDays: data.follow_up_interval_days,
    followUpReminderDaysBefore: data.follow_up_reminder_days_before,
    maxFollowUpsBeforeResolution: data.max_follow_ups_before_resolution,
    autoResolveOnRecovery: data.auto_resolve_on_recovery,
    requireVetForResolution: data.require_vet_for_resolution,
    
    enableVetVisitScheduling: data.enable_vet_visit_scheduling,
    visitReminderDaysBefore: data.visit_reminder_days_before,
    requireVisitConfirmation: data.require_visit_confirmation,
    emergencyVisitPriority: data.emergency_visit_priority,
    travelRadiusKm: data.travel_radius_km,
    preferredVisitTime: data.preferred_visit_time,
    
    enableStandardProtocols: data.enable_standard_protocols,
    protocolAutoExecution: data.protocol_auto_execution,
    requireProtocolApproval: data.require_protocol_approval,
    protocolApprovalBy: data.protocol_approval_by,
    
    enableDewormingSchedule: data.enable_deworming_schedule,
    dewormingIntervalMonths: data.deworming_interval_months,
    dewormingReminderDaysBefore: data.deworming_reminder_days_before,
    defaultDewormingProduct: data.default_deworming_product,
    dewormingByWeight: data.deworming_by_weight,
    
    requirePhotosForInjuries: data.require_photos_for_injuries,
    requireLabResultsUpload: data.require_lab_results_upload,
    healthRecordRetentionYears: data.health_record_retention_years,
    exportFormat: data.export_format,
    includePhotosInExport: data.include_photos_in_export,
    
    trackHealthExpenses: data.track_health_expenses,
    defaultCurrency: data.default_currency,
    budgetAlertThreshold: data.budget_alert_threshold,
    costCategories: data.cost_categories,
    
    healthAlerts: data.health_alerts,
    alertDeliveryMethods: data.alert_delivery_methods,
    criticalAlertEscalation: data.critical_alert_escalation,
    escalationDelayHours: data.escalation_delay_hours,
    
    enableAnimalSpecificProtocols: data.enable_animal_specific_protocols,
    ageBasedHealthPlans: data.age_based_health_plans,
    breedSpecificGuidelines: data.breed_specific_guidelines,
    productionStageConsideration: data.production_stage_consideration,
    
    shareDataWithVet: data.share_data_with_vet,
    allowVetRemoteAccess: data.allow_vet_remote_access,
    requireDataBackup: data.require_data_backup,
    backupFrequency: data.backup_frequency,
    gdprCompliance: data.gdpr_compliance,
    
    syncWithBreedingRecords: data.sync_with_breeding_records,
    syncWithProductionRecords: data.sync_with_production_records,
    syncWithFeedingRecords: data.sync_with_feeding_records,
    autoUpdateAnimalStatus: data.auto_update_animal_status
  }
}

export async function updateHealthSettings(
  farmId: string,
  settings: HealthSettings
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient()

    const dbSettings = {
      farm_id: farmId,
      default_veterinarian_id: settings.defaultVeterinarianId,
      require_vet_approval_for_critical: settings.requireVetApprovalForCritical,
      auto_assign_health_status: settings.autoAssignHealthStatus,
      health_status_update_method: settings.healthStatusUpdateMethod,
      enable_routine_checkups: settings.enableRoutineCheckups,
      routine_checkup_interval: settings.routineCheckupInterval,
      checkup_reminder_days_before: settings.checkupReminderDaysBefore,
      vitals_tracking_enabled: settings.vitalsTrackingEnabled,
      required_vitals: settings.requiredVitals,
      body_condition_score_system: settings.bodyConditionScoreSystem,
      temperature_unit: settings.temperatureUnit,
      weight_unit: settings.weightUnit,
      enable_vaccination_schedules: settings.enableVaccinationSchedules,
      vaccination_reminder_days_before: settings.vaccinationReminderDaysBefore,
      auto_create_vaccination_reminders: settings.autoCreateVaccinationReminders,
      require_batch_number_tracking: settings.requireBatchNumberTracking,
      require_vet_for_vaccinations: settings.requireVetForVaccinations,
      default_vaccination_route: settings.defaultVaccinationRoute,
      track_vaccine_inventory: settings.trackVaccineInventory,
      overdue_vaccination_alert: settings.overdueVaccinationAlert,
      overdue_vaccination_days: settings.overdueVaccinationDays,
      enable_outbreak_tracking: settings.enableOutbreakTracking,
      auto_quarantine_on_outbreak: settings.autoQuarantineOnOutbreak,
      quarantine_duration_days: settings.quarantineDurationDays,
      require_lab_tests_for_critical_illness: settings.requireLabTestsForCriticalIllness,
      disease_notification_method: settings.diseaseNotificationMethod,
      isolation_area_required: settings.isolationAreaRequired,
      auto_create_treatment_protocol: settings.autoCreateTreatmentProtocol,
      require_prescription_for_medication: settings.requirePrescriptionForMedication,
      track_medication_inventory: settings.trackMedicationInventory,
      withdrawal_period_tracking: settings.withdrawalPeriodTracking,
      auto_calculate_withdrawal: settings.autoCalculateWithdrawal,
      default_withdrawal_period_days: settings.defaultWithdrawalPeriodDays,
      medication_cost_tracking: settings.medicationCostTracking,
      require_dosage_calculation: settings.requireDosageCalculation,
      dosage_calculation_by: settings.dosageCalculationBy,
      enable_automatic_follow_ups: settings.enableAutomaticFollowUps,
      follow_up_interval_days: settings.followUpIntervalDays,
      follow_up_reminder_days_before: settings.followUpReminderDaysBefore,
      max_follow_ups_before_resolution: settings.maxFollowUpsBeforeResolution,
      auto_resolve_on_recovery: settings.autoResolveOnRecovery,
      require_vet_for_resolution: settings.requireVetForResolution,
      enable_vet_visit_scheduling: settings.enableVetVisitScheduling,
      visit_reminder_days_before: settings.visitReminderDaysBefore,
      require_visit_confirmation: settings.requireVisitConfirmation,
      emergency_visit_priority: settings.emergencyVisitPriority,
      travel_radius_km: settings.travelRadiusKm,
      preferred_visit_time: settings.preferredVisitTime,
      enable_standard_protocols: settings.enableStandardProtocols,
      protocol_auto_execution: settings.protocolAutoExecution,
      require_protocol_approval: settings.requireProtocolApproval,
      protocol_approval_by: settings.protocolApprovalBy,
      enable_deworming_schedule: settings.enableDewormingSchedule,
      deworming_interval_months: settings.dewormingIntervalMonths,
      deworming_reminder_days_before: settings.dewormingReminderDaysBefore,
      default_deworming_product: settings.defaultDewormingProduct,
      deworming_by_weight: settings.dewormingByWeight,
      require_photos_for_injuries: settings.requirePhotosForInjuries,
      require_lab_results_upload: settings.requireLabResultsUpload,
      health_record_retention_years: settings.healthRecordRetentionYears,
      export_format: settings.exportFormat,
      include_photos_in_export: settings.includePhotosInExport,
      track_health_expenses: settings.trackHealthExpenses,
      default_currency: settings.defaultCurrency,
      budget_alert_threshold: settings.budgetAlertThreshold,
      cost_categories: settings.costCategories,
      health_alerts: settings.healthAlerts,
      alert_delivery_methods: settings.alertDeliveryMethods,
      critical_alert_escalation: settings.criticalAlertEscalation,
      escalation_delay_hours: settings.escalationDelayHours,
      enable_animal_specific_protocols: settings.enableAnimalSpecificProtocols,
      age_based_health_plans: settings.ageBasedHealthPlans,
      breed_specific_guidelines: settings.breedSpecificGuidelines,
      production_stage_consideration: settings.productionStageConsideration,
      share_data_with_vet: settings.shareDataWithVet,
      allow_vet_remote_access: settings.allowVetRemoteAccess,
      require_data_backup: settings.requireDataBackup,
      backup_frequency: settings.backupFrequency,
      gdpr_compliance: settings.gdprCompliance,
      sync_with_breeding_records: settings.syncWithBreedingRecords,
      sync_with_production_records: settings.syncWithProductionRecords,
      sync_with_feeding_records: settings.syncWithFeedingRecords,
      auto_update_animal_status: settings.autoUpdateAnimalStatus,
      updated_at: new Date().toISOString()
    }

    const { error } = await (supabase
      .from('farm_health_settings') as any)
      .upsert(dbSettings, { onConflict: 'farm_id' })

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error updating health settings:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update settings'
    }
  }
}