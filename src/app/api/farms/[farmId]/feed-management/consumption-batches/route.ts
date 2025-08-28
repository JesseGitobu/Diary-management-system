// app/api/farms/[farmId]/feed-management/consumption-batches/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { 
  getConsumptionBatches, 
  createConsumptionBatch 
} from '@/lib/database/feedManagementSettings'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id)
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }
    
    const batches = await getConsumptionBatches(userRole.farm_id)
    
    return NextResponse.json({ 
      success: true, 
      data: batches 
    })
    
  } catch (error) {
    console.error('Consumption batches GET API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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
    
    // Validate required fields
    if (!body.batch_name || !body.batch_name.trim()) {
      return NextResponse.json({ error: 'Batch name is required' }, { status: 400 })
    }
    
    // Validate feeding frequency
    if (body.feeding_frequency_per_day && (body.feeding_frequency_per_day < 1 || body.feeding_frequency_per_day > 6)) {
      return NextResponse.json({ 
        error: 'Feeding frequency must be between 1 and 6 times per day' 
      }, { status: 400 })
    }
    
    // Validate quantity
    if (body.default_quantity_kg && body.default_quantity_kg < 0) {
      return NextResponse.json({ error: 'Default quantity cannot be negative' }, { status: 400 })
    }
    
    const result = await createConsumptionBatch(userRole.farm_id, body)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: true, 
      data: result.data,
      message: 'Consumption batch created successfully'
    })
    
  } catch (error) {
    console.error('Consumption batches POST API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}