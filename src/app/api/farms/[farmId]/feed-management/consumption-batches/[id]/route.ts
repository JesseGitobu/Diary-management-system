// app/api/settings/feed-management/consumption-batches/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { 
  updateConsumptionBatch, 
  deleteConsumptionBatch 
} from '@/lib/database/feedManagementSettings'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id)
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }
    
    // Check permissions
    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    const body = await request.json()
    const { id: batchId } = await params
    
    // Validate fields if provided
    if (body.batch_name !== undefined && (!body.batch_name || !body.batch_name.trim())) {
      return NextResponse.json({ error: 'Batch name cannot be empty' }, { status: 400 })
    }
    
    if (body.feeding_frequency_per_day !== undefined && 
        (body.feeding_frequency_per_day < 1 || body.feeding_frequency_per_day > 6)) {
      return NextResponse.json({ 
        error: 'Feeding frequency must be between 1 and 6 times per day' 
      }, { status: 400 })
    }
    
    if (body.default_quantity_kg !== undefined && body.default_quantity_kg < 0) {
      return NextResponse.json({ error: 'Default quantity cannot be negative' }, { status: 400 })
    }
    
    const result = await updateConsumptionBatch(batchId, userRole.farm_id, body)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: true, 
      data: result.data,
      message: 'Consumption batch updated successfully'
    })
    
  } catch (error) {
    console.error('Consumption batch PUT API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id)
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }
    
    // Check permissions
    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    const { id: batchId } = await params
    
    const result = await deleteConsumptionBatch(batchId, userRole.farm_id)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Consumption batch deleted successfully'
    })
    
  } catch (error) {
    console.error('Consumption batch DELETE API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}