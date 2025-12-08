// app/api/settings/distribution/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getDistributionSettings, updateDistributionSettings } from '@/lib/database/distribution-settings'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const searchParams = request.nextUrl.searchParams
    const farmId = searchParams.get('farmId')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

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

    // Cast supabase to any to prevent type errors on query
    // Ensure targetFarmId is treated as string since we validated it exists or fetched it
    const { data: userRoleResult, error: roleError } = await (supabase as any)
      .from('user_roles')
      .select('role_type')
      .eq('user_id', user.id)
      .eq('farm_id', targetFarmId!)
      .single()

    // Cast to any here as well
    const userRole = userRoleResult as any

    if (roleError || !userRole) {
      return NextResponse.json(
        { success: false, error: 'Access denied to this farm' },
        { status: 403 }
      )
    }

    const settings = await getDistributionSettings(targetFarmId!)

    if (!settings) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch distribution settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      settings
    })
  } catch (error: any) {
    console.error('❌ [DISTRIBUTION-SETTINGS] Error in GET:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch distribution settings' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
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
        { success: false, error: 'Insufficient permissions to update distribution settings' },
        { status: 403 }
      )
    }

    console.log('🔄 [DISTRIBUTION-SETTINGS] Updating settings for farm:', farmId)

    const result = await updateDistributionSettings(farmId, settings)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to update distribution settings' },
        { status: 500 }
      )
    }

    const updatedSettings = await getDistributionSettings(farmId)

    console.log('✅ [DISTRIBUTION-SETTINGS] Settings updated successfully')

    return NextResponse.json({
      success: true,
      settings: updatedSettings,
      message: 'Distribution settings updated successfully'
    })
  } catch (error: any) {
    console.error('❌ [DISTRIBUTION-SETTINGS] Error in PUT:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update distribution settings' },
      { status: 500 }
    )
  }
}