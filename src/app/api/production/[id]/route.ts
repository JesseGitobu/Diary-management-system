// src/app/api/production/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { updateProductionRecord, deleteProductionRecord } from '@/lib/database/production'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id) as any
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }
    
    // Check permissions
    if (!['farm_owner', 'farm_manager', 'worker'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    if (!id) {
      return NextResponse.json({ error: 'Record ID is required' }, { status: 400 })
    }

    const body = await request.json()
    
    // Validate required fields
    if (body.milk_volume === undefined || body.milk_volume === null) {
      return NextResponse.json({ error: 'milk_volume is required' }, { status: 400 })
    }
    if (!body.milk_safety_status) {
      return NextResponse.json({ error: 'milk_safety_status is required' }, { status: 400 })
    }

    const validSafetyStatuses = ['safe', 'unsafe_health', 'unsafe_colostrum']
    if (!validSafetyStatuses.includes(body.milk_safety_status)) {
      return NextResponse.json({
        error: `milk_safety_status must be one of: ${validSafetyStatuses.join(', ')}`,
      }, { status: 400 })
    }

    if (body.mastitis_result) {
      const validMastitisResults = ['negative', 'mild', 'severe']
      if (!validMastitisResults.includes(body.mastitis_result)) {
        return NextResponse.json({
          error: `mastitis_result must be one of: ${validMastitisResults.join(', ')}`,
        }, { status: 400 })
      }
    }

    // Verify record belongs to user's farm and fetch all existing data
    const supabase = await createServerSupabaseClient()
    const { data: existingRecord } = await (supabase as any)
      .from('production_records')
      .select('farm_id, record_date, milking_session_id, animal_id')
      .eq('id', id)
      .single()

    if (!existingRecord || existingRecord.farm_id !== userRole.farm_id) {
      return NextResponse.json({ error: 'Record not found or access denied' }, { status: 404 })
    }

    // Resolve or create a proper milking_sessions row if date or session has changed
    let milkingSessionId = body.milking_session_id
    const resolvedSessionName = body.session_name || 'Session'
    
    if (body.record_date || resolvedSessionName) {
      const supabase = await createServerSupabaseClient()
      const dateToUse = body.record_date || existingRecord?.record_date || new Date().toISOString().split('T')[0]
      const dayStart = `${dateToUse}T00:00:00`
      const dayEnd = `${dateToUse}T23:59:59`

      // Look for an existing session row for this farm, name, and date
      const { data: sessions } = await (supabase as any)
        .from('milking_sessions')
        .select('id')
        .eq('farm_id', userRole.farm_id)
        .eq('session_name', resolvedSessionName)
        .gte('session_start', dayStart)
        .lte('session_start', dayEnd)
        .limit(1)

      if (sessions && sessions.length > 0) {
        milkingSessionId = sessions[0].id
      } else {
        // Create a new session if none exists
        const { data: created } = await (supabase as any)
          .from('milking_sessions')
          .insert({
            farm_id: userRole.farm_id,
            session_name: resolvedSessionName,
            session_start: `${dateToUse}T00:00:00`,
            milking_type: 'routine',
            recorded_by: user.id,
          })
          .select('id')
          .single()

        if (created) {
          milkingSessionId = created.id
        }
      }
    }

    // Build update data
    const updateData = {
      record_date: body.record_date || existingRecord?.record_date,
      milking_session_id: milkingSessionId || existingRecord?.milking_session_id,
      milk_volume: Number(body.milk_volume),
      milk_safety_status: body.milk_safety_status,
      temperature: body.temperature ? Number(body.temperature) : null,
      mastitis_test_performed: body.mastitis_test_performed ?? false,
      mastitis_result: body.mastitis_result || null,
      affected_quarters: Array.isArray(body.affected_quarters) ? body.affected_quarters : null,
      fat_content: body.fat_content ? Number(body.fat_content) : null,
      protein_content: body.protein_content ? Number(body.protein_content) : null,
      somatic_cell_count: body.somatic_cell_count ? Number(body.somatic_cell_count) : null,
      lactose_content: body.lactose_content ? Number(body.lactose_content) : null,
      ph_level: body.ph_level ? Number(body.ph_level) : null,
      notes: body.notes || null,
      recording_type: body.recording_type || 'individual',
      milking_group_id: body.milking_group_id || null,
    }

    const result = await updateProductionRecord(id, updateData)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: true,
      data: result.data,
      message: 'Production record updated successfully'
    })
    
  } catch (error) {
    console.error('Production update API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id) as any
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }
    
    // Check permissions
    if (!['farm_owner', 'farm_manager', 'worker'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    if (!id) {
      return NextResponse.json({ error: 'Record ID is required' }, { status: 400 })
    }
    
    const result = await deleteProductionRecord(id)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Production record deleted successfully'
    })
    
  } catch (error) {
    console.error('Production delete API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
