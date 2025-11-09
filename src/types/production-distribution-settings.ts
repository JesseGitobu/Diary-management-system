// lib/types/production-distribution-settings.ts

// ============================================
// PRODUCTION SETTINGS TYPES
// ============================================

export interface ProductionSettings {
  // 1. General Production Settings
  productionTrackingMode: 'basic' | 'advanced' | 'quality_focused'
  enableProductionTracking: boolean
  defaultRecordingMethod: 'manual' | 'automated' | 'hybrid'
  productionUnit: 'liters' | 'gallons' | 'kg'
  
  // 2. Milking Session Configuration
  enabledSessions: ('morning' | 'afternoon' | 'evening')[]
  defaultSession: 'morning' | 'afternoon' | 'evening'
  sessionTimes: {
    morning: string
    afternoon: string
    evening: string
  }
  allowMultipleSessionsPerDay: boolean
  requireSessionTimeRecording: boolean
  sessionIntervalHours: number
  
  // 3. Quality Tracking Settings
  enableQualityTracking: boolean
  qualityTrackingLevel: 'basic' | 'standard' | 'advanced' | 'laboratory'
  
  // Quality Parameters Configuration
  trackFatContent: boolean
  fatContentRequired: boolean
  fatContentMinThreshold: number
  fatContentMaxThreshold: number
  fatContentTarget: number
  
  trackProteinContent: boolean
  proteinContentRequired: boolean
  proteinContentMinThreshold: number
  proteinContentMaxThreshold: number
  proteinContentTarget: number
  
  trackSomaticCellCount: boolean
  sccRequired: boolean
  sccAlertThreshold: number
  sccCriticalThreshold: number
  sccTarget: number
  
  trackLactoseContent: boolean
  lactoseRequired: boolean
  lactoseMinThreshold: number
  lactoseMaxThreshold: number
  
  trackTemperature: boolean
  temperatureRequired: boolean
  temperatureUnit: 'celsius' | 'fahrenheit'
  temperatureMin: number
  temperatureMax: number
  temperatureAlertEnabled: boolean
  
  trackPhLevel: boolean
  phRequired: boolean
  phMin: number
  phMax: number
  
  trackTotalBacterialCount: boolean
  tbcRequired: boolean
  tbcAlertThreshold: number
  
  // 4. Animal Eligibility Settings
  autoFilterEligibleAnimals: boolean
  eligibleProductionStatuses: string[]
  eligibleGenders: string[]
  minAnimalAgeMonths: number
  maxDaysInMilk?: number
  excludeSickAnimals: boolean
  excludeTreatmentWithdrawal: boolean
  
  // 5. Data Validation & Quality Control
  enableDataValidation: boolean
  volumeMinPerSession: number
  volumeMaxPerSession: number
  volumeAlertThreshold: number
  requireVolumeEntry: boolean
  
  allowRetroactiveEntries: boolean
  maxRetroactiveDays: number
  requireNotesForAnomalies: boolean
  
  flagUnusualVolumes: boolean
  unusualVolumeDeviationPercent: number
  flagUnusualQuality: boolean
  
  // 6. Aggregation & Reporting
  enableDailyAggregation: boolean
  enableWeeklyReports: boolean
  enableMonthlyReports: boolean
  aggregationMethod: 'automatic' | 'manual' | 'scheduled'
  reportGenerationDay: string
  includeQualityMetricsInReports: boolean
  
  // 7. Performance Benchmarking
  enablePerformanceTracking: boolean
  benchmarkAgainst: 'self' | 'herd_average' | 'breed_standard' | 'industry'
  trackPeakLactation: boolean
  trackLactationCurve: boolean
  alertProductionDecline: boolean
  declineThresholdPercent: number
  
  // 8. Chart & Visualization Settings
  defaultChartPeriod: number
  chartDisplayMode: 'volume_only' | 'quality_only' | 'combined' | 'separate'
  showVolumeChart: boolean
  showFatProteinChart: boolean
  showTrendLines: boolean
  showAverages: boolean
  showTargets: boolean
  enableChartExport: boolean
  
  // 9. Bulk Entry Settings
  enableBulkEntry: boolean
  bulkEntryTemplate: string
  allowCsvImport: boolean
  requireBulkReview: boolean
  autoCalculateAggregates: boolean
  
  // 10. Integration Settings
  syncWithHealthRecords: boolean
  syncWithBreedingRecords: boolean
  syncWithFeedingRecords: boolean
  updateAnimalProductionStatus: boolean
  
  // 11. Notifications & Alerts
  productionAlerts: {
    lowVolume: boolean
    qualityIssues: boolean
    missedSession: boolean
    milestoneReached: boolean
  }
  alertDeliveryMethods: ('app' | 'sms' | 'email' | 'whatsapp')[]
  alertRecipients: string[]
  
  // 12. Cost Tracking
  trackProductionCosts: boolean
  defaultCostPerLiter?: number
  includeLaborCosts: boolean
  includeFeedCosts: boolean
  includeUtilities: boolean
}

// ============================================
// DISTRIBUTION SETTINGS TYPES
// ============================================

export interface DistributionSettings {
  // 1. General Distribution Settings
  enableDistributionTracking: boolean
  distributionModel: 'single_channel' | 'multi_channel' | 'cooperative' | 'processor'
  defaultDistributionFrequency: 'per_session' | 'daily' | 'weekly' | 'on_demand'
  
  // 2. Channel Management
  enableChannelManagement: boolean
  allowMultipleChannels: boolean
  maxActiveChannels: number
  requireChannelApproval: boolean
  approvalRequiredBy: string
  
  channelTypesEnabled: ('cooperative' | 'processor' | 'direct' | 'retail')[]
  defaultChannelType: 'cooperative' | 'processor' | 'direct' | 'retail'
  
  // 3. Inventory & Volume Management
  enableInventoryTracking: boolean
  inventoryUpdateMethod: 'automatic' | 'manual' | 'semi_automatic'
  trackAvailableVolume: boolean
  allowOverdistribution: boolean
  overdistributionTolerancePercent: number
  
  reserveVolumePercent: number
  alertLowInventory: boolean
  lowInventoryThresholdLiters: number
  
  // 4. Pricing Settings
  pricingModel: 'fixed' | 'per_channel' | 'dynamic' | 'quality_based'
  defaultPricePerLiter: number
  currency: string
  allowChannelCustomPricing: boolean
  
  enableQualityBasedPricing: boolean
  qualityPremiumPercent: number
  qualityThresholdScc: number
  qualityThresholdFat: number
  qualityThresholdProtein: number
  
  enableVolumeDiscounts: boolean
  volumeDiscountTiers?: {
    minVolume: number
    discountPercent: number
  }[]
  
  // 5. Delivery Management
  enableDeliveryTracking: boolean
  requireDriverDetails: boolean
  requireVehicleDetails: boolean
  trackDeliveryTime: boolean
  requireDeliveryConfirmation: boolean
  confirmationMethod: 'signature' | 'photo' | 'code' | 'gps'
  
  enableRouteOptimization: boolean
  maxDeliveryRadiusKm: number
  preferredDeliveryTime: string
  
  // 6. Payment Management
  paymentMethodsEnabled: ('cash' | 'mpesa' | 'bank' | 'credit')[]
  defaultPaymentMethod: 'cash' | 'mpesa' | 'bank' | 'credit'
  enableCreditManagement: boolean
  defaultCreditPeriodDays: number
  maxCreditLimit?: number
  
  paymentTerms: {
    immediate: number
    net_7: number
    net_15: number
    net_30: number
    net_60: number
  }
  defaultPaymentTerms: string
  
  autoGenerateInvoices: boolean
  invoiceFormat: 'pdf' | 'excel'
  includeTaxInPricing: boolean
  taxRatePercent: number
  
  // 7. Quality Control for Distribution
  requireQualityCheckBeforeDistribution: boolean
  minimumQualityStandards: {
    sccMax: number
    fatMin: number
    proteinMin: number
    temperatureMax: number
  }
  rejectSubstandardMilk: boolean
  alertQualityIssues: boolean
  
  // 8. Record Keeping
  requireBatchNumbers: boolean
  batchNumberFormat: string
  trackDistributionContainers: boolean
  containerTypes: string[]
  
  requireDistributionNotes: boolean
  requirePhotosForDelivery: boolean
  
  // 9. Status Management
  statusWorkflow: string[]
  defaultInitialStatus: string
  autoUpdateStatus: boolean
  
  enableStatusNotifications: boolean
  notifyOnStatusChange: boolean
  
  // 10. Channel Relationship Management
  trackChannelPerformance: boolean
  performanceMetrics: string[]
  enableChannelRatings: boolean
  minRatingForActiveChannel: number
  
  trackChannelContracts: boolean
  requireContractExpiryAlerts: boolean
  contractAlertDaysBefore: number
  
  // 11. Reporting & Analytics
  enableDistributionReports: boolean
  reportFrequency: string
  includeRevenueAnalysis: boolean
  includeChannelComparison: boolean
  
  dashboardDisplayPeriod: number
  showRevenueCharts: boolean
  showVolumeCharts: boolean
  showChannelBreakdown: boolean
  
  // 12. Regulatory Compliance
  enableComplianceTracking: boolean
  requireTransportLicenses: boolean
  requireHealthCertificates: boolean
  trackPermitRenewals: boolean
  
  complyWithCoolingRequirements: boolean
  maxTransportTemperature: number
  maxTransportDurationHours: number
  
  // 13. Integration Settings
  syncWithProductionRecords: boolean
  autoDeductFromInventory: boolean
  syncWithFinancialRecords: boolean
  createAccountingEntries: boolean
  
  // 14. Alerts & Notifications
  distributionAlerts: {
    lowInventory: boolean
    overduePayment: boolean
    deliveryScheduled: boolean
    deliveryComplete: boolean
  }
  alertDeliveryMethods: ('app' | 'sms' | 'email' | 'whatsapp')[]
  alertRecipients: string[]
  
  criticalAlertThresholdAmount: number
  enablePaymentReminders: boolean
  paymentReminderDaysBeforeDue: number
  overduePaymentAlertFrequency: string
  
  // 15. Backup & Data Retention
  enableDataExport: boolean
  exportFormats: ('pdf' | 'excel' | 'csv')[]
  dataRetentionYears: number
  autoArchiveOldRecords: boolean
  archiveAfterMonths: number
}

// ============================================
// DEFAULT VALUES
// ============================================

export const getDefaultProductionSettings = (): ProductionSettings => ({
  // General
  productionTrackingMode: 'basic',
  enableProductionTracking: true,
  defaultRecordingMethod: 'manual',
  productionUnit: 'liters',
  
  // Sessions
  enabledSessions: ['morning', 'afternoon', 'evening'],
  defaultSession: 'morning',
  sessionTimes: {
    morning: '06:00',
    afternoon: '14:00',
    evening: '18:00'
  },
  allowMultipleSessionsPerDay: true,
  requireSessionTimeRecording: false,
  sessionIntervalHours: 8,
  
  // Quality Tracking
  enableQualityTracking: true,
  qualityTrackingLevel: 'standard',
  
  trackFatContent: true,
  fatContentRequired: false,
  fatContentMinThreshold: 3.0,
  fatContentMaxThreshold: 6.0,
  fatContentTarget: 3.8,
  
  trackProteinContent: true,
  proteinContentRequired: false,
  proteinContentMinThreshold: 2.8,
  proteinContentMaxThreshold: 4.0,
  proteinContentTarget: 3.2,
  
  trackSomaticCellCount: false,
  sccRequired: false,
  sccAlertThreshold: 400000,
  sccCriticalThreshold: 750000,
  sccTarget: 200000,
  
  trackLactoseContent: false,
  lactoseRequired: false,
  lactoseMinThreshold: 4.5,
  lactoseMaxThreshold: 5.0,
  
  trackTemperature: false,
  temperatureRequired: false,
  temperatureUnit: 'celsius',
  temperatureMin: 36.5,
  temperatureMax: 38.5,
  temperatureAlertEnabled: true,
  
  trackPhLevel: false,
  phRequired: false,
  phMin: 6.5,
  phMax: 6.8,
  
  trackTotalBacterialCount: false,
  tbcRequired: false,
  tbcAlertThreshold: 100000,
  
  // Animal Eligibility
  autoFilterEligibleAnimals: true,
  eligibleProductionStatuses: ['lactating'],
  eligibleGenders: ['female'],
  minAnimalAgeMonths: 15,
  excludeSickAnimals: true,
  excludeTreatmentWithdrawal: true,
  
  // Validation
  enableDataValidation: true,
  volumeMinPerSession: 0.5,
  volumeMaxPerSession: 50.0,
  volumeAlertThreshold: 5.0,
  requireVolumeEntry: true,
  
  allowRetroactiveEntries: true,
  maxRetroactiveDays: 7,
  requireNotesForAnomalies: true,
  
  flagUnusualVolumes: true,
  unusualVolumeDeviationPercent: 30,
  flagUnusualQuality: true,
  
  // Aggregation
  enableDailyAggregation: true,
  enableWeeklyReports: true,
  enableMonthlyReports: true,
  aggregationMethod: 'automatic',
  reportGenerationDay: 'monday',
  includeQualityMetricsInReports: true,
  
  // Benchmarking
  enablePerformanceTracking: true,
  benchmarkAgainst: 'herd_average',
  trackPeakLactation: true,
  trackLactationCurve: false,
  alertProductionDecline: true,
  declineThresholdPercent: 20,
  
  // Charts
  defaultChartPeriod: 30,
  chartDisplayMode: 'combined',
  showVolumeChart: true,
  showFatProteinChart: true,
  showTrendLines: true,
  showAverages: true,
  showTargets: true,
  enableChartExport: true,
  
  // Bulk Entry
  enableBulkEntry: true,
  bulkEntryTemplate: 'standard',
  allowCsvImport: true,
  requireBulkReview: true,
  autoCalculateAggregates: true,
  
  // Integration
  syncWithHealthRecords: true,
  syncWithBreedingRecords: true,
  syncWithFeedingRecords: false,
  updateAnimalProductionStatus: true,
  
  // Alerts
  productionAlerts: {
    lowVolume: true,
    qualityIssues: true,
    missedSession: true,
    milestoneReached: false
  },
  alertDeliveryMethods: ['app', 'sms'],
  alertRecipients: ['farm_manager', 'farm_owner'],
  
  // Costs
  trackProductionCosts: false,
  includeLaborCosts: false,
  includeFeedCosts: false,
  includeUtilities: false
})

export const getDefaultDistributionSettings = (): DistributionSettings => ({
  // General
  enableDistributionTracking: true,
  distributionModel: 'multi_channel',
  defaultDistributionFrequency: 'daily',
  
  // Channel Management
  enableChannelManagement: true,
  allowMultipleChannels: true,
  maxActiveChannels: 10,
  requireChannelApproval: false,
  approvalRequiredBy: 'farm_manager',
  
  channelTypesEnabled: ['cooperative', 'processor', 'direct', 'retail'],
  defaultChannelType: 'cooperative',
  
  // Inventory
  enableInventoryTracking: true,
  inventoryUpdateMethod: 'automatic',
  trackAvailableVolume: true,
  allowOverdistribution: false,
  overdistributionTolerancePercent: 0,
  
  reserveVolumePercent: 0,
  alertLowInventory: true,
  lowInventoryThresholdLiters: 50.0,
  
  // Pricing
  pricingModel: 'per_channel',
  defaultPricePerLiter: 45.00,
  currency: 'KES',
  allowChannelCustomPricing: true,
  
  enableQualityBasedPricing: false,
  qualityPremiumPercent: 10,
  qualityThresholdScc: 250000,
  qualityThresholdFat: 3.5,
  qualityThresholdProtein: 3.0,
  
  enableVolumeDiscounts: false,
  
  // Delivery
  enableDeliveryTracking: true,
  requireDriverDetails: true,
  requireVehicleDetails: false,
  trackDeliveryTime: true,
  requireDeliveryConfirmation: false,
  confirmationMethod: 'signature',
  
  enableRouteOptimization: false,
  maxDeliveryRadiusKm: 100,
  preferredDeliveryTime: 'morning',
  
  // Payment
  paymentMethodsEnabled: ['cash', 'mpesa', 'bank', 'credit'],
  defaultPaymentMethod: 'mpesa',
  enableCreditManagement: true,
  defaultCreditPeriodDays: 30,
  
  paymentTerms: {
    immediate: 0,
    net_7: 7,
    net_15: 15,
    net_30: 30,
    net_60: 60
  },
  defaultPaymentTerms: 'net_30',
  
  autoGenerateInvoices: false,
  invoiceFormat: 'pdf',
  includeTaxInPricing: false,
  taxRatePercent: 16.0,
  
  // Quality Control
  requireQualityCheckBeforeDistribution: false,
  minimumQualityStandards: {
    sccMax: 400000,
    fatMin: 3.0,
    proteinMin: 2.8,
    temperatureMax: 4.0
  },
  rejectSubstandardMilk: false,
  alertQualityIssues: true,
  
  // Record Keeping
  requireBatchNumbers: false,
  batchNumberFormat: 'FARM-YYYYMMDD-NNN',
  trackDistributionContainers: false,
  containerTypes: ['can', 'tank', 'bulk'],
  
  requireDistributionNotes: false,
  requirePhotosForDelivery: false,
  
  // Status
  statusWorkflow: ['pending', 'in_transit', 'delivered', 'paid'],
  defaultInitialStatus: 'pending',
  autoUpdateStatus: false,
  
  enableStatusNotifications: true,
  notifyOnStatusChange: true,
  
  // Channel Relationships
  trackChannelPerformance: true,
  performanceMetrics: ['volume', 'payment_timeliness', 'quality_complaints', 'frequency'],
  enableChannelRatings: false,
  minRatingForActiveChannel: 3,
  
  trackChannelContracts: false,
  requireContractExpiryAlerts: false,
  contractAlertDaysBefore: 30,
  
  // Reporting
  enableDistributionReports: true,
  reportFrequency: 'weekly',
  includeRevenueAnalysis: true,
  includeChannelComparison: true,
  
  dashboardDisplayPeriod: 30,
  showRevenueCharts: true,
  showVolumeCharts: true,
  showChannelBreakdown: true,
  
  // Compliance
  enableComplianceTracking: false,
  requireTransportLicenses: false,
  requireHealthCertificates: false,
  trackPermitRenewals: false,
  
  complyWithCoolingRequirements: true,
  maxTransportTemperature: 4.0,
  maxTransportDurationHours: 4,
  
  // Integration
  syncWithProductionRecords: true,
  autoDeductFromInventory: true,
  syncWithFinancialRecords: true,
  createAccountingEntries: false,
  
  // Alerts
  distributionAlerts: {
    lowInventory: true,
    overduePayment: true,
    deliveryScheduled: true,
    deliveryComplete: true
  },
  alertDeliveryMethods: ['app', 'sms'],
  alertRecipients: ['farm_manager', 'farm_owner'],
  
  criticalAlertThresholdAmount: 100000.00,
  enablePaymentReminders: true,
  paymentReminderDaysBeforeDue: 3,
  overduePaymentAlertFrequency: 'daily',
  
  // Backup
  enableDataExport: true,
  exportFormats: ['pdf', 'excel', 'csv'],
  dataRetentionYears: 7,
  autoArchiveOldRecords: false,
  archiveAfterMonths: 24
})