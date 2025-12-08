import { createServerSupabaseClient } from '@/lib/supabase/server'

export interface DataBackupSettings {
  // Backup Configuration
  autoBackupEnabled: boolean
  backupFrequency: 'daily' | 'weekly' | 'monthly'
  backupTime: string
  lastBackupDate?: string
  nextBackupDate?: string
  
  // Data to Include
  includeAnimals: boolean
  includeHealthRecords: boolean
  includeBreedingRecords: boolean
  includeProductionRecords: boolean
  includeFinancialRecords: boolean
  includeFeedRecords: boolean
  includeUsers: boolean
  includeDocuments: boolean
  
  // Export Settings
  exportFormat: 'csv' | 'excel' | 'pdf' | 'json' | 'both'
  includePhotos: boolean
  compressExports: boolean
  
  // Storage
  cloudStorageEnabled: boolean
  cloudStorageProvider?: string
  storageFolderPath?: string
  
  // Retention
  backupRetentionDays: number
  autoDeleteOldBackups: boolean
  maxBackupSizeMb: number
  
  // Notifications
  notifyOnBackupSuccess: boolean
  notifyOnBackupFailure: boolean
  notificationEmail?: string
  
  // Sync
  offlineSyncEnabled: boolean
  syncFrequencyMinutes: number
  conflictResolution: 'server_wins' | 'client_wins' | 'manual'
  
  // Integrity
  enableDataValidation: boolean
  enableAuditLogs: boolean
}

export async function getDataBackupSettings(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('farm_data_backup_settings')
    .select('*')
    .eq('farm_id', farmId)
    .single()
  
  if (error && error.code !== 'PGRST116') throw error
  if (!data) return getDefaultBackupSettings()
  
  return transformDbToBackupSettings(data)
}

export async function updateDataBackupSettings(farmId: string, settings: DataBackupSettings) {
  const supabase = await createServerSupabaseClient()
  
  const dbSettings = transformBackupSettingsToDb(farmId, settings)
  
  const { error } = await (supabase
    .from('farm_data_backup_settings') as any)
    .upsert(dbSettings, { onConflict: 'farm_id' })
  
  if (error) throw error
  return { success: true }
}

export async function getBackupHistory(farmId: string, limit = 20) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('farm_backup_history')
    .select('*')
    .eq('farm_id', farmId)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (error) throw error
  return data || []
}

function getDefaultBackupSettings(): DataBackupSettings {
  return {
    autoBackupEnabled: true,
    backupFrequency: 'weekly',
    backupTime: '02:00:00',
    includeAnimals: true,
    includeHealthRecords: true,
    includeBreedingRecords: true,
    includeProductionRecords: true,
    includeFinancialRecords: true,
    includeFeedRecords: true,
    includeUsers: false,
    includeDocuments: true,
    exportFormat: 'both',
    includePhotos: false,
    compressExports: true,
    cloudStorageEnabled: false,
    backupRetentionDays: 90,
    autoDeleteOldBackups: true,
    maxBackupSizeMb: 500,
    notifyOnBackupSuccess: true,
    notifyOnBackupFailure: true,
    offlineSyncEnabled: true,
    syncFrequencyMinutes: 30,
    conflictResolution: 'server_wins',
    enableDataValidation: true,
    enableAuditLogs: true
  }
}

function transformDbToBackupSettings(data: any): DataBackupSettings {
  return {
    autoBackupEnabled: data.auto_backup_enabled,
    backupFrequency: data.backup_frequency,
    backupTime: data.backup_time,
    lastBackupDate: data.last_backup_date,
    nextBackupDate: data.next_backup_date,
    includeAnimals: data.include_animals,
    includeHealthRecords: data.include_health_records,
    includeBreedingRecords: data.include_breeding_records,
    includeProductionRecords: data.include_production_records,
    includeFinancialRecords: data.include_financial_records,
    includeFeedRecords: data.include_feed_records,
    includeUsers: data.include_users,
    includeDocuments: data.include_documents,
    exportFormat: data.export_format,
    includePhotos: data.include_photos,
    compressExports: data.compress_exports,
    cloudStorageEnabled: data.cloud_storage_enabled,
    cloudStorageProvider: data.cloud_storage_provider,
    storageFolderPath: data.storage_folder_path,
    backupRetentionDays: data.backup_retention_days,
    autoDeleteOldBackups: data.auto_delete_old_backups,
    maxBackupSizeMb: data.max_backup_size_mb,
    notifyOnBackupSuccess: data.notify_on_backup_success,
    notifyOnBackupFailure: data.notify_on_backup_failure,
    notificationEmail: data.notification_email,
    offlineSyncEnabled: data.offline_sync_enabled,
    syncFrequencyMinutes: data.sync_frequency_minutes,
    conflictResolution: data.conflict_resolution,
    enableDataValidation: data.enable_data_validation,
    enableAuditLogs: data.enable_audit_logs
  }
}

function transformBackupSettingsToDb(farmId: string, settings: DataBackupSettings) {
  return {
    farm_id: farmId,
    auto_backup_enabled: settings.autoBackupEnabled,
    backup_frequency: settings.backupFrequency,
    backup_time: settings.backupTime,
    include_animals: settings.includeAnimals,
    include_health_records: settings.includeHealthRecords,
    include_breeding_records: settings.includeBreedingRecords,
    include_production_records: settings.includeProductionRecords,
    include_financial_records: settings.includeFinancialRecords,
    include_feed_records: settings.includeFeedRecords,
    include_users: settings.includeUsers,
    include_documents: settings.includeDocuments,
    export_format: settings.exportFormat,
    include_photos: settings.includePhotos,
    compress_exports: settings.compressExports,
    cloud_storage_enabled: settings.cloudStorageEnabled,
    cloud_storage_provider: settings.cloudStorageProvider,
    storage_folder_path: settings.storageFolderPath,
    backup_retention_days: settings.backupRetentionDays,
    auto_delete_old_backups: settings.autoDeleteOldBackups,
    max_backup_size_mb: settings.maxBackupSizeMb,
    notify_on_backup_success: settings.notifyOnBackupSuccess,
    notify_on_backup_failure: settings.notifyOnBackupFailure,
    notification_email: settings.notificationEmail,
    offline_sync_enabled: settings.offlineSyncEnabled,
    sync_frequency_minutes: settings.syncFrequencyMinutes,
    conflict_resolution: settings.conflictResolution,
    enable_data_validation: settings.enableDataValidation,
    enable_audit_logs: settings.enableAuditLogs,
    updated_at: new Date().toISOString()
  }
}