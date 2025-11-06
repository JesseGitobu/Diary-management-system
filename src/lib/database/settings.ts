// src/lib/database/settings.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { useAuth } from '@/lib/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'

export interface FarmData {
  id: string
  name: string
  location: string | null
  farm_type: 'Dairy' | 'cooperative' | 'commercial' | null
  total_cows: number // This will come from animals table count
  created_at: string | null
}

export interface FarmProfileData {
  name: string
  owner_name: string
  owner_phone: string
  owner_email: string
  farm_size_acres: number
  total_cows: number
  farm_type: 'Dairy Cattle' | 'Dairy Goat' | 'Mixed Dairy'
  county: string
  sub_county: string
  village: string
  preferred_currency: 'KSH' | 'USD'
  preferred_volume_unit: 'liters' | 'gallons'
  description?: string
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
      farm_type: farmResult.data.farm_type as 'Dairy' | 'cooperative' | 'commercial' | null
    }
  } catch (error) {
    console.error('Unexpected error fetching farm data:', error)
    return null
  }
}

/**
 * 🎯 ENHANCED: Get farm profile data from farm_profile_settings table
 * Falls back to farms table if settings don't exist yet
 */
export async function getFarmProfileDataServer(farmId: string): Promise<FarmProfileData | null> {
   if (!farmId || farmId === 'null' ) {
    console.log('⚠️ Invalid or missing farm ID, returning null')
    return null
  }

  const supabase = await createServerSupabaseClient()

  try {
    console.log('🔍 Fetching farm profile data for farm:', farmId)

    // First, try to get data from farm_profile_settings (most complete)
    const { data: settings, error: settingsError } = await supabase
      .from('farm_profile_settings')
      .select('*')
      .eq('farm_id', farmId)
      .maybeSingle()

    if (settings) {
      console.log('✅ Found farm profile settings')
      // Map farm_type to valid type
      const farmType = (type: string): 'Dairy Cattle' | 'Dairy Goat' | 'Mixed Dairy' => {
        switch(type) {
          case 'Dairy Cattle': return 'Dairy Cattle';
          case 'Dairy Goat': return 'Dairy Goat';
          case 'Mixed Dairy': return 'Mixed Dairy';
          default: return 'Dairy Cattle';
        }
      };

      const currency = (cur: string): 'KSH' | 'USD' => {
        return cur === 'USD' ? 'USD' : 'KSH';
      };

      const volumeUnit = (unit: string): 'liters' | 'gallons' => {
        return unit === 'gallons' ? 'gallons' : 'liters';
      };

      return {
        name: settings.farm_name,
        owner_name: settings.owner_name,
        owner_phone: settings.owner_phone,
        owner_email: settings.owner_email,
        farm_size_acres: settings.farm_size_acres,
        total_cows: settings.total_cows,
        farm_type: farmType(settings.farm_type),
        county: settings.county,
        sub_county: settings.sub_county || '',
        village: settings.village || '',
        preferred_currency: currency(settings.preferred_currency),
        preferred_volume_unit: volumeUnit(settings.preferred_volume_unit),
        description: settings.description || ''
      }
    }

    console.log('⚠️ No farm_profile_settings found, falling back to farms table')

    // Fallback: Get basic data from farms table and create defaults
    const { data: farm, error: farmError } = await supabase
      .from('farms')
      .select('*')
      .eq('id', farmId)
      .single()

    if (farmError || !farm) {
      console.error('❌ Error fetching farm:', farmError)
      return null
    }

    console.log('✅ Found farm data, creating default profile')

    // Get user info from user_roles to populate owner fields
    const { user, signOut } = useAuth()

    const ownerEmail = user?.email || 'owner@farm.com'
    const ownerName = user?.user_metadata?.full_name || 'Farm Owner'

    // Get total cows count
    const { count: totalCows } = await supabase
      .from('animals')
      .select('id', { count: 'exact', head: true })
      .eq('farm_id', farmId)

    // Parse location from farms table
    const locationParts = farm.location?.split(',') || []
    const county = locationParts[locationParts.length - 1]?.trim() || 'Nairobi'
    const sub_county = locationParts[locationParts.length - 2]?.trim() || ''
    const village = locationParts[0]?.trim() || ''

    // Map farm_type from database to UI format
    const mapFarmType = (dbType: string): 'Dairy Cattle' | 'Dairy Goat' | 'Mixed Dairy' => {
      const typeMap: Record<string, 'Dairy Cattle' | 'Dairy Goat' | 'Mixed Dairy'> = {
        'dairy': 'Dairy Cattle',
        'dairy_cattle': 'Dairy Cattle',
        'Dairy': 'Dairy Cattle',
        'Dairy Cattle': 'Dairy Cattle',
        'dairy_goat': 'Dairy Goat',
        'Dairy Goat': 'Dairy Goat',
        'mixed_dairy': 'Mixed Dairy',
        'Mixed Dairy': 'Mixed Dairy',
        'cooperative': 'Mixed Dairy',
        'commercial': 'Dairy Cattle'
      }
      return typeMap[dbType] || 'Dairy Cattle'
    }

    // Return default data structure
    return {
      name: farm.name || 'My Farm',
      owner_name: ownerName,
      owner_phone: '+254700000000', // Default, should be updated
      owner_email: ownerEmail,
      farm_size_acres: 0, // Default, should be updated
      total_cows: totalCows || 0,
      farm_type: mapFarmType(farm.farm_type || 'dairy'),
      county: county,
      sub_county: sub_county,
      village: village,
      preferred_currency: 'KSH',
      preferred_volume_unit: 'liters',
      description: ''
    }

  } catch (error) {
    console.error('❌ Error in getFarmProfileDataServer:', error)
    return null
  }
}

/**
 * 🎯 NEW: Create initial farm profile settings when a farm is created
 * This should be called during farm creation or onboarding
 */
export async function createInitialFarmProfileSettings(
  farmId: string,
  userId: string,
  farmName: string,
  ownerEmail: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()

  try {
    console.log('🔍 Creating initial farm profile settings for farm:', farmId)

    const { error } = await supabase
      .from('farm_profile_settings')
      .insert({
        farm_id: farmId,
        user_id: userId,
        farm_name: farmName,
        farm_type: 'Dairy Cattle',
        owner_name: 'Farm Owner', // Default, to be updated
        owner_phone: '+254700000000', // Default, to be updated
        owner_email: ownerEmail,
        farm_size_acres: 0,
        total_cows: 0,
        county: 'Nairobi', // Default, to be updated
        sub_county: null,
        village: null,
        preferred_currency: 'KSH',
        preferred_volume_unit: 'liters',
        description: null
      })

    if (error) {
      console.error('❌ Error creating initial farm profile settings:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ Initial farm profile settings created')
    return { success: true }

  } catch (error) {
    console.error('❌ Exception in createInitialFarmProfileSettings:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    }
  }
}

/**
 * 🎯 NEW: Update farm profile settings
 * This is called from the API route
 */
export async function updateFarmProfileSettings(
  farmId: string,
  userId: string,
  profileData: FarmProfileData
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()

  try {
    console.log('🔍 Updating farm profile settings for farm:', farmId)

    const { error } = await supabase
      .from('farm_profile_settings')
      .upsert({
        farm_id: farmId,
        user_id: userId,
        farm_name: profileData.name,
        farm_type: profileData.farm_type,
        description: profileData.description || null,
        owner_name: profileData.owner_name,
        owner_phone: profileData.owner_phone,
        owner_email: profileData.owner_email,
        farm_size_acres: profileData.farm_size_acres,
        total_cows: profileData.total_cows,
        county: profileData.county,
        sub_county: profileData.sub_county || null,
        village: profileData.village || null,
        preferred_currency: profileData.preferred_currency,
        preferred_volume_unit: profileData.preferred_volume_unit,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'farm_id'
      })

    if (error) {
      console.error('❌ Error updating farm profile settings:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ Farm profile settings updated')
    return { success: true }

  } catch (error) {
    console.error('❌ Exception in updateFarmProfileSettings:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    }
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