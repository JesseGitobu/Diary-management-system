// lib/database/tagging-settings.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'

export interface TaggingSettings {
  method: 'basic' | 'structured' | 'automated'
  tagPrefix: string
  numberingSystem: 'sequential' | 'custom' | 'barcode'
  nextNumber: number
  enablePhotoTags: boolean
  enableColorCoding: boolean
  enableQRCodes: boolean
  enableHierarchicalTags: boolean
  enableBatchTagging: boolean
  enableSmartAlerts: boolean
  enableRFID: boolean
  enableNFC: boolean
  enableGPS: boolean
  enableBiometric: boolean
  qrCodeSize: 'small' | 'medium' | 'large'
  rfidFrequency: '134.2khz' | '125khz' | '13.56mhz'
  gpsUpdateInterval: number
  customAttributes: CustomAttribute[]
  colorCoding: ColorCode[]
  smartAlerts: SmartAlertSettings
  customFormat: string
  customStartNumber: number
  includeYearInTag: boolean
  barcodeType: string
  barcodeLength: number
  includeCheckDigit: boolean
  paddingZeros: boolean
}

export interface CustomAttribute {
  id?: string
  name: string
  values: string[]
  required: boolean
  sortOrder: number
}

export interface ColorCode {
  name: string
  color: string
  value: string
}

export interface SmartAlertSettings {
  healthReminders: boolean
  breedingReminders: boolean
  vaccinationReminders: boolean
  productionAlerts: boolean
}

export async function getTaggingSettings(farmId: string): Promise<TaggingSettings> {
  const supabase = await createServerSupabaseClient()

  try {
    // Get main settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('animal_tagging_settings')
      .select('*')
      .eq('farm_id', farmId)
      .single()

    // Get custom attributes
    const { data: attributesData, error: attributesError } = await supabase
      .from('custom_attributes')
      .select('*')
      .eq('farm_id', farmId)
      .order('sort_order', { ascending: true })

    if (settingsError && settingsError.code !== 'PGRST116') {
      console.error('Error fetching tagging settings:', settingsError)
    }

    if (attributesError) {
      console.error('Error fetching custom attributes:', attributesError)
    }

    // FIXED: Cast to any to bypass 'never' type error
    const settings = settingsData as any
    const attributes = attributesData as any[]

    // Return default settings if none exist
    if (!settings) {
      console.log('No existing settings found, returning defaults for farm:', farmId)
      return getDefaultTaggingSettings()
    }

    // Map database fields to interface with proper defaults
    const result: TaggingSettings = {
      method: (settings.method as 'basic' | 'structured' | 'automated') || 'basic',
      tagPrefix: settings.tag_prefix || 'COW',
      numberingSystem: (settings.numbering_system as 'sequential' | 'custom' | 'barcode') || 'sequential',
      nextNumber: settings.next_number || 1,
      enablePhotoTags: settings.enable_photo_tags ?? true,
      enableColorCoding: settings.enable_color_coding ?? true,
      enableQRCodes: settings.enable_qr_codes ?? false,
      enableHierarchicalTags: settings.enable_hierarchical_tags ?? false,
      enableBatchTagging: settings.enable_batch_tagging ?? true,
      enableSmartAlerts: settings.enable_smart_alerts ?? true,
      enableRFID: settings.enable_rfid ?? false,
      enableNFC: settings.enable_nfc ?? false,
      enableGPS: settings.enable_gps ?? false,
      enableBiometric: settings.enable_biometric ?? false,
      qrCodeSize: (settings.qr_code_size as 'small' | 'medium' | 'large') || 'medium',
      rfidFrequency: (settings.rfid_frequency as '134.2khz' | '125khz' | '13.56mhz') || '134.2khz',
      gpsUpdateInterval: settings.gps_update_interval || 30,
      
      // New custom format and barcode fields with fallbacks
      customFormat: settings.custom_format || '{PREFIX}-{NUMBER:3}',
      customStartNumber: settings.custom_start_number || 1,
      includeYearInTag: settings.include_year_in_tag ?? false,
      barcodeType: settings.barcode_type || 'code128',
      barcodeLength: settings.barcode_length || 8,
      includeCheckDigit: settings.include_check_digit ?? false,
      paddingZeros: settings.padding_zeros ?? true,
      
      customAttributes: attributes ? attributes.map(attr => ({
        id: attr.id,
        name: attr.name,
        values: attr.values,
        required: attr.required ?? false,
        sortOrder: attr.sort_order ?? 0
      })) : getDefaultCustomAttributes(),
      
      colorCoding: getDefaultColorCoding(),
      smartAlerts: {
        healthReminders: true,
        breedingReminders: true,
        vaccinationReminders: true,
        productionAlerts: true
      }
    }

    console.log('✅ Successfully retrieved tagging settings for farm:', farmId)
    return result

  } catch (error) {
    console.error('❌ Error in getTaggingSettings:', error)
    return getDefaultTaggingSettings()
  }
}

export async function updateTaggingSettings(
  farmId: string,
  settings: Partial<TaggingSettings>,
  userId: string
): Promise<{ success: boolean; error?: string; data?: TaggingSettings }> {
  const supabase = await createServerSupabaseClient()

  try {
    console.log('🔄 Updating tagging settings for farm:', farmId)
    console.log('📝 Settings to update:', settings)

    // First, check if settings already exist for this farm
    const { data: existingSettings, error: checkError } = await supabase
      .from('animal_tagging_settings')
      .select('id, farm_id')
      .eq('farm_id', farmId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing settings:', checkError)
      return { success: false, error: 'Failed to check existing settings' }
    }

    // Prepare the settings data with proper snake_case field names
    const mainSettingsData = {
      farm_id: farmId,
      method: settings.method || 'basic',
      tag_prefix: settings.tagPrefix || 'COW',
      numbering_system: settings.numberingSystem || 'sequential',
      next_number: settings.nextNumber || 1,
      enable_photo_tags: settings.enablePhotoTags ?? true,
      enable_color_coding: settings.enableColorCoding ?? true,
      enable_qr_codes: settings.enableQRCodes ?? false,
      enable_hierarchical_tags: settings.enableHierarchicalTags ?? false,
      enable_batch_tagging: settings.enableBatchTagging ?? true,
      enable_smart_alerts: settings.enableSmartAlerts ?? true,
      enable_rfid: settings.enableRFID ?? false,
      enable_nfc: settings.enableNFC ?? false,
      enable_gps: settings.enableGPS ?? false,
      enable_biometric: settings.enableBiometric ?? false,
      qr_code_size: settings.qrCodeSize || 'medium',
      rfid_frequency: settings.rfidFrequency || '134.2khz',
      gps_update_interval: settings.gpsUpdateInterval || 30,
      custom_format: settings.customFormat || '{PREFIX}-{YEAR}-{NUMBER:3}',
      custom_start_number: settings.customStartNumber || 1,
      include_year_in_tag: settings.includeYearInTag ?? false,
      barcode_type: settings.barcodeType || 'code128',
      barcode_length: settings.barcodeLength || 8,
      include_check_digit: settings.includeCheckDigit ?? false,
      padding_zeros: settings.paddingZeros ?? true,
      updated_at: new Date().toISOString()
    }

    console.log('📤 Prepared settings data:', mainSettingsData)

    let settingsResult

    if (existingSettings) {
      // Update existing record
      console.log('🔄 Updating existing settings record')
      // FIXED: Cast to any
      settingsResult = await (supabase
        .from('animal_tagging_settings') as any)
        .update(mainSettingsData)
        .eq('farm_id', farmId)
        .select()
    } else {
      // Insert new record
      console.log('➕ Creating new settings record')
      // FIXED: Cast to any
      settingsResult = await (supabase
        .from('animal_tagging_settings') as any)
        .insert(mainSettingsData)
        .select()
    }

    if (settingsResult.error) {
      console.error('❌ Error saving main settings:', settingsResult.error)
      return { success: false, error: `Database error: ${settingsResult.error.message}` }
    }

    console.log('✅ Main settings saved successfully')

    // Handle custom attributes if provided
    if (settings.customAttributes) {
      console.log('🔄 Updating custom attributes...')
      
      // Delete existing attributes for this farm
      const { error: deleteError } = await supabase
        .from('custom_attributes')
        .delete()
        .eq('farm_id', farmId)

      if (deleteError) {
        console.error('Error deleting existing attributes:', deleteError)
        // Continue anyway - this might not be critical
      }

      // Insert new attributes if any exist
      if (settings.customAttributes.length > 0) {
        const attributesData = settings.customAttributes.map((attr, index) => ({
          farm_id: farmId,
          name: attr.name,
          values: attr.values,
          required: attr.required ?? false,
          sort_order: attr.sortOrder ?? index
        }))

        console.log('📤 Inserting custom attributes:', attributesData)

        const { error: attributesError } = await (supabase
          .from('custom_attributes') as any)
          .insert(attributesData)

        if (attributesError) {
          console.error('❌ Error inserting custom attributes:', attributesError)
          // Don't fail the entire operation for attribute errors
          console.warn('⚠️ Custom attributes failed to save, but main settings were saved')
        } else {
          console.log('✅ Custom attributes saved successfully')
        }
      }
    }

    // Get and return updated settings
    console.log('📖 Fetching updated settings...')
    const updatedSettings = await getTaggingSettings(farmId)
    
    console.log('✅ Settings update completed successfully')
    return { success: true, data: updatedSettings }

  } catch (error) {
    console.error('❌ Unexpected error in updateTaggingSettings:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

export function validateTaggingSettings(settings: Partial<TaggingSettings>): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Validate tag prefix
  if (settings.tagPrefix && !/^[A-Z0-9]{1,10}$/.test(settings.tagPrefix)) {
    errors.push('Tag prefix must be 1-10 uppercase letters or numbers')
  }

  // Validate method-specific requirements
  if (settings.method === 'automated' && !settings.enableRFID && !settings.enableNFC && !settings.enableGPS) {
    errors.push('Automated method requires at least one tech feature enabled')
  }

  if (settings.enableQRCodes && !['small', 'medium', 'large'].includes(settings.qrCodeSize || '')) {
    errors.push('Invalid QR code size')
  }

  if (settings.enableGPS && (settings.gpsUpdateInterval || 0) < 5) {
    errors.push('GPS update interval must be at least 5 minutes')
  }

  // Validate custom attributes
  if (settings.customAttributes) {
    settings.customAttributes.forEach((attr, index) => {
      if (!attr.name || attr.name.trim().length === 0) {
        errors.push(`Custom attribute ${index + 1}: Name is required`)
      }
      if (!attr.values || attr.values.length === 0) {
        errors.push(`Custom attribute ${index + 1}: At least one value is required`)
      }
    })

    // Check for duplicate attribute names
    const attributeNames = settings.customAttributes.map(attr => attr.name.toLowerCase())
    const duplicates = attributeNames.filter((name, index) => attributeNames.indexOf(name) !== index)
    if (duplicates.length > 0) {
      errors.push('Custom attribute names must be unique')
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

export async function getNextTagNumber(farmId: string): Promise<string> {
  const supabase = await createServerSupabaseClient()

  try {
    const settings = await getTaggingSettings(farmId)

    // Get current next number and increment it
    const nextNum = settings.nextNumber

    // Update the next number in database
    // FIXED: Cast to any
    await (supabase
      .from('animal_tagging_settings') as any)
      .update({
        next_number: nextNum + 1,
        updated_at: new Date().toISOString()
      })
      .eq('farm_id', farmId)

    // Format the tag number based on numbering system
    switch (settings.numberingSystem) {
      case 'sequential':
        return `${settings.tagPrefix}-${String(nextNum).padStart(3, '0')}`
      case 'barcode':
        return `${settings.tagPrefix}${String(nextNum).padStart(6, '0')}`
      case 'custom':
        return `${settings.tagPrefix}-${nextNum}`
      default:
        return `${settings.tagPrefix}-${String(nextNum).padStart(3, '0')}`
    }

  } catch (error) {
    console.error('Error generating next tag number:', error)
    return `COW-001` // Fallback
  }
}

function getDefaultTaggingSettings(): TaggingSettings {
  return {
    method: 'basic',
    tagPrefix: 'COW',
    numberingSystem: 'sequential',
    nextNumber: 1,
    enablePhotoTags: true,
    enableColorCoding: true,
    enableQRCodes: false,
    enableHierarchicalTags: false,
    enableBatchTagging: true,
    enableSmartAlerts: true,
    enableRFID: false,
    enableNFC: false,
    enableGPS: false,
    enableBiometric: false,
    qrCodeSize: 'medium',
    rfidFrequency: '134.2khz',
    gpsUpdateInterval: 30,
    customAttributes: getDefaultCustomAttributes(),
    colorCoding: getDefaultColorCoding(),
    smartAlerts: {
      healthReminders: true,
      breedingReminders: true,
      vaccinationReminders: true,
      productionAlerts: true
    },
    customFormat: '{PREFIX}-{YEAR}-{NUMBER:3}',
    customStartNumber: 1,
    includeYearInTag: false,
    barcodeType: 'code128',
    barcodeLength: 8,
    includeCheckDigit: false,
    paddingZeros: true
  }
}

function getDefaultCustomAttributes(): CustomAttribute[] {
  return [
    {
      name: 'Breed Group',
      values: ['Holstein-Friesian', 'Jersey', 'Ayrshire', 'Guernsey', 'Cross'],
      required: false,
      sortOrder: 0
    },
    {
      name: 'Production Stage',
      values: ['Calf', 'Heifer', 'Lactating', 'Dry'],
      required: false,
      sortOrder: 1
    }
  ]
}

function getDefaultColorCoding(): ColorCode[] {
  return [
    { name: 'Healthy', color: 'bg-green-500', value: 'healthy' },
    { name: 'Sick', color: 'bg-red-500', value: 'sick' },
    { name: 'Under Observation', color: 'bg-yellow-500', value: 'observation' },
    { name: 'Pregnant', color: 'bg-blue-500', value: 'pregnant' },
    { name: 'High Yield', color: 'bg-purple-500', value: 'high_yield' },
    { name: 'Due for Service', color: 'bg-orange-500', value: 'service_due' }
  ]
}