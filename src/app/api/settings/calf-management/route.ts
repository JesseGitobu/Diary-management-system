import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import {
  getCalfManagementSettings,
  saveCalfManagementSettings,
  CalfSettingsInput,
} from '@/lib/database/calf-settings'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const farmId = searchParams.get('farmId')

    if (!farmId) {
      return NextResponse.json({ error: 'farmId is required' }, { status: 400 })
    }

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id) as any
    if (!userRole || userRole.farm_id !== farmId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const settings = await getCalfManagementSettings(farmId)

    return NextResponse.json({ success: true, settings })

  } catch (error) {
    console.error('[CalfManagementAPI:GET] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { farmId, settings } = body as { farmId: string; settings: CalfSettingsInput }

    if (!farmId || !settings) {
      return NextResponse.json({ error: 'farmId and settings are required' }, { status: 400 })
    }

    const userRole = await getUserRole(user.id) as any
    if (!userRole || userRole.farm_id !== farmId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Basic validation
    const validationError = validateCalfSettings(settings)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    console.log('[CalfManagementAPI:PUT] Saving settings for farm:', farmId)

    const result = await saveCalfManagementSettings(farmId, settings, user.id)

    if (!result.success) {
      let userError = result.error ?? 'Failed to save settings'
      if (userError.includes('unique constraint')) {
        userError = 'Settings conflict. Please refresh and try again.'
      } else if (userError.includes('foreign key')) {
        userError = 'Invalid farm reference. Please check your permissions.'
      } else if (userError.includes('invalid input value for enum')) {
        userError = 'Invalid value for a selection field. Please check your settings.'
      }
      return NextResponse.json({ error: userError, technical_error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Calf management settings saved successfully',
    })

  } catch (error) {
    console.error('[CalfManagementAPI:PUT] Error:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Internal server error', technical_error: msg }, { status: 500 })
  }
}

function validateCalfSettings(s: CalfSettingsInput): string | null {
  if (typeof s.birthWeightGlobal !== 'number' || s.birthWeightGlobal <= 0) {
    return 'birthWeightGlobal must be a positive number'
  }
  if (typeof s.expectedDailyGain !== 'number' || s.expectedDailyGain <= 0) {
    return 'expectedDailyGain must be a positive number'
  }
  if (typeof s.weaningAge !== 'number' || s.weaningAge < 1) {
    return 'weaningAge must be at least 1 day'
  }
  if (!['fixed', 'conditional'].includes(s.weaningType)) {
    return 'weaningType must be "fixed" or "conditional"'
  }
  if (!['daily', 'weekly', 'bi-weekly', 'custom'].includes(s.weightMeasurementFrequency)) {
    return 'weightMeasurementFrequency must be daily, weekly, bi-weekly, or custom'
  }
  if (!['daily', 'weekly', 'bi-weekly', 'custom'].includes(s.milkAdjustmentPeriod)) {
    return 'milkAdjustmentPeriod must be daily, weekly, bi-weekly, or custom'
  }
  if (!Array.isArray(s.vaccinations)) return 'vaccinations must be an array'
  if (!Array.isArray(s.deworming)) return 'deworming must be an array'
  if (!Array.isArray(s.vitaminSupplements)) return 'vitaminSupplements must be an array'
  if (!Array.isArray(s.milkAdjustmentSchedule)) return 'milkAdjustmentSchedule must be an array'

  for (const v of s.vaccinations) {
    if (!v.name || typeof v.ageInDays !== 'number') {
      return 'Each vaccination must have a name and ageInDays'
    }
  }
  for (const d of s.deworming) {
    if (!d.name || typeof d.ageInDays !== 'number') {
      return 'Each deworming entry must have a name and ageInDays'
    }
  }
  for (const vs of s.vitaminSupplements) {
    if (!vs.name || typeof vs.ageInDays !== 'number') {
      return 'Each vitamin supplement must have a name and ageInDays'
    }
  }
  for (const p of s.milkAdjustmentSchedule) {
    if (typeof p.periodNum !== 'number' || typeof p.startDay !== 'number' ||
        typeof p.endDay !== 'number' || typeof p.dailyMilk !== 'number') {
      return 'Each milk adjustment period must have periodNum, startDay, endDay, and dailyMilk'
    }
    if (p.endDay <= p.startDay) {
      return `Milk adjustment period ${p.periodNum}: endDay must be greater than startDay`
    }
  }

  return null
}
