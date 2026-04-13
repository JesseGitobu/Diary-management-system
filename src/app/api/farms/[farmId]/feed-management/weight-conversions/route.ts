// app/api/settings/feed-management/weight-conversions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { 
  getWeightConversions, 
  createWeightConversion 
} from '@/lib/database/feedManagementSettings'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id) as any
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }
    
    const conversions = await getWeightConversions(userRole.farm_id)
    
    return NextResponse.json({ 
      success: true, 
      data: conversions 
    })
    
  } catch (error) {
    console.error('Weight conversions GET API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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
    
    // Check permissions
    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    const body = await request.json()
    
    // Validate conversion value
    if (!body.conversion_factor || body.conversion_factor <= 0) {
      return NextResponse.json({ error: 'Conversion factor must be greater than 0' }, { status: 400 })
    }
    
    // Check for duplicate conversions
    const existingConversions = await getWeightConversions(userRole.farm_id)
    const duplicateConversion = existingConversions.find(
      conv => conv.from_unit.toLowerCase() === body.from_unit.toLowerCase() && 
              conv.to_unit.toLowerCase() === body.to_unit.toLowerCase()
    )
    
    if (duplicateConversion) {
      return NextResponse.json({ 
        error: 'A conversion between these units already exists' 
      }, { status: 400 })
    }
    
    const result = await createWeightConversion(userRole.farm_id, body, user.id)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: true, 
      data: result.data,
      message: 'Weight conversion created successfully'
    })
    
  } catch (error) {
    console.error('Weight conversions POST API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
