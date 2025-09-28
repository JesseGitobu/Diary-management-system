import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { 
  createFollowUpRecordWithStatusUpdate,
  getFollowUpRecords
} from '@/lib/database/health'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id)
    
    if (!userRole?.farm_id || !['farm_owner', 'farm_manager', 'worker'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    const body = await request.json()
    const { id: originalRecordId } = await params
    
    const {
      record_date,
      status,
      description,
      veterinarian,
      cost,
      notes,
      next_followup_date,
      medication_changes,
      treatment_effectiveness,
      resolved = false
    } = body
    
    // Validate required fields
    if (!record_date || !status || !description) {
      return NextResponse.json({ 
        error: 'Missing required fields: record_date, status, description' 
      }, { status: 400 })
    }
    
    // Use enhanced function that updates health status
    const result = await createFollowUpRecordWithStatusUpdate(
      originalRecordId,
      userRole.farm_id,
      {
        record_date,
        status,
        description,
        veterinarian: veterinarian || null,
        cost: cost || 0,
        notes: notes || null,
        next_followup_date: next_followup_date || null,
        medication_changes: medication_changes || null,
        treatment_effectiveness: treatment_effectiveness || null,
        resolved
      },
      user.id
    )
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    const response: {
      success: boolean;
      followUp: typeof result.data;
      message: string;
      animalHealthStatusUpdated?: boolean;
      newHealthStatus?: string;
      updatedAnimal?: unknown;
    } = { 
      success: true, 
      followUp: result.data,
      message: 'Follow-up record created successfully'
    }
    
    // Include animal health status update info if available
    if ('animalHealthStatusUpdated' in result) {
      response['animalHealthStatusUpdated'] = result.animalHealthStatusUpdated
      response['newHealthStatus'] = result.newHealthStatus
      response['updatedAnimal'] = result.updatedAnimal
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Follow-up POST API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
    
    const { id: originalRecordId } = await params
    
    const followUps = await getFollowUpRecords(originalRecordId, userRole.farm_id)
    
    return NextResponse.json({ 
      success: true, 
      followUps 
    })
    
  } catch (error) {
    console.error('Follow-ups GET API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}