// app/api/settings/health-breeding/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { updateBreedingSettings } from '@/lib/database/breeding-settings'

export async function PUT(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { farmId, settings } = body

    if (!farmId || !settings) {
      return NextResponse.json(
        { error: 'Missing required fields: farmId and settings' },
        { status: 400 }
      )
    }

    // Verify user has access to this farm
    const userRole = await getUserRole(user.id)
    if (!userRole || userRole.farm_id !== farmId) {
      return NextResponse.json(
        { error: 'You do not have access to this farm' },
        { status: 403 }
      )
    }

    // Check user has permission to modify settings
    const allowedRoles = ['farm_owner', 'farm_manager', 'veterinarian']
    if (!allowedRoles.includes(userRole.role_type)) {
      return NextResponse.json(
        { error: 'You do not have permission to modify breeding settings' },
        { status: 403 }
      )
    }

    // Validate settings
    const validatedSettings = validateBreedingSettings(settings)
    if (!validatedSettings.valid) {
      return NextResponse.json(
        { error: validatedSettings.error },
        { status: 400 }
      )
    }

    // Update settings in database
    const result = await updateBreedingSettings(farmId, settings)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Breeding settings updated successfully',
      settings: settings
    })

  } catch (error) {
    console.error('Error updating breeding settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get farmId from query params
    const { searchParams } = new URL(request.url)
    const farmId = searchParams.get('farmId')

    if (!farmId) {
      return NextResponse.json(
        { error: 'Missing required parameter: farmId' },
        { status: 400 }
      )
    }

    // Verify user has access to this farm
    const userRole = await getUserRole(user.id)
    if (!userRole || userRole.farm_id !== farmId) {
      return NextResponse.json(
        { error: 'You do not have access to this farm' },
        { status: 403 }
      )
    }

    // Get settings from database
    const { getBreedingSettings } = await import('@/lib/database/breeding-settings')
    const settings = await getBreedingSettings(farmId)

    return NextResponse.json({
      success: true,
      settings: settings
    })

  } catch (error) {
    console.error('Error fetching breeding settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Validation function
function validateBreedingSettings(settings: any): { valid: boolean; error?: string } {

    // Validate minimum breeding age
    if (settings.minimumBreedingAgeMonths < 12 || settings.minimumBreedingAgeMonths > 24) {
    return { 
      valid: false, 
      error: 'Minimum breeding age must be between 12 and 24 months' 
    }
  }
  // Validate cycle interval
  if (settings.defaultCycleInterval < 15 || settings.defaultCycleInterval > 35) {
    return { valid: false, error: 'Default cycle interval must be between 15 and 35 days' }
  }

  // Validate missed heat alert
  if (settings.missedHeatAlert < 20 || settings.missedHeatAlert > 60) {
    return { valid: false, error: 'Missed heat alert must be between 20 and 60 days' }
  }

  // Validate pregnancy check days
  if (settings.pregnancyCheckDays < 30 || settings.pregnancyCheckDays > 90) {
    return { valid: false, error: 'Pregnancy check days must be between 30 and 90 days' }
  }

  // Validate diagnosis interval
  if (settings.diagnosisInterval < 30 || settings.diagnosisInterval > 90) {
    return { valid: false, error: 'Diagnosis interval must be between 30 and 90 days' }
  }

  // Validate heat retry days
  if (settings.heatRetryDays < 15 || settings.heatRetryDays > 35) {
    return { valid: false, error: 'Heat retry days must be between 15 and 35 days' }
  }

  // Validate gestation period
  if (settings.defaultGestation < 260 || settings.defaultGestation > 300) {
    return { valid: false, error: 'Default gestation must be between 260 and 300 days' }
  }

  // Validate cost per AI (if provided)
  if (settings.costPerAI !== undefined && settings.costPerAI < 0) {
    return { valid: false, error: 'Cost per AI cannot be negative' }
  }

  // Validate alert types
  if (!Array.isArray(settings.alertType) || settings.alertType.length === 0) {
    return { valid: false, error: 'At least one alert type must be selected' }
  }

  if (settings.postpartumBreedingDelayDays < 30 || settings.postpartumBreedingDelayDays > 120) {
    return { 
      valid: false, 
      error: 'Postpartum breeding delay must be between 30 and 120 days' 
    }
  }

  const validAlertTypes = ['app', 'sms', 'whatsapp']
  for (const type of settings.alertType) {
    if (!validAlertTypes.includes(type)) {
      return { valid: false, error: `Invalid alert type: ${type}` }
    }
  }

  // Validate dry-off timing
  if (settings.daysPregnantAtDryoff < 180 || settings.daysPregnantAtDryoff > 250) {
    return { 
      valid: false, 
      error: 'Days pregnant at dry-off must be between 180 and 250 days' 
    }
  }

  // Logical validation: dry-off should happen before calving
  if (settings.daysPregnantAtDryoff >= settings.defaultGestation) {
    return {
      valid: false,
      error: 'Dry-off must occur before expected calving date'
    }
  }

  // Ensure reasonable dry period (30-90 days)
  const dryPeriod = settings.defaultGestation - settings.daysPregnantAtDryoff
  if (dryPeriod < 30 || dryPeriod > 90) {
    return {
      valid: false,
      error: 'Calculated dry period should be between 30-90 days'
    }
  }

  return { valid: true }
}