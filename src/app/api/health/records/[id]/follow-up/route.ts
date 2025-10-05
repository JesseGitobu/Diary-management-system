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
    
    if (!record_date || !status || !description) {
      return NextResponse.json({ 
        error: 'Missing required fields: record_date, status, description' 
      }, { status: 400 })
    }
    
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
    
    if (!result.success || !('data' in result) || !result.data) {
      return NextResponse.json({ error: result.error || 'No data returned' }, { status: 400 })
    }
    
    const followUpData = {
      id: result.data.id,
      record_date: result.data.record_date,
      description: result.data.description,
      veterinarian: result.data.veterinarian,
      cost: result.data.cost,
      notes: result.data.notes,
      medication: result.data.medication,
      follow_up_status: result.data.follow_up_status,
      treatment_effectiveness: result.data.treatment_effectiveness,
      is_resolved: result.data.is_resolved,
      created_at: result.data.created_at,
      next_followup_date: result.data.next_due_date,
      original_record_id: originalRecordId
    }
    
    const response: {
      success: boolean;
      followUp: typeof followUpData;
      message: string;
      animalHealthStatusUpdated?: boolean;
      newHealthStatus?: string;
      updatedAnimal?: unknown;
      cascadedResolution?: boolean; // NEW
      resolvedRecords?: string[]; // NEW
    } = { 
      success: true, 
      followUp: followUpData,
      message: 'Follow-up record created successfully'
    }
    
    if ('animalHealthStatusUpdated' in result) {
      response.animalHealthStatusUpdated = result.animalHealthStatusUpdated
      response.newHealthStatus = result.newHealthStatus
      response.updatedAnimal = result.updatedAnimal
    }
    
    // NEW: Include cascade information
    if (resolved && 'cascadedResolution' in result) {
      response.cascadedResolution = true
      response.resolvedRecords = result.resolvedRecords
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Follow-up POST API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// In your GET handler
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
    
    // KEY: Return as 'followUps' to match what the component expects
    return NextResponse.json({ 
      success: true, 
      followUps // This matches what HealthRecordCard expects
    })
    
  } catch (error) {
    console.error('Follow-ups GET API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}