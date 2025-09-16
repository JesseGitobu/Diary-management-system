// Fixed Follow-up API Route for Health Records
// src/app/api/health/records/[id]/follow-up/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getHealthRecordById, createHealthRecord } from '@/lib/database/health'

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
    
    const { id } = await params
    
    // Get the original health record
    const originalRecord = await getHealthRecordById(id, userRole.farm_id)
    
    if (!originalRecord) {
      return NextResponse.json({ error: 'Original health record not found' }, { status: 404 })
    }
    
    const body = await request.json()
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
      resolved
    } = body
    
    // Create follow-up record data
    const followUpData = {
      animal_id: originalRecord.animal_id,
      record_date,
      record_type: 'treatment' as const, // Follow-ups are typically treatments/checkups
      description: `Follow-up: ${description}`,
      veterinarian: veterinarian || null,
      cost: cost || 0,
      notes: `Original Record: ${originalRecord.description}\n\nFollow-up Notes: ${notes || ''}`,
      next_due_date: next_followup_date || null,
      medication: medication_changes || null,
      created_by: user.id,
      farm_id: userRole.farm_id
    }
    
    const result = await createHealthRecord(followUpData)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    // If marked as resolved, update the original record
    if (resolved) {
      const supabase = await createServerSupabaseClient()
      await supabase
        .from('animal_health_records')
        .update({ 
          notes: originalRecord.notes 
            ? `${originalRecord.notes}\n\nResolved on ${record_date}: ${description}`
            : `Resolved on ${record_date}: ${description}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', originalRecord.id)
        .eq('farm_id', userRole.farm_id)
    }
    
    // Store follow-up metadata if you have additional fields
    const followUpRecord = result.data
    if (followUpRecord) {
      const supabase = await createServerSupabaseClient()
      
      // Update the follow-up record with additional metadata
      await supabase
        .from('animal_health_records')
        .update({
          notes: `${followUpRecord.notes}\n\nFollow-up Status: ${status}\nTreatment Effectiveness: ${treatment_effectiveness || 'N/A'}\nResolved: ${resolved ? 'Yes' : 'No'}`
        })
        .eq('id', followUpRecord.id)
    }
    
    return NextResponse.json({ 
      success: true, 
      followUp: result.data,
      message: 'Follow-up record created successfully'
    })
    
  } catch (error) {
    console.error('Follow-up API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}