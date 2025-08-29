// app/api/feed/consumption/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { deleteFeedConsumption, updateFeedConsumption, getFeedConsumptionById } from '@/lib/database/feed'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id)
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'Farm not found' }, { status: 404 })
    }

    // Only farm owners and managers can delete consumption records
    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ 
        error: 'Insufficient permissions to delete consumption records' 
      }, { status: 403 })
    }

    const recordId = params.id
    const result = await deleteFeedConsumption(userRole.farm_id, recordId)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true,
      message: result.message || 'Consumption record deleted successfully' 
    })

  } catch (error) {
    console.error('Error in DELETE /api/feed/consumption/[id]:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id)
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'Farm not found' }, { status: 404 })
    }

    // Only farm owners and managers can edit consumption records
    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ 
        error: 'Insufficient permissions to edit consumption records' 
      }, { status: 403 })
    }

    const body = await request.json()
    const { 
      feedTypeId, 
      quantityKg, 
      animalIds = [], 
      animalCount,
      feedingTime, 
      notes,
      feedingMode,
      batchId
    } = body

    const recordId = params.id
    
    // Validate required fields
    if (!feedTypeId) {
      return NextResponse.json({ error: 'Feed type is required' }, { status: 400 })
    }
    
    if (!quantityKg || quantityKg <= 0) {
      return NextResponse.json({ error: 'Valid quantity is required' }, { status: 400 })
    }
    
    if (!feedingTime) {
      return NextResponse.json({ error: 'Feeding time is required' }, { status: 400 })
    }

    const updateData = {
      feedTypeId,
      quantityKg: parseFloat(quantityKg),
      animalIds: feedingMode === 'individual' ? animalIds : [],
      animalCount: feedingMode === 'batch' ? parseInt(animalCount) : (animalIds?.length || 1),
      feedingTime,
      notes: notes || null,
      feedingMode: feedingMode || 'individual',
      batchId: batchId || null
    }

    const result = await updateFeedConsumption(userRole.farm_id, recordId, updateData)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'Consumption record updated successfully'
    })

  } catch (error) {
    console.error('Error in PUT /api/feed/consumption/[id]:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id)
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'Farm not found' }, { status: 404 })
    }

    const recordId = params.id
    const record = await getFeedConsumptionById(userRole.farm_id, recordId)

    if (!record) {
      return NextResponse.json({ error: 'Consumption record not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: record
    })

  } catch (error) {
    console.error('Error in GET /api/feed/consumption/[id]:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}