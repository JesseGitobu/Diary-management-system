// lib/database/production-settings.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ProductionSettings, getDefaultProductionSettings } from '@/types/production-distribution-settings'

// Helper functions to convert between period string format and numeric days
function convertChartPeriodToNumbers(period: string | number): number {
  if (typeof period === 'number') return period
  switch (period) {
    case '7days': return 7
    case '14days': return 14
    case '30days': return 30
    case '60days': return 60
    case '90days': return 90
    case 'year': return 365
    default: return 30
  }
}

function convertChartNumbersToPeriod(days: number | string): '7days' | '14days' | '30days' | '60days' | '90days' | 'year' {
  const numDays = typeof days === 'string' ? parseInt(days) : days
  switch (numDays) {
    case 7: return '7days'
    case 14: return '14days'
    case 30: return '30days'
    case 60: return '60days'
    case 90: return '90days'
    case 365: return 'year'
    default: return '30days'
  }
}

export async function getProductionSettings(farmId: string): Promise<ProductionSettings | null> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('farm_production_settings')
      .select('*')
      .eq('farm_id', farmId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return getDefaultProductionSettings()
      }
      throw error
    }

    return transformDbToProductionSettings(data)
  } catch (error) {
    console.error('Error fetching production settings:', error)
    return getDefaultProductionSettings()
  }
}

function transformDbToProductionSettings(data: any): ProductionSettings {
  return {
    productionTrackingMode: data.production_tracking_mode,
    enableProductionTracking: data.enable_production_tracking,
    defaultRecordingMethod: data.default_recording_method,
    productionUnit: data.production_unit,
    
    milkingSessions: data.milking_sessions || [],
    allowMultipleSessionsPerDay: data.allow_multiple_sessions_per_day,
    requireSessionTimeRecording: data.require_session_time_recording,
    sessionIntervalHours: data.session_interval_hours,
    
    enableQualityTracking: data.enable_quality_tracking,
    qualityTrackingLevel: data.quality_tracking_level,
    
    trackFatContent: data.track_fat_content,
    fatContentRequired: data.fat_content_required,
    fatContentMinThreshold: data.fat_content_min_threshold,
    fatContentMaxThreshold: data.fat_content_max_threshold,
    fatContentTarget: data.fat_content_target,
    
    trackProteinContent: data.track_protein_content,
    proteinContentRequired: data.protein_content_required,
    proteinContentMinThreshold: data.protein_content_min_threshold,
    proteinContentMaxThreshold: data.protein_content_max_threshold,
    proteinContentTarget: data.protein_content_target,
    
    trackSomaticCellCount: data.track_somatic_cell_count,
    sccRequired: data.scc_required,
    sccAlertThreshold: data.scc_alert_threshold,
    sccCriticalThreshold: data.scc_critical_threshold,
    sccTarget: data.scc_target,
    
    trackLactoseContent: data.track_lactose_content,
    lactoseRequired: data.lactose_required,
    lactoseMinThreshold: data.lactose_min_threshold,
    lactoseMaxThreshold: data.lactose_max_threshold,
    
    trackTemperature: data.track_temperature,
    temperatureRequired: data.temperature_required,
    temperatureUnit: data.temperature_unit,
    temperatureMin: data.temperature_min,
    temperatureMax: data.temperature_max,
    temperatureAlertEnabled: data.temperature_alert_enabled,
    
    trackPhLevel: data.track_ph_level,
    phRequired: data.ph_required,
    phMin: data.ph_min,
    phMax: data.ph_max,
    
    trackTotalBacterialCount: data.track_total_bacterial_count,
    tbcRequired: data.tbc_required,
    tbcAlertThreshold: data.tbc_alert_threshold,
    
    requireMastitisTest: data.require_mastitis_test,
    mastitisTestAlertOnAbnormal: data.mastitis_test_alert_on_abnormal,
    withdrawalDaysAfterTreatment: data.withdrawal_days_after_treatment,
    
    autoFilterEligibleAnimals: data.auto_filter_eligible_animals,
    eligibleProductionStatuses: data.eligible_production_statuses,
    eligibleGenders: data.eligible_genders,
    minAnimalAgeMonths: data.min_animal_age_months,
    maxDaysInMilk: data.max_days_in_milk,
    excludeSickAnimals: data.exclude_sick_animals,
    excludeTreatmentWithdrawal: data.exclude_treatment_withdrawal,
    
    enableDataValidation: data.enable_data_validation,
    volumeMinPerSession: data.volume_min_per_session,
    volumeMaxPerSession: data.volume_max_per_session,
    volumeAlertThreshold: data.volume_alert_threshold,
    requireVolumeEntry: data.require_volume_entry,
    
    allowRetroactiveEntries: data.allow_retroactive_entries,
    maxRetroactiveDays: data.max_retroactive_days,
    requireNotesForAnomalies: data.require_notes_for_anomalies,
    
    flagUnusualVolumes: data.flag_unusual_volumes,
    unusualVolumeDeviationPercent: data.unusual_volume_deviation_percent,
    flagUnusualQuality: data.flag_unusual_quality,
    
    enableDailyAggregation: data.enable_daily_aggregation,
    enableWeeklyReports: data.enable_weekly_reports,
    enableMonthlyReports: data.enable_monthly_reports,
    aggregationMethod: data.aggregation_method,
    reportGenerationDay: data.report_generation_day,
    includeQualityMetricsInReports: data.include_quality_metrics_in_reports,
    
    enablePerformanceTracking: data.enable_performance_tracking,
    benchmarkAgainst: data.benchmark_against,
    trackPeakLactation: data.track_peak_lactation,
    trackLactationCurve: data.track_lactation_curve,
    alertProductionDecline: data.alert_production_decline,
    declineThresholdPercent: data.decline_threshold_percent,
    
    defaultChartPeriod: convertChartNumbersToPeriod(data.default_chart_period),
    defaultChartType: data.default_chart_type || 'bar',
    chartDisplayMode: data.chart_display_mode,
    showVolumeChart: data.show_volume_chart,
    showFatProteinChart: data.show_fat_protein_chart,
    showTrendLines: data.show_trend_lines,
    showAverages: data.show_averages,
    showTargets: data.show_targets,
    enableChartExport: data.enable_chart_export,
    
    enableBulkEntry: data.enable_bulk_entry,
    bulkEntryTemplate: data.bulk_entry_template,
    allowCsvImport: data.allow_csv_import,
    requireBulkReview: data.require_bulk_review,
    autoCalculateAggregates: data.auto_calculate_aggregates,
    
    syncWithHealthRecords: data.sync_with_health_records,
    syncWithBreedingRecords: data.sync_with_breeding_records,
    syncWithFeedingRecords: data.sync_with_feeding_records,
    updateAnimalProductionStatus: data.update_animal_production_status,
    
    productionAlerts: data.production_alerts,
    alertDeliveryMethods: data.alert_delivery_methods,
    alertRecipients: data.alert_recipients,
    
    trackProductionCosts: data.track_production_costs,
    defaultCostPerLiter: data.default_cost_per_liter,
    includeLaborCosts: data.include_labor_costs,
    includeFeedCosts: data.include_feed_costs,
    includeUtilities: data.include_utilities,
    
    // New Production Tab fields
    laborCostPerUnit: data.labor_cost_per_unit || 0,
    feedCostPerUnit: data.feed_cost_per_unit || 0,
    utilitiesCostPerUnit: data.utilities_cost_per_unit || 0,

    // Add missing properties
    enableSmartSessionBanner: data.enable_smart_session_banner,
    sessionLateThresholdMinutes: data.session_late_threshold_minutes
  }
}

export async function updateProductionSettings(
  farmId: string,
  settings: ProductionSettings
): Promise<{ success: boolean; error?: string }> {
  try {
    // Respect RLS policies for this operation
    const supabase = await createServerSupabaseClient()

    const dbSettings = {
      farm_id: farmId,
      production_tracking_mode: settings.productionTrackingMode,
      enable_production_tracking: settings.enableProductionTracking,
      default_recording_method: settings.defaultRecordingMethod,
      production_unit: settings.productionUnit,
      
      milking_sessions: settings.milkingSessions || [],
      allow_multiple_sessions_per_day: settings.allowMultipleSessionsPerDay,
      require_session_time_recording: settings.requireSessionTimeRecording,
      session_interval_hours: settings.sessionIntervalHours,
      
      enable_quality_tracking: settings.enableQualityTracking,
      quality_tracking_level: settings.qualityTrackingLevel,
      
      track_fat_content: settings.trackFatContent,
      fat_content_required: settings.fatContentRequired,
      fat_content_min_threshold: settings.fatContentMinThreshold,
      fat_content_max_threshold: settings.fatContentMaxThreshold,
      fat_content_target: settings.fatContentTarget,
      
      track_protein_content: settings.trackProteinContent,
      protein_content_required: settings.proteinContentRequired,
      protein_content_min_threshold: settings.proteinContentMinThreshold,
      protein_content_max_threshold: settings.proteinContentMaxThreshold,
      protein_content_target: settings.proteinContentTarget,
      
      track_somatic_cell_count: settings.trackSomaticCellCount,
      scc_required: settings.sccRequired,
      scc_alert_threshold: settings.sccAlertThreshold,
      scc_critical_threshold: settings.sccCriticalThreshold,
      scc_target: settings.sccTarget,
      
      track_lactose_content: settings.trackLactoseContent,
      lactose_required: settings.lactoseRequired,
      lactose_min_threshold: settings.lactoseMinThreshold,
      lactose_max_threshold: settings.lactoseMaxThreshold,
      
      track_temperature: settings.trackTemperature,
      temperature_required: settings.temperatureRequired,
      temperature_unit: settings.temperatureUnit,
      temperature_min: settings.temperatureMin,
      temperature_max: settings.temperatureMax,
      temperature_alert_enabled: settings.temperatureAlertEnabled,
      
      track_ph_level: settings.trackPhLevel,
      ph_required: settings.phRequired,
      ph_min: settings.phMin,
      ph_max: settings.phMax,
      
      track_total_bacterial_count: settings.trackTotalBacterialCount,
      tbc_required: settings.tbcRequired,
      tbc_alert_threshold: settings.tbcAlertThreshold,
      
      require_mastitis_test: settings.requireMastitisTest,
      mastitis_test_alert_on_abnormal: settings.mastitisTestAlertOnAbnormal,
      withdrawal_days_after_treatment: settings.withdrawalDaysAfterTreatment,
      
      auto_filter_eligible_animals: settings.autoFilterEligibleAnimals,
      eligible_production_statuses: settings.eligibleProductionStatuses,
      eligible_genders: settings.eligibleGenders,
      min_animal_age_months: settings.minAnimalAgeMonths,
      max_days_in_milk: settings.maxDaysInMilk,
      exclude_sick_animals: settings.excludeSickAnimals,
      exclude_treatment_withdrawal: settings.excludeTreatmentWithdrawal,
      
      enable_data_validation: settings.enableDataValidation,
      volume_min_per_session: settings.volumeMinPerSession,
      volume_max_per_session: settings.volumeMaxPerSession,
      volume_alert_threshold: settings.volumeAlertThreshold,
      require_volume_entry: settings.requireVolumeEntry,
      
      allow_retroactive_entries: settings.allowRetroactiveEntries,
      max_retroactive_days: settings.maxRetroactiveDays,
      require_notes_for_anomalies: settings.requireNotesForAnomalies,
      
      flag_unusual_volumes: settings.flagUnusualVolumes,
      unusual_volume_deviation_percent: settings.unusualVolumeDeviationPercent,
      flag_unusual_quality: settings.flagUnusualQuality,
      
      enable_daily_aggregation: settings.enableDailyAggregation,
      enable_weekly_reports: settings.enableWeeklyReports,
      enable_monthly_reports: settings.enableMonthlyReports,
      aggregation_method: settings.aggregationMethod,
      report_generation_day: settings.reportGenerationDay,
      include_quality_metrics_in_reports: settings.includeQualityMetricsInReports,
      
      enable_performance_tracking: settings.enablePerformanceTracking,
      benchmark_against: settings.benchmarkAgainst,
      track_peak_lactation: settings.trackPeakLactation,
      track_lactation_curve: settings.trackLactationCurve,
      alert_production_decline: settings.alertProductionDecline,
      decline_threshold_percent: settings.declineThresholdPercent,
      
      default_chart_period: convertChartPeriodToNumbers(settings.defaultChartPeriod),
      default_chart_type: settings.defaultChartType || 'bar',
      chart_display_mode: settings.chartDisplayMode,
      show_volume_chart: settings.showVolumeChart,
      show_fat_protein_chart: settings.showFatProteinChart,
      show_trend_lines: settings.showTrendLines,
      show_averages: settings.showAverages,
      show_targets: settings.showTargets,
      enable_chart_export: settings.enableChartExport,
      
      enable_bulk_entry: settings.enableBulkEntry,
      bulk_entry_template: settings.bulkEntryTemplate,
      allow_csv_import: settings.allowCsvImport,
      require_bulk_review: settings.requireBulkReview,
      auto_calculate_aggregates: settings.autoCalculateAggregates,
      
      sync_with_health_records: settings.syncWithHealthRecords,
      sync_with_breeding_records: settings.syncWithBreedingRecords,
      sync_with_feeding_records: settings.syncWithFeedingRecords,
      update_animal_production_status: settings.updateAnimalProductionStatus,
      
      production_alerts: settings.productionAlerts,
      alert_delivery_methods: settings.alertDeliveryMethods,
      alert_recipients: settings.alertRecipients,
      
      track_production_costs: settings.trackProductionCosts,
      default_cost_per_liter: settings.defaultCostPerLiter,
      include_labor_costs: settings.includeLaborCosts,
      include_feed_costs: settings.includeFeedCosts,
      include_utilities: settings.includeUtilities,
      
      // New Production Tab fields
      labor_cost_per_unit: settings.laborCostPerUnit || 0,
      feed_cost_per_unit: settings.feedCostPerUnit || 0,
      utilities_cost_per_unit: settings.utilitiesCostPerUnit || 0,
      
      updated_at: new Date().toISOString()
    }

    const { error } = await (supabase
      .from('farm_production_settings') as any)
      .upsert(dbSettings, { onConflict: 'farm_id' })

    if (error) {
      console.error('Database upsert error details:', {
        message: error.message,
        code: error.code,
        hint: error.hint,
        details: error.details,
        dbSettings: {
          farm_id: dbSettings.farm_id,
          default_chart_period: dbSettings.default_chart_period,
          default_chart_type: dbSettings.default_chart_type
        }
      })
      throw error
    }

    return { success: true }
  } catch (error) {
    console.error('Error updating production settings:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update settings'
    }
  }
}
