import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createMaintenanceRecord, getMaintenanceRecordsByFarmId } from '@/lib/database/equipment'
import { createServerSupabaseClient } from '@/lib/supabase/server'

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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || undefined
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    console.log('📋 [API] Fetching maintenance records for farm:', userRole.farm_id)
    console.log('Params - Status:', status, 'Limit:', limit, 'Offset:', offset)

    const result = await getMaintenanceRecordsByFarmId(
      userRole.farm_id,
      status,
      limit,
      offset
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    // Transform data to include equipment name at top level
    const transformedData = (result.data || []).map((record: any) => ({
      ...record,
      equipmentName: record.equipment?.name || 'Unknown Equipment',
      asset_id: record.equipment?.asset_id || record.asset_id,
      equipment_id: record.equipment_id, // Keep original field
    }))

    console.log('✅ [API] Maintenance records fetched:', transformedData.length || 0)

    return NextResponse.json({
      success: true,
      data: transformedData,
      count: result.count,
      limit,
      offset,
    })
  } catch (error) {
    console.error('❌ [API] Unexpected error fetching maintenance records:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id) as any
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }
    
    // Only farm owners and managers can schedule maintenance
    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    const body = await request.json()
    
    console.log('📋 Maintenance API - Body:', body)
    
    // Verify the equipment belongs to the user's farm
    const supabase = await createServerSupabaseClient()
    
    const { data: equipmentResult, error: equipmentError } = await supabase
      .from('equipment')
      .select('farm_id')
      .eq('id', body.equipment_id)
      .single()
    
    const equipment = equipmentResult as any

    if (equipmentError || !equipment) {
      console.log('❌ Equipment not found:', body.equipment_id)
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 })
    }
    
    if (equipment.farm_id !== userRole.farm_id) {
      console.log('❌ Equipment not in user farm')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Get worker ID for the user (to pass as created_by)
    const { data: workerData, error: workerError } = await supabase
      .from('workers')
      .select('id')
      .eq('farm_id', userRole.farm_id)
      .limit(1)
      .single()
    
    // If no worker record, we still proceed but created_by will be from worker table matching the user
    // For now, we'll get or create a worker reference
    let workerId = (workerData as any)?.id
    
    if (!workerId) {
      console.log('⚠️ No worker record found for user, creating one')
      // Create a minimal worker record
      const { data: newWorker, error: workerCreateError } = await supabase
        .from('workers')
        .insert({
          farm_id: userRole.farm_id,
          name: user.email || 'System User',
          worker_number: `SYS-${user.id.substring(0, 8)}`,
          position: userRole.role_type === 'farm_owner' ? 'Farm Owner' : 'Farm Manager',
          employment_status: 'full_time',
        })
        .select('id')
        .single()
      
      if (workerCreateError) {
        console.log('⚠️ Could not create worker record:', workerCreateError.message)
        // We'll just use null and let the constraint fail gracefully
      } else {
        workerId = (newWorker as any)?.id
      }
    }

    if (!workerId) {
      return NextResponse.json({ error: 'Could not identify user worker record' }, { status: 400 })
    }
    
    console.log('✓ Worker ID:', workerId)
    
    // Call the new maintenance function
    const result = await createMaintenanceRecord(userRole.farm_id, workerId, body)
    
    if (!result.success) {
      console.log('❌ Maintenance creation failed:', result.error)
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    console.log('✓ Maintenance record created successfully')
    return NextResponse.json({ 
      success: true, 
      data: result.data,
      message: 'Maintenance scheduled successfully'
    })
    
  } catch (error) {
    console.error('Equipment maintenance API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}