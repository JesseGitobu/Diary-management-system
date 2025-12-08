// app/api/farms/[farmId]/feed-management/consumption-batches/[id]/animals/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { 
  getBatchTargetedAnimals,
  addAnimalToBatch,
  getAvailableAnimalsForBatch
} from '@/lib/database/feedManagementSettings'

export async function GET(
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
    
    const { id: batchId } = await params
    const { searchParams } = new URL(request.url)
    const includeAvailable = searchParams.get('include_available') === 'true'
    
    // Get targeted animals
    const targetedAnimals = await getBatchTargetedAnimals(userRole.farm_id, batchId)

    let availableAnimals: any[] = []
    if (includeAvailable) {
      availableAnimals = await getAvailableAnimalsForBatch(userRole.farm_id, batchId)
    }
    
    return NextResponse.json({ 
      success: true, 
      data: {
        targeted: targetedAnimals,
        available: availableAnimals
      }
    })
    
  } catch (error) {
    console.error('Batch animals GET API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
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
    const { id: batchId } = await params
    
    if (!body.animal_id) {
      return NextResponse.json({ error: 'Animal ID is required' }, { status: 400 })
    }
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(body.animal_id)) {
      return NextResponse.json({ error: 'Invalid animal ID format' }, { status: 400 })
    }
    
    const result = await addAnimalToBatch(userRole.farm_id, batchId, body.animal_id)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: true, 
      data: result.data,
      message: 'Animal added to batch successfully'
    })
    
  } catch (error) {
    console.error('Add animal to batch API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}