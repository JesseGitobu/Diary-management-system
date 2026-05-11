import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createEquipment, getEquipment } from '@/lib/database/equipment'

/**
 * GET /api/equipment
 * Get list of equipment for the current farm
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      console.log('❌ No authenticated user')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id)
    
    if (!userRole?.farm_id) {
      console.log('❌ User has no farm associated')
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }

    console.log('🔍 [API] Fetching equipment for farm:', userRole.farm_id)
    
    const equipment = await getEquipment(userRole.farm_id)
    
    console.log('✅ [API] Equipment retrieved:', { count: equipment.length })
    return NextResponse.json(equipment)
  } catch (error) {
    console.error('❌ [API] Error fetching equipment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Equipment API POST called')
    
    const user = await getCurrentUser()
    console.log('Current user:', user?.id ? `✓ ${user.id}` : '✗ No user')
    
    if (!user) {
      console.log('❌ No authenticated user')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id) as any
    console.log('User role:', userRole?.role_type, 'Farm ID:', userRole?.farm_id)
    
    if (!userRole?.farm_id) {
      console.log('❌ User has no farm associated')
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }
    
    // Only farm owners and managers can add equipment
    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      console.log('❌ Insufficient permissions. User role:', userRole.role_type)
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    console.log('✓ Authorization passed')
    
    const body = await request.json()
    console.log('Request body received:', body)
    
    const result = await createEquipment(userRole.farm_id, body)
    console.log('Create equipment result:', result)
    
    if (!result.success) {
      console.log('❌ Equipment creation failed:', result.error)
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    console.log('✓ Equipment created successfully:', result.data?.id)
    return NextResponse.json({ 
      success: true, 
      equipment: result.data,
      message: 'Equipment added successfully'
    })
    
  } catch (error) {
    console.error('❌ Equipment API error:', error)
    console.error('Error details:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}