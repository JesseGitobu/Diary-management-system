import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/client'


export interface FarmData {
  id: string
  name: string
  location: string | null
  farm_type: 'Dairy ' | 'cooperative' | 'commercial' | null
  total_cows: number // This will come from animals table count
  created_at: string | null
}

export async function getFarmBasicInfoServer(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Get farm info and owner's user_id
    const { data: farmData, error: farmError } = await supabase
      .from('farms')
      .select(`
        id,
        name,
        
        user_roles!inner(
          role_type,
          status,
          user_id
        )
      `)
      .eq('id', farmId)
      .eq('user_roles.role_type', 'farm_owner')
      .eq('user_roles.status', 'active')
      .single()

    if (farmError) {
      console.error('Error fetching farm data:', farmError)
      return null
    }

    const ownerUserId = farmData.user_roles[0]?.user_id
    let ownerName = 'Unknown Owner'

    if (ownerUserId) {
      // Get user from auth.users using admin API
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(ownerUserId)
      
      if (!authError && authUser.user) {
        const metadata = authUser.user.user_metadata || {}
        const identities = authUser.user.identities || []
        
        // Try multiple sources for the name
        ownerName = metadata.full_name ||
                    metadata.name ||
                    metadata.display_name ||
                    metadata.displayName ||
                    // Try from identity data (Google, GitHub, etc.)
                    identities[0]?.identity_data?.full_name ||
                    identities[0]?.identity_data?.name ||
                    // Fallback to email
                    authUser.user.email?.split('@')[0] ||
                    'Unknown Owner'
      }
    }

    return {
      name: farmData.name || 'Unknown Farm',
      owner: ownerName,
      subscription_plan: 'Free'
    }
    
  } catch (error) {
    console.error('Server-side error:', error)
    return null
  }
}

// Method 2: Server-side function
export async function getFarmDataServer(farmId: string): Promise<FarmData | null> {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Get farm basic data and animals count in parallel
    const [farmResult, animalsResult] = await Promise.all([
      supabase
        .from('farms')
        .select(`
          id,
          name,
          location,
          farm_type,
          created_at
        `)
        .eq('id', farmId)
        .single(),
      
      supabase
        .from('animals')
        .select('id', { count: 'exact', head: true })
        .eq('farm_id', farmId)
    ])

    if (farmResult.error) {
      console.error('Error fetching farm data:', farmResult.error)
      return null
    }

    // Get the count from the animals query
    const totalCows = animalsResult.count || 0
    console.log('Total cows:', totalCows)

    return {
      ...farmResult.data,
      total_cows: totalCows,
      farm_type: farmResult.data.farm_type as 'Dairy ' | 'cooperative' | 'commercial' | null
    }
  } catch (error) {
    console.error('Unexpected error fetching farm data:', error)
    return null
  }
}

// Server-side profile data function
export async function getFarmProfileDataServer(farmId: string) {
  
  try {
    const farm = await getFarmDataServer(farmId)
    
    if (!farm) return null

    return {
      name: farm.name || '',
      owner_name: 'Sample Owner',
      owner_phone: '0712345678',
      owner_email: 'example@example.com',
      farm_size_acres:  20,
      total_cows: farm.total_cows || 0, // This now comes from animals table
      farm_type: farm.farm_type || 'Dairy',
      county:   'Sample County',
      sub_county: 'Sample Sub County',
      village: 'Sample Village',
      preferred_currency: 'KSH',
      preferred_volume_unit: 'liters',
      description: 'This is a sample farm description.'
    }
  } catch (error) {
    console.error('Error fetching farm profile data:', error)
    return null
  }
}

export async function getNotificationSettings(farmId: string, userId: string) {
  
  const supabase = await createServerSupabaseClient()

  const { data: settings, error } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('farm_id', farmId)
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error fetching notification settings:', error)
    return getDefaultNotificationSettings()
  }

  if (!settings) {
    return getDefaultNotificationSettings()
  }

  return {
    // Health Alerts
    health_alerts_enabled: settings.health_alerts_enabled ?? true,
    sick_animal_alerts: settings.sick_animal_alerts ?? true,
    vaccination_reminders: settings.vaccination_reminders ?? true,
    treatment_due_alerts: settings.treatment_due_alerts ?? true,
    health_check_reminders: settings.health_check_reminders ?? true,
    
    // Breeding Alerts
    breeding_alerts_enabled: settings.breeding_alerts_enabled ?? true,
    heat_detection_alerts: settings.heat_detection_alerts ?? true,
    calving_reminders: settings.calving_reminders ?? true,
    pregnancy_check_reminders: settings.pregnancy_check_reminders ?? true,
    breeding_schedule_alerts: settings.breeding_schedule_alerts ?? true,
    
    // Production Alerts
    production_alerts_enabled: settings.production_alerts_enabled ?? true,
    milk_yield_drop_alerts: settings.milk_yield_drop_alerts ?? true,
    milk_yield_threshold: settings.milk_yield_threshold ?? 15,
    quality_issue_alerts: settings.quality_issue_alerts ?? true,
    milking_schedule_alerts: settings.milking_schedule_alerts ?? false,
    
    // Task & Maintenance Alerts
    task_alerts_enabled: settings.task_alerts_enabled ?? true,
    feed_low_alerts: settings.feed_low_alerts ?? true,
    equipment_maintenance_alerts: settings.equipment_maintenance_alerts ?? true,
    routine_task_reminders: settings.routine_task_reminders ?? true,
    
    // Delivery Methods
    in_app_notifications: settings.in_app_notifications ?? true,
    sms_notifications: settings.sms_notifications ?? false,
    sms_phone_number: settings.sms_phone_number ?? '',
    whatsapp_notifications: settings.whatsapp_notifications ?? false,
    whatsapp_phone_number: settings.whatsapp_phone_number ?? '',
    email_notifications: settings.email_notifications ?? true,
    email_address: settings.email_address ?? '',
    
    // Timing
    quiet_hours_enabled: settings.quiet_hours_enabled ?? false,
    quiet_start_time: settings.quiet_start_time ?? '22:00',
    quiet_end_time: settings.quiet_end_time ?? '06:00',
    urgent_override_quiet_hours: settings.urgent_override_quiet_hours ?? true
  }
}

function getDefaultNotificationSettings() {
  return {
    // Health Alerts
    health_alerts_enabled: true,
    sick_animal_alerts: true,
    vaccination_reminders: true,
    treatment_due_alerts: true,
    health_check_reminders: true,
    
    // Breeding Alerts
    breeding_alerts_enabled: true,
    heat_detection_alerts: true,
    calving_reminders: true,
    pregnancy_check_reminders: true,
    breeding_schedule_alerts: true,
    
    // Production Alerts
    production_alerts_enabled: true,
    milk_yield_drop_alerts: true,
    milk_yield_threshold: 15,
    quality_issue_alerts: true,
    milking_schedule_alerts: false,
    
    // Task & Maintenance Alerts
    task_alerts_enabled: true,
    feed_low_alerts: true,
    equipment_maintenance_alerts: true,
    routine_task_reminders: true,
    
    // Delivery Methods
    in_app_notifications: true,
    sms_notifications: false,
    sms_phone_number: '',
    whatsapp_notifications: false,
    whatsapp_phone_number: '',
    email_notifications: true,
    email_address: '',
    
    // Timing
    quiet_hours_enabled: false,
    quiet_start_time: '22:00',
    quiet_end_time: '06:00',
    urgent_override_quiet_hours: true
  }
}

export async function getFinancialSettings(farmId: string) {
  const supabase = await createServerSupabaseClient()
  // Get financial settings
  const { data: settings, error: settingsError } = await supabase
    .from('financial_settings')
    .select('*')
    .eq('farm_id', farmId)
    .single()

  // Get buyers
  const { data: buyers, error: buyersError } = await supabase
    .from('milk_buyers')
    .select('*')
    .eq('farm_id', farmId)
    .eq('is_active', true)
    .order('name')

  if (settingsError && settingsError.code !== 'PGRST116') {
    console.error('Error fetching financial settings:', settingsError)
  }

  if (buyersError) {
    console.error('Error fetching buyers:', buyersError)
  }

  // Return default settings if none exist
  const defaultSettings = {
    // Default Pricing
    default_milk_price_per_liter: 50,
    currency: 'KSH' as const,
    price_updates_automatic: false,
    
    // Payment Tracking
    enable_payment_tracking: true,
    default_payment_method: 'cash' as const,
    mpesa_business_number: '',
    bank_account_name: '',
    bank_account_number: '',
    bank_name: '',
    
    // Financial Reporting
    enable_profit_tracking: false,
    include_feed_costs: true,
    include_labor_costs: true,
    include_vet_costs: true,
    include_equipment_costs: true,
    
    // Tax Settings
    enable_tax_tracking: false,
    vat_rate: 16.0,
    business_registration_number: '',
    
    buyers: buyers || []
  }

  if (!settings) {
    return defaultSettings
  }

  return {
    default_milk_price_per_liter: settings.default_milk_price_per_liter ?? defaultSettings.default_milk_price_per_liter,
    currency: settings.currency ?? defaultSettings.currency,
    price_updates_automatic: settings.price_updates_automatic ?? defaultSettings.price_updates_automatic,
    enable_payment_tracking: settings.enable_payment_tracking ?? defaultSettings.enable_payment_tracking,
    default_payment_method: settings.default_payment_method ?? defaultSettings.default_payment_method,
    mpesa_business_number: settings.mpesa_business_number ?? defaultSettings.mpesa_business_number,
    bank_account_name: settings.bank_account_name ?? defaultSettings.bank_account_name,
    bank_account_number: settings.bank_account_number ?? defaultSettings.bank_account_number,
    bank_name: settings.bank_name ?? defaultSettings.bank_name,
    enable_profit_tracking: settings.enable_profit_tracking ?? defaultSettings.enable_profit_tracking,
    include_feed_costs: settings.include_feed_costs ?? defaultSettings.include_feed_costs,
    include_labor_costs: settings.include_labor_costs ?? defaultSettings.include_labor_costs,
    include_vet_costs: settings.include_vet_costs ?? defaultSettings.include_vet_costs,
    include_equipment_costs: settings.include_equipment_costs ?? defaultSettings.include_equipment_costs,
    enable_tax_tracking: settings.enable_tax_tracking ?? defaultSettings.enable_tax_tracking,
    vat_rate: settings.vat_rate ?? defaultSettings.vat_rate,
    business_registration_number: settings.business_registration_number ?? defaultSettings.business_registration_number,
    buyers: buyers || []
  }
}

export async function getAnimalTaggingSettings(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  const { data: settings, error } = await supabase
    .from('animal_tagging_settings')
    .select('*')
    .eq('farm_id', farmId)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error fetching animal tagging settings:', error)
    return getDefaultTaggingSettings()
  }

  if (!settings) {
    return getDefaultTaggingSettings()
  }

  return settings
}

function getDefaultTaggingSettings() {
  return {
    method: 'basic',
    tagPrefix: 'COW',
    tagNumbering: 'sequential',
    enablePhotoTags: true,
    enableColorCoding: true,
    customAttributes: [
      { name: 'Breed Group', values: ['Holstein', 'Jersey', 'Friesian', 'Cross'] },
      { name: 'Production Stage', values: ['Calf', 'Heifer', 'Lactating', 'Dry'] }
    ],
    enableHierarchicalTags: false,
    enableBatchTagging: true,
    enableQRCodes: false,
    enableSmartAlerts: true,
    qrCodeSize: 'medium',
    enableRFID: false,
    enableNFC: false,
    enableGPS: false,
    enableBiometric: false,
    rfidFrequency: '134.2khz',
    gpsUpdateInterval: 30,
    smartAlerts: {
      healthReminders: true,
      breedingReminders: true,
      vaccinationReminders: true,
      productionAlerts: true
    },
    colorCoding: [
      { name: 'Healthy', color: 'bg-green-500', value: 'healthy' },
      { name: 'Sick', color: 'bg-red-500', value: 'sick' },
      { name: 'Under Observation', color: 'bg-yellow-500', value: 'observation' },
      { name: 'Pregnant', color: 'bg-blue-500', value: 'pregnant' },
      { name: 'High Yield', color: 'bg-purple-500', value: 'high_yield' },
      { name: 'Due for Service', color: 'bg-orange-500', value: 'service_due' }
    ]
  }
}

