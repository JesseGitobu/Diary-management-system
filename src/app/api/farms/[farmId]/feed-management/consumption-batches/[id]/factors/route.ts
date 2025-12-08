// app/api/farms/[farmId]/feed-management/consumption-batches/[id]/factors/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { 
  getAnimalBatchFactors,
  updateAnimalBatchFactors
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
    const animalId = searchParams.get('animal_id')
    
    // Validate animal ID if provided
    if (animalId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(animalId)) {
        return NextResponse.json({ error: 'Invalid animal ID format' }, { status: 400 })
      }
    }
    
    const factors = await getAnimalBatchFactors(
      userRole.farm_id, 
      batchId, 
      animalId || undefined
    )
    
    return NextResponse.json({ 
      success: true, 
      data: factors 
    })
    
  } catch (error) {
    console.error('Animal batch factors GET API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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
    const { id: batchId } = await params
    
    if (!body.factors || !Array.isArray(body.factors)) {
      return NextResponse.json({ error: 'Factors array is required' }, { status: 400 })
    }
    
    // Validate factors structure
    for (const factor of body.factors) {
      if (!factor.animal_id || !factor.factor_id) {
        return NextResponse.json({ 
          error: 'Each factor must have animal_id and factor_id' 
        }, { status: 400 })
      }
      
      if (factor.factor_value === undefined || factor.factor_value === null) {
        return NextResponse.json({ 
          error: 'Each factor must have a factor_value' 
        }, { status: 400 })
      }
      
      // Validate UUID formats
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(factor.animal_id) || !uuidRegex.test(factor.factor_id)) {
        return NextResponse.json({ error: 'Invalid UUID format in factors' }, { status: 400 })
      }
    }
    
    const result = await updateAnimalBatchFactors(userRole.farm_id, batchId, body.factors)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: true, 
      data: result.data,
      message: 'Animal batch factors updated successfully'
    })
    
  } catch (error) {
    console.error('Animal batch factors PUT API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}