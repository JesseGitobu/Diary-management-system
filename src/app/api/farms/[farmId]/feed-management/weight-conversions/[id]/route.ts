
// app/api/settings/feed-management/weight-conversions/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { 
  getWeightConversions,
  updateWeightConversion, 
  deleteWeightConversion 
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
    
    const userRole = await getUserRole(user.id) as any
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }
    
    // Check permissions
    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    const body = await request.json()
    const { id: conversionId } = await params
    
    // Validate conversion value
    if (body.conversion_factor !== undefined && body.conversion_factor <= 0) {
      return NextResponse.json({ error: 'Conversion factor must be greater than 0' }, { status: 400 })
    }
    
    // Check for duplicate conversions (excluding current conversion)
    if (body.from_unit && body.to_unit) {
      const existingConversions = await getWeightConversions(userRole.farm_id)
      const duplicateConversion = existingConversions.find(
        conv => conv.id !== conversionId && 
                conv.from_unit.toLowerCase() === body.from_unit.toLowerCase() && 
                conv.to_unit.toLowerCase() === body.to_unit.toLowerCase()
      )
      
      if (duplicateConversion) {
        return NextResponse.json({ 
          error: 'A conversion between these units already exists' 
        }, { status: 400 })
      }
    }
    
    const result = await updateWeightConversion(conversionId, userRole.farm_id, body)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: true, 
      data: result.data,
      message: 'Weight conversion updated successfully'
    })
    
  } catch (error) {
    console.error('Weight conversion PUT API error:', error)
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
    
    const userRole = await getUserRole(user.id) as any
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }
    
    // Check permissions
    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    const { id: conversionId } = await params
    
    const result = await deleteWeightConversion(conversionId, userRole.farm_id)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Weight conversion deleted successfully'
    })
    
  } catch (error) {
    console.error('Weight conversion DELETE API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}