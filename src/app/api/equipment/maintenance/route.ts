import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { addEquipmentMaintenance } from '@/lib/database/equipment'

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
    
    // Verify the equipment belongs to the user's farm
    const { createServerSupabaseClient } = await import('@/lib/supabase/server')
    const supabase = await createServerSupabaseClient()
    
    const { data: equipmentResult, error: equipmentError } = await supabase
      .from('equipment')
      .select('farm_id')
      .eq('id', body.equipment_id)
      .single()
    
    // Cast to any to fix "Property 'farm_id' does not exist on type 'never'"
    const equipment = equipmentResult as any

    if (equipmentError || !equipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 })
    }
    
    if (equipment.farm_id !== userRole.farm_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const result = await addEquipmentMaintenance(body)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: true, 
      maintenance: result.data,
      message: 'Maintenance scheduled successfully'
    })
    
  } catch (error) {
    console.error('Equipment maintenance API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}