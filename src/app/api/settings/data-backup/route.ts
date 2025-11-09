import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getDataBackupSettings, updateDataBackupSettings, getBackupHistory } from '@/lib/database/data-backup-settings'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const searchParams = request.nextUrl.searchParams
    const farmId = searchParams.get('farmId')
    const includeHistory = searchParams.get('includeHistory') === 'true'

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let targetFarmId = farmId
    if (!targetFarmId) {
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('farm_id')
        .eq('user_id', user.id)
        .single()
      
      if (!userRole) return NextResponse.json({ error: 'No farm found' }, { status: 400 })
      targetFarmId = userRole.farm_id
    }

    if (!targetFarmId) return NextResponse.json({ error: 'Farm ID is required' }, { status: 400 })
    
    const settings = await getDataBackupSettings(targetFarmId)
    
    let history = null
    if (includeHistory) {
      history = await getBackupHistory(targetFarmId)
    }

    return NextResponse.json({ success: true, settings, history })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { farmId, settings } = body

    // Verify permissions
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role_type')
      .eq('user_id', user.id)
      .eq('farm_id', farmId)
      .single()

    if (!userRole || !['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    await updateDataBackupSettings(farmId, settings)
    const updatedSettings = await getDataBackupSettings(farmId)

    return NextResponse.json({ success: true, settings: updatedSettings })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}