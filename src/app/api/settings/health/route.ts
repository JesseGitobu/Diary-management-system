// app/api/settings/health/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getHealthSettings, updateHealthSettings } from '@/lib/database/health-settings'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const searchParams = request.nextUrl.searchParams
    const farmId = searchParams.get('farmId')

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // If farmId is provided, use it; otherwise, get from user_roles
    let targetFarmId = farmId

    if (!targetFarmId) {
      const { data: userRoleResult, error: roleError } = await supabase
        .from('user_roles')
        .select('farm_id')
        .eq('user_id', user.id)
        .single()

      // Cast to any to fix "Property 'farm_id' does not exist on type 'never'"
      const userRole = userRoleResult as any

      if (roleError || !userRole?.farm_id) {
        return NextResponse.json(
          { success: false, error: 'No farm associated with user' },
          { status: 400 }
        )
      }

      targetFarmId = userRole.farm_id
    }

    // Verify user has access to this farm
    // Cast supabase to any to prevent "Argument of type 'string | null' is not assignable" error
    const { data: userRoleResult, error: roleError } = await (supabase as any)
      .from('user_roles')
      .select('role_type')
      .eq('user_id', user.id)
      .eq('farm_id', targetFarmId)
      .single()

    const userRole = userRoleResult as any

    if (roleError || !userRole) {
      return NextResponse.json(
        { success: false, error: 'Access denied to this farm' },
        { status: 403 }
      )
    }

    // Get health settings
    // We can safely assert targetFarmId is string here because of the checks above
    const settings = await getHealthSettings(targetFarmId!)

    if (!settings) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch health settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      settings
    })
  } catch (error: any) {
    console.error('❌ [HEALTH-SETTINGS] Error in GET:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch health settings' },
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

    const body = await request.json()
    const { farmId, settings } = body

    if (!farmId || !settings) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: farmId and settings' },
        { status: 400 }
      )
    }

    // Verify user has permission to update settings
    const { data: userRoleResult, error: roleError } = await supabase
      .from('user_roles')
      .select('role_type')
      .eq('user_id', user.id)
      .eq('farm_id', farmId)
      .single()

    // Cast to any to fix type errors
    const userRole = userRoleResult as any

    if (roleError || !userRole) {
      return NextResponse.json(
        { success: false, error: 'Access denied to this farm' },
        { status: 403 }
      )
    }

    // Check if user has permission to update settings
    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to update health settings' },
        { status: 403 }
      )
    }

    console.log('🔄 [HEALTH-SETTINGS] Updating settings for farm:', farmId)

    // Update health settings
    const result = await updateHealthSettings(farmId, settings)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to update health settings' },
        { status: 500 }
      )
    }

    // Fetch updated settings
    const updatedSettings = await getHealthSettings(farmId)

    console.log('✅ [HEALTH-SETTINGS] Settings updated successfully')

    return NextResponse.json({
      success: true,
      settings: updatedSettings,
      message: 'Health settings updated successfully'
    })
  } catch (error: any) {
    console.error('❌ [HEALTH-SETTINGS] Error in PUT:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update health settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { farmId } = body

    if (!farmId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: farmId' },
        { status: 400 }
      )
    }

    // Verify user has permission
    const { data: userRoleResult, error: roleError } = await supabase
      .from('user_roles')
      .select('role_type')
      .eq('user_id', user.id)
      .eq('farm_id', farmId)
      .single()

    // Cast to any to fix type errors
    const userRole = userRoleResult as any

    if (roleError || !userRole) {
      return NextResponse.json(
        { success: false, error: 'Access denied to this farm' },
        { status: 403 }
      )
    }

    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Check if settings already exist
    const existingSettings = await getHealthSettings(farmId)
    
    if (existingSettings && existingSettings.defaultVeterinarianId !== undefined) {
      return NextResponse.json(
        { success: false, error: 'Health settings already exist for this farm. Use PUT to update.' },
        { status: 409 }
      )
    }

    // Create default settings
    const defaultSettings = (await import('@/lib/database/health-settings')).getDefaultHealthSettings()
    const result = await updateHealthSettings(farmId, defaultSettings)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to create health settings' },
        { status: 500 }
      )
    }

    const newSettings = await getHealthSettings(farmId)

    return NextResponse.json({
      success: true,
      settings: newSettings,
      message: 'Health settings created successfully'
    }, { status: 201 })
  } catch (error: any) {
    console.error('❌ [HEALTH-SETTINGS] Error in POST:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create health settings' },
      { status: 500 }
    )
  }
}