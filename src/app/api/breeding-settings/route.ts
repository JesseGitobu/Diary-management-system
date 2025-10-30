// app/api/breeding-settings/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.warn('⚠️ [BREEDING-SETTINGS] No authenticated user, returning defaults')
      return NextResponse.json({
        success: true,
        settings: getDefaultSettings()
      })
    }

    // Get user's farm_id
    const { data: userFarm, error: farmError } = await supabase
      .from('user_roles')
      .select('farm_id')
      .eq('user_id', user.id)
      .single()

    if (farmError || !userFarm?.farm_id) {
      console.warn('⚠️ [BREEDING-SETTINGS] No farm found for user, returning defaults')
      return NextResponse.json({
        success: true,
        settings: getDefaultSettings()
      })
    }

    console.log('🔍 [BREEDING-SETTINGS] Fetching settings for farm:', userFarm.farm_id)

    // Get breeding settings for the farm
    const { data: settings, error } = await supabase
      .from('farm_breeding_settings')
      .select('*')
      .eq('farm_id', userFarm.farm_id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('❌ [BREEDING-SETTINGS] Error fetching settings:', error)
      throw error
    }

    // If no settings exist, return defaults
    if (!settings) {
      console.log('ℹ️ [BREEDING-SETTINGS] No settings found, returning defaults')
      return NextResponse.json({
        success: true,
        settings: getDefaultSettings()
      })
    }

    console.log('✅ [BREEDING-SETTINGS] Settings found:', {
      min_age: settings.minimum_breeding_age_months,
      gestation: settings.default_gestation,
      preg_check: settings.pregnancy_check_days
    })

    // Map database fields to component expectations
    const mappedSettings = {
      minimumBreedingAgeMonths: settings.minimum_breeding_age_months || 15,
      defaultGestationPeriod: settings.default_gestation || 280,
      pregnancyCheckDays: settings.pregnancy_check_days || 45,
      autoSchedulePregnancyCheck: settings.auto_schedule_pregnancy_check ?? true,
      postpartumBreedingDelayDays: settings.postpartum_breeding_delay_days || 60,
      dryOffBeforeCalvingDays: settings.days_pregnant_at_dryoff 
        ? (settings.default_gestation - settings.days_pregnant_at_dryoff) 
        : 60,
      heatCycleDays: settings.default_cycle_interval || 21,
      enableHeatDetection: settings.detection_method === 'sensor',
      enableBreedingAlerts: (settings.smart_alerts as { breedingReminders?: boolean })?.breedingReminders ?? true
    }

    return NextResponse.json({
      success: true,
      settings: mappedSettings
    })
  } catch (error: any) {
    console.error('❌ [BREEDING-SETTINGS] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch breeding settings' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's farm_id
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('farm_id, role_type')
      .eq('user_id', user.id)
      .single()

    if (roleError || !userRole?.farm_id) {
      return NextResponse.json(
        { success: false, error: 'No farm associated with user' },
        { status: 400 }
      )
    }

    // Check if user has permission to update settings
    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    console.log('🔄 [BREEDING-SETTINGS] Updating settings for farm:', userRole.farm_id)

    // Map component fields back to database fields
    const dbSettings: any = {}
    
    if (body.minimumBreedingAgeMonths !== undefined) {
      dbSettings.minimum_breeding_age_months = body.minimumBreedingAgeMonths
    }
    if (body.defaultGestationPeriod !== undefined) {
      dbSettings.default_gestation = body.defaultGestationPeriod
    }
    if (body.pregnancyCheckDays !== undefined) {
      dbSettings.pregnancy_check_days = body.pregnancyCheckDays
    }
    if (body.autoSchedulePregnancyCheck !== undefined) {
      dbSettings.auto_schedule_pregnancy_check = body.autoSchedulePregnancyCheck
    }
    if (body.postpartumBreedingDelayDays !== undefined) {
      dbSettings.postpartum_breeding_delay_days = body.postpartumBreedingDelayDays
    }
    if (body.heatCycleDays !== undefined) {
      dbSettings.default_cycle_interval = body.heatCycleDays
    }

    dbSettings.updated_at = new Date().toISOString()

    // Update breeding settings
    const { data: settings, error } = await supabase
      .from('farm_breeding_settings')
      .update(dbSettings)
      .eq('farm_id', userRole.farm_id)
      .select()
      .single()

    if (error) {
      console.error('❌ [BREEDING-SETTINGS] Error updating settings:', error)
      throw error
    }

    console.log('✅ [BREEDING-SETTINGS] Settings updated successfully')

    // Map back to component format
    const mappedSettings = {
      minimumBreedingAgeMonths: settings.minimum_breeding_age_months,
      defaultGestationPeriod: settings.default_gestation,
      pregnancyCheckDays: settings.pregnancy_check_days,
      autoSchedulePregnancyCheck: settings.auto_schedule_pregnancy_check,
      postpartumBreedingDelayDays: settings.postpartum_breeding_delay_days,
      dryOffBeforeCalvingDays: settings.days_pregnant_at_dryoff 
        ? (settings.default_gestation - settings.days_pregnant_at_dryoff) 
        : 60,
      heatCycleDays: settings.default_cycle_interval,
      enableHeatDetection: settings.detection_method === 'sensor',
      enableBreedingAlerts: (settings.smart_alerts as { breedingReminders?: boolean })?.breedingReminders ?? true
    }

    return NextResponse.json({
      success: true,
      settings: mappedSettings,
      message: 'Breeding settings updated successfully'
    })
  } catch (error: any) {
    console.error('❌ [BREEDING-SETTINGS] Error in PUT:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update breeding settings' },
      { status: 500 }
    )
  }
}

// Helper function to get default settings
function getDefaultSettings() {
  return {
    minimumBreedingAgeMonths: 15,
    defaultGestationPeriod: 280,
    pregnancyCheckDays: 45,
    autoSchedulePregnancyCheck: true,
    postpartumBreedingDelayDays: 60,
    dryOffBeforeCalvingDays: 60,
    heatCycleDays: 21,
    enableHeatDetection: false,
    enableBreedingAlerts: true
  }
}