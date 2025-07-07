// src/app/api/breeding/pregnancy-status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { updatePregnancyStatus } from '@/lib/database/breeding'

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
    
    // Only farm owners and managers can update pregnancy status
    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    const body = await request.json()
    const { breeding_record_id, animal_id, farm_id, ...pregnancyData } = body
    
    // Verify user owns the farm
    if (farm_id !== userRole.farm_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Call the updated function with required parameters
    const result = await updatePregnancyStatus(
      breeding_record_id, 
      animal_id, 
      farm_id, 
      pregnancyData
    )
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: true, 
      pregnancy: result.data,
      message: 'Pregnancy status updated successfully'
    })
    
  } catch (error) {
    console.error('Pregnancy status API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}