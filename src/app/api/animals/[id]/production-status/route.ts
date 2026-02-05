// src/app/api/animals/[id]/production-status/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, createServerSupabaseClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { updateAnimal, getAnimalById } from '@/lib/database/animals'

// UPDATE production status specifically
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id) as any
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }
    
    if (!['farm_owner', 'farm_manager', 'worker'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    const body = await request.json()
    const { id: animalId } = await params
    const { production_status, dry_off_date } = body
    
    // Validate production status
    const validStatuses = ['calf', 'heifer', 'served', 'lactating', 'dry', 'bull']
    if (!production_status || !validStatuses.includes(production_status)) {
      return NextResponse.json({ 
        error: `Invalid production status. Must be one of: ${validStatuses.join(', ')}`
      }, { status: 400 })
    }
    
    // Get current animal data
    const currentAnimal = await getAnimalById(animalId) as any
    
    if (!currentAnimal) {
      return NextResponse.json({ error: 'Animal not found' }, { status: 404 })
    }
    
    const oldProductionStatus = currentAnimal.production_status
    
    // Validate status transition
    if (oldProductionStatus === 'dry' && production_status === 'dry') {
      return NextResponse.json({ 
        error: 'Animal is already in dry period'
      }, { status: 400 })
    }
    
    if (oldProductionStatus !== 'lactating' && production_status === 'dry') {
      return NextResponse.json({ 
        error: `Cannot start dry off for non-lactating animal (current status: ${oldProductionStatus})`
      }, { status: 400 })
    }
    
    console.log('📊 [API] Production status update:', {
      animalId,
      oldStatus: oldProductionStatus,
      newStatus: production_status,
      dryOffDate: dry_off_date,
      timestamp: new Date().toISOString()
    })
    
    // Update animal production status
    const updateData: any = {
      production_status
    }
    
    // Add dry-off specific data if transitioning to dry
    if (production_status === 'dry') {
      updateData.dry_off_date = dry_off_date || new Date().toISOString().split('T')[0]
      updateData.last_milking_date = new Date().toISOString().split('T')[0]
      updateData.days_in_milk = null  // ✅ Clear days_in_milk when entering dry period
      updateData.current_daily_production = 0  // ✅ Clear production when dry
      updateData.service_date = null  // ✅ Clear service date after drying off
    }
    
    const result = await updateAnimal(animalId, userRole.farm_id, updateData)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    const supabase = await createServerSupabaseClient()
    
    // Create a dry-off record if applicable (optional - table may not exist)
    if (production_status === 'dry' && oldProductionStatus === 'lactating') {
      console.log('✅ [API] Recording dry-off event...')
      
      try {
        const { error: dryOffError } = await (supabase as any)
          .from('production_dry_off_records')
          .insert({
            animal_id: animalId,
            farm_id: userRole.farm_id,
            dry_off_date: dry_off_date || new Date().toISOString().split('T')[0],
            last_milking_date: new Date().toISOString().split('T')[0],
            recorded_by: user.id,
            notes: 'Dry off initiated from production tab'
          })
          .select()
          .single()
        
        if (dryOffError) {
          console.warn('⚠️ [API] Dry-off record creation skipped (table may not exist):', dryOffError.message)
        } else {
          console.log('✅ [API] Dry-off record created successfully')
        }
      } catch (error) {
        console.warn('⚠️ [API] Error creating dry-off record:', error)
        // Don't fail the whole request, just log the warning
      }
    }
    
    // Log this status change in animal_status_changes or similar table if you have one
    try {
      await (supabase as any)
        .from('animal_status_changes')
        .insert({
          animal_id: animalId,
          farm_id: userRole.farm_id,
          old_status: oldProductionStatus,
          new_status: production_status,
          change_type: 'production_status',
          change_date: new Date().toISOString(),
          changed_by: user.id,
          reason: `Production status updated from ${oldProductionStatus} to ${production_status}`
        })
    } catch (logError) {
      console.warn('⚠️ [API] Failed to log status change (table may not exist):', logError)
      // Non-critical, don't fail the request
    }
    
    return NextResponse.json({ 
      success: true, 
      animal: result.data,
      message: `Production status updated to ${production_status}`,
      previousStatus: oldProductionStatus
    })
    
  } catch (error) {
    console.error('❌ [API] Production status update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
