
// lib/database/distribution-settings.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { DistributionSettings, getDefaultDistributionSettings } from '@/types/production-distribution-settings'

export async function getDistributionSettings(farmId: string): Promise<DistributionSettings | null> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('farm_distribution_settings')
      .select('*')
      .eq('farm_id', farmId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return getDefaultDistributionSettings()
      }
      throw error
    }

    return transformDbToDistributionSettings(data)
  } catch (error) {
    console.error('Error fetching distribution settings:', error)
    return getDefaultDistributionSettings()
  }
}

function transformDbToDistributionSettings(data: any): DistributionSettings {
  return {
    enableDistributionTracking: data.enable_distribution_tracking,
    distributionModel: data.distribution_model,
    defaultDistributionFrequency: data.default_distribution_frequency,
    
    enableChannelManagement: data.enable_channel_management,
    allowMultipleChannels: data.allow_multiple_channels,
    maxActiveChannels: data.max_active_channels,
    requireChannelApproval: data.require_channel_approval,
    approvalRequiredBy: data.approval_required_by,
    
    channelTypesEnabled: data.channel_types_enabled,
    defaultChannelType: data.default_channel_type,
    
    enableInventoryTracking: data.enable_inventory_tracking,
    inventoryUpdateMethod: data.inventory_update_method,
    trackAvailableVolume: data.track_available_volume,
    allowOverdistribution: data.allow_overdistribution,
    overdistributionTolerancePercent: data.overdistribution_tolerance_percent,
    
    reserveVolumePercent: data.reserve_volume_percent,
    alertLowInventory: data.alert_low_inventory,
    lowInventoryThresholdLiters: data.low_inventory_threshold_liters,
    
    pricingModel: data.pricing_model,
    defaultPricePerLiter: data.default_price_per_liter,
    currency: data.currency,
    allowChannelCustomPricing: data.allow_channel_custom_pricing,
    
    enableQualityBasedPricing: data.enable_quality_based_pricing,
    qualityPremiumPercent: data.quality_premium_percent,
    qualityThresholdScc: data.quality_threshold_scc,
    qualityThresholdFat: data.quality_threshold_fat,
    qualityThresholdProtein: data.quality_threshold_protein,
    
    enableVolumeDiscounts: data.enable_volume_discounts,
    volumeDiscountTiers: data.volume_discount_tiers,
    
    enableDeliveryTracking: data.enable_delivery_tracking,
    requireDriverDetails: data.require_driver_details,
    requireVehicleDetails: data.require_vehicle_details,
    trackDeliveryTime: data.track_delivery_time,
    requireDeliveryConfirmation: data.require_delivery_confirmation,
    confirmationMethod: data.confirmation_method,
    
    enableRouteOptimization: data.enable_route_optimization,
    maxDeliveryRadiusKm: data.max_delivery_radius_km,
    preferredDeliveryTime: data.preferred_delivery_time,
    
    paymentMethodsEnabled: data.payment_methods_enabled,
    defaultPaymentMethod: data.default_payment_method,
    enableCreditManagement: data.enable_credit_management,
    defaultCreditPeriodDays: data.default_credit_period_days,
    maxCreditLimit: data.max_credit_limit,
    
    paymentTerms: data.payment_terms,
    defaultPaymentTerms: data.default_payment_terms,
    
    autoGenerateInvoices: data.auto_generate_invoices,
    invoiceFormat: data.invoice_format,
    includeTaxInPricing: data.include_tax_in_pricing,
    taxRatePercent: data.tax_rate_percent,
    
    requireQualityCheckBeforeDistribution: data.require_quality_check_before_distribution,
    minimumQualityStandards: data.minimum_quality_standards,
    rejectSubstandardMilk: data.reject_substandard_milk,
    alertQualityIssues: data.alert_quality_issues,
    
    requireBatchNumbers: data.require_batch_numbers,
    batchNumberFormat: data.batch_number_format,
    trackDistributionContainers: data.track_distribution_containers,
    containerTypes: data.container_types,
    
    requireDistributionNotes: data.require_distribution_notes,
    requirePhotosForDelivery: data.require_photos_for_delivery,
    
    statusWorkflow: data.status_workflow,
    defaultInitialStatus: data.default_initial_status,
    autoUpdateStatus: data.auto_update_status,
    
    enableStatusNotifications: data.enable_status_notifications,
    notifyOnStatusChange: data.notify_on_status_change,
    
    trackChannelPerformance: data.track_channel_performance,
    performanceMetrics: data.performance_metrics,
    enableChannelRatings: data.enable_channel_ratings,
    minRatingForActiveChannel: data.min_rating_for_active_channel,
    
    trackChannelContracts: data.track_channel_contracts,
    requireContractExpiryAlerts: data.require_contract_expiry_alerts,
    contractAlertDaysBefore: data.contract_alert_days_before,
    
    enableDistributionReports: data.enable_distribution_reports,
    reportFrequency: data.report_frequency,
    includeRevenueAnalysis: data.include_revenue_analysis,
    includeChannelComparison: data.include_channel_comparison,
    
    dashboardDisplayPeriod: data.dashboard_display_period,
    showRevenueCharts: data.show_revenue_charts,
    showVolumeCharts: data.show_volume_charts,
    showChannelBreakdown: data.show_channel_breakdown,
    
    enableComplianceTracking: data.enable_compliance_tracking,
    requireTransportLicenses: data.require_transport_licenses,
    requireHealthCertificates: data.require_health_certificates,
    trackPermitRenewals: data.track_permit_renewals,
    
    complyWithCoolingRequirements: data.comply_with_cooling_requirements,
    maxTransportTemperature: data.max_transport_temperature,
    maxTransportDurationHours: data.max_transport_duration_hours,
    
    syncWithProductionRecords: data.sync_with_production_records,
    autoDeductFromInventory: data.auto_deduct_from_inventory,
    syncWithFinancialRecords: data.sync_with_financial_records,
    createAccountingEntries: data.create_accounting_entries,
    
    distributionAlerts: data.distribution_alerts,
    alertDeliveryMethods: data.alert_delivery_methods,
    alertRecipients: data.alert_recipients,
    
    criticalAlertThresholdAmount: data.critical_alert_threshold_amount,
    enablePaymentReminders: data.enable_payment_reminders,
    paymentReminderDaysBeforeDue: data.payment_reminder_days_before_due,
    overduePaymentAlertFrequency: data.overdue_payment_alert_frequency,
    
    enableDataExport: data.enable_data_export,
    exportFormats: data.export_formats,
    dataRetentionYears: data.data_retention_years,
    autoArchiveOldRecords: data.auto_archive_old_records,
    archiveAfterMonths: data.archive_after_months
  }
}

export async function updateDistributionSettings(
  farmId: string,
  settings: DistributionSettings
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient()

    const dbSettings = {
      farm_id: farmId,
      enable_distribution_tracking: settings.enableDistributionTracking,
      distribution_model: settings.distributionModel,
      default_distribution_frequency: settings.defaultDistributionFrequency,
      
      enable_channel_management: settings.enableChannelManagement,
      allow_multiple_channels: settings.allowMultipleChannels,
      max_active_channels: settings.maxActiveChannels,
      require_channel_approval: settings.requireChannelApproval,
      approval_required_by: settings.approvalRequiredBy,
      
      channel_types_enabled: settings.channelTypesEnabled,
      default_channel_type: settings.defaultChannelType,
      
      enable_inventory_tracking: settings.enableInventoryTracking,
      inventory_update_method: settings.inventoryUpdateMethod,
      track_available_volume: settings.trackAvailableVolume,
      allow_overdistribution: settings.allowOverdistribution,
      overdistribution_tolerance_percent: settings.overdistributionTolerancePercent,
      
      reserve_volume_percent: settings.reserveVolumePercent,
      alert_low_inventory: settings.alertLowInventory,
      low_inventory_threshold_liters: settings.lowInventoryThresholdLiters,
      
      pricing_model: settings.pricingModel,
      default_price_per_liter: settings.defaultPricePerLiter,
      currency: settings.currency,
      allow_channel_custom_pricing: settings.allowChannelCustomPricing,
      
      enable_quality_based_pricing: settings.enableQualityBasedPricing,
      quality_premium_percent: settings.qualityPremiumPercent,
      quality_threshold_scc: settings.qualityThresholdScc,
      quality_threshold_fat: settings.qualityThresholdFat,
      quality_threshold_protein: settings.qualityThresholdProtein,
      
      enable_volume_discounts: settings.enableVolumeDiscounts,
      volume_discount_tiers: settings.volumeDiscountTiers,
      
      enable_delivery_tracking: settings.enableDeliveryTracking,
      require_driver_details: settings.requireDriverDetails,
      require_vehicle_details: settings.requireVehicleDetails,
      track_delivery_time: settings.trackDeliveryTime,
      require_delivery_confirmation: settings.requireDeliveryConfirmation,
      confirmation_method: settings.confirmationMethod,
      
      enable_route_optimization: settings.enableRouteOptimization,
      max_delivery_radius_km: settings.maxDeliveryRadiusKm,
      preferred_delivery_time: settings.preferredDeliveryTime,
      
      payment_methods_enabled: settings.paymentMethodsEnabled,
      default_payment_method: settings.defaultPaymentMethod,
      enable_credit_management: settings.enableCreditManagement,
      default_credit_period_days: settings.defaultCreditPeriodDays,
      max_credit_limit: settings.maxCreditLimit,
      
      payment_terms: settings.paymentTerms,
      default_payment_terms: settings.defaultPaymentTerms,
      
      auto_generate_invoices: settings.autoGenerateInvoices,
      invoice_format: settings.invoiceFormat,
      include_tax_in_pricing: settings.includeTaxInPricing,
      tax_rate_percent: settings.taxRatePercent,
      
      require_quality_check_before_distribution: settings.requireQualityCheckBeforeDistribution,
      minimum_quality_standards: settings.minimumQualityStandards,
      reject_substandard_milk: settings.rejectSubstandardMilk,
      alert_quality_issues: settings.alertQualityIssues,
      
      require_batch_numbers: settings.requireBatchNumbers,
      batch_number_format: settings.batchNumberFormat,
      track_distribution_containers: settings.trackDistributionContainers,
      container_types: settings.containerTypes,
      
      require_distribution_notes: settings.requireDistributionNotes,
      require_photos_for_delivery: settings.requirePhotosForDelivery,
      
      status_workflow: settings.statusWorkflow,
      default_initial_status: settings.defaultInitialStatus,
      auto_update_status: settings.autoUpdateStatus,
      
      enable_status_notifications: settings.enableStatusNotifications,
      notify_on_status_change: settings.notifyOnStatusChange,
      
      track_channel_performance: settings.trackChannelPerformance,
      performance_metrics: settings.performanceMetrics,
      enable_channel_ratings: settings.enableChannelRatings,
      min_rating_for_active_channel: settings.minRatingForActiveChannel,
      
      track_channel_contracts: settings.trackChannelContracts,
      require_contract_expiry_alerts: settings.requireContractExpiryAlerts,
      contract_alert_days_before: settings.contractAlertDaysBefore,
      
      enable_distribution_reports: settings.enableDistributionReports,
      report_frequency: settings.reportFrequency,
      include_revenue_analysis: settings.includeRevenueAnalysis,
      include_channel_comparison: settings.includeChannelComparison,
      
      dashboard_display_period: settings.dashboardDisplayPeriod,
      show_revenue_charts: settings.showRevenueCharts,
      show_volume_charts: settings.showVolumeCharts,
      show_channel_breakdown: settings.showChannelBreakdown,
      
      enable_compliance_tracking: settings.enableComplianceTracking,
      require_transport_licenses: settings.requireTransportLicenses,
      require_health_certificates: settings.requireHealthCertificates,
      track_permit_renewals: settings.trackPermitRenewals,
      
      comply_with_cooling_requirements: settings.complyWithCoolingRequirements,
      max_transport_temperature: settings.maxTransportTemperature,
      max_transport_duration_hours: settings.maxTransportDurationHours,
      
      sync_with_production_records: settings.syncWithProductionRecords,
      auto_deduct_from_inventory: settings.autoDeductFromInventory,
      sync_with_financial_records: settings.syncWithFinancialRecords,
      create_accounting_entries: settings.createAccountingEntries,
      
      distribution_alerts: settings.distributionAlerts,
      alert_delivery_methods: settings.alertDeliveryMethods,
      alert_recipients: settings.alertRecipients,
      
      critical_alert_threshold_amount: settings.criticalAlertThresholdAmount,
      enable_payment_reminders: settings.enablePaymentReminders,
      payment_reminder_days_before_due: settings.paymentReminderDaysBeforeDue,
      overdue_payment_alert_frequency: settings.overduePaymentAlertFrequency,
      
      enable_data_export: settings.enableDataExport,
      export_formats: settings.exportFormats,
      data_retention_years: settings.dataRetentionYears,
      auto_archive_old_records: settings.autoArchiveOldRecords,
      archive_after_months: settings.archiveAfterMonths,
      
      updated_at: new Date().toISOString()
    }

    const { error } = await supabase
      .from('farm_distribution_settings')
      .upsert(dbSettings, { onConflict: 'farm_id' })

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error updating distribution settings:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update settings'
    }
  }
}