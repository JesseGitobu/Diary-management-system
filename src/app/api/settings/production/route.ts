// app/api/settings/production/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getProductionSettings, updateProductionSettings } from '@/lib/database/production-settings'

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
      const { data: userRole, error: roleError } = await supabase
        .from('user_roles')
        .select('farm_id')
        .eq('user_id', user.id)
        .single()

      if (roleError || !userRole?.farm_id) {
        return NextResponse.json(
          { success: false, error: 'No farm associated with user' },
          { status: 400 }
        )
      }

      targetFarmId = userRole.farm_id
    }

    // Verify user has access
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role_type')
      .eq('user_id', user.id)
      .eq('farm_id', targetFarmId)
      .single()

    if (roleError || !userRole) {
      return NextResponse.json(
        { success: false, error: 'Access denied to this farm' },
        { status: 403 }
      )
    }

    const settings = await getProductionSettings(targetFarmId)

    if (!settings) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch production settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      settings
    })
  } catch (error: any) {
    console.error('❌ [PRODUCTION-SETTINGS] Error in GET:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch production settings' },
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

    // Verify permissions
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role_type')
      .eq('user_id', user.id)
      .eq('farm_id', farmId)
      .single()

    if (roleError || !userRole) {
      return NextResponse.json(
        { success: false, error: 'Access denied to this farm' },
        { status: 403 }
      )
    }

    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to update production settings' },
        { status: 403 }
      )
    }

    console.log('🔄 [PRODUCTION-SETTINGS] Updating settings for farm:', farmId)

    const result = await updateProductionSettings(farmId, settings)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to update production settings' },
        { status: 500 }
      )
    }

    const updatedSettings = await getProductionSettings(farmId)

    console.log('✅ [PRODUCTION-SETTINGS] Settings updated successfully')

    return NextResponse.json({
      success: true,
      settings: updatedSettings,
      message: 'Production settings updated successfully'
    })
  } catch (error: any) {
    console.error('❌ [PRODUCTION-SETTINGS] Error in PUT:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update production settings' },
      { status: 500 }
    )
  }
}