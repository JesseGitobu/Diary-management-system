
// app/api/farms/[farmId]/feed-management/consumption-batches/[id]/animals/[animalId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { removeAnimalFromBatch } from '@/lib/database/feedManagementSettings'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; animalId: string }> }
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
    
    const { id: batchId, animalId } = await params
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(animalId)) {
      return NextResponse.json({ error: 'Invalid animal ID format' }, { status: 400 })
    }
    
    const result = await removeAnimalFromBatch(userRole.farm_id, batchId, animalId)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Animal removed from batch successfully'
    })
    
  } catch (error) {
    console.error('Remove animal from batch API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}