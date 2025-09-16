// Enhanced API Routes for Health Records - Edit, Delete, and Follow-up
// src/app/api/health/records/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { deleteHealthRecord, getHealthRecordById } from '@/lib/database/health'

// GET single health record
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
    
    const { id } = await params
    const record = await getHealthRecordById(id, userRole.farm_id)
    
    if (!record) {
      return NextResponse.json({ error: 'Health record not found' }, { status: 404 })
    }
    
    return NextResponse.json({ success: true, record })
    
  } catch (error) {
    console.error('Health record GET API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT/PATCH update health record - Enhanced for auto-generated record completion
export async function PUT(
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
    const { 
      animal_id, 
      record_date, 
      record_type, 
      description, 
      veterinarian, 
      cost, 
      notes,
      next_due_date,
      medication,
      severity,
      // New fields for enhanced health tracking
      symptoms,
      treatment,
      is_auto_generated,
      completion_status,
      follow_up_status,
      treatment_effectiveness,
      is_resolved,
      resolved_date
    } = body
    
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    
    // First verify the record belongs to the user's farm and get current state
    const { data: existingRecord, error: fetchError } = await supabase
      .from('animal_health_records')
      .select('id, farm_id, is_auto_generated, completion_status, animal_id, resolved_date')
      .eq('id', id)
      .single()
    
    if (fetchError || !existingRecord) {
      return NextResponse.json({ error: 'Health record not found' }, { status: 404 })
    }
    
    if (existingRecord.farm_id !== userRole.farm_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    // Determine if this is completing an auto-generated record
    const isCompletingAutoRecord = existingRecord.is_auto_generated && 
                                  (symptoms || veterinarian || medication || treatment)
    
    // Prepare update data
    const updateData: any = {
      animal_id: animal_id || existingRecord.animal_id,
      record_date,
      record_type,
      description,
      veterinarian: veterinarian || null,
      cost: cost || 0,
      notes: notes || null,
      next_due_date: next_due_date || null,
      medication: medication || null,
      severity: severity || null,
      symptoms: symptoms || null,
      treatment: treatment || null
    }
    
    // Handle auto-generated record completion
    if (isCompletingAutoRecord) {
      updateData.is_auto_generated = false
      updateData.completion_status = 'completed'
      
      // Update the corresponding animal's health tracking status
      await supabase
        .from('animals')
        .update({ 
          health_record_completed: true 
        })
        .eq('id', existingRecord.animal_id)
        .eq('farm_id', userRole.farm_id)
    } else {
      // Regular update - preserve existing auto-generation status
      if (completion_status) {
        updateData.completion_status = completion_status
      }
      if (typeof is_auto_generated === 'boolean') {
        updateData.is_auto_generated = is_auto_generated
      }
    }
    
    // Handle follow-up fields
    if (follow_up_status) {
      updateData.follow_up_status = follow_up_status
    }
    if (treatment_effectiveness) {
      updateData.treatment_effectiveness = treatment_effectiveness
    }
    if (typeof is_resolved === 'boolean') {
      updateData.is_resolved = is_resolved
      if (is_resolved && !existingRecord.resolved_date) {
        updateData.resolved_date = resolved_date || new Date().toISOString().split('T')[0]
      } else if (!is_resolved) {
        updateData.resolved_date = null
      }
    }
    
    // Update the record
    const { data, error } = await supabase
      .from('animal_health_records')
      .update(updateData)
      .eq('id', id)
      .eq('farm_id', userRole.farm_id)
      .select(`
        *,
        animals (
          id,
          tag_number,
          name,
          breed
        )
      `)
      .single()
    
    if (error) {
      console.error('Database update error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: true, 
      record: data,
      wasAutoCompleted: isCompletingAutoRecord,
      message: isCompletingAutoRecord 
        ? 'Health record completed successfully' 
        : 'Health record updated successfully'
    })
    
  } catch (error) {
    console.error('Health record PUT API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE health record - Enhanced with cascade handling
export async function DELETE(
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
    const supabase = await createServerSupabaseClient()
    
    // First verify the record belongs to the user's farm and get details
    const { data: existingRecord, error: fetchError } = await supabase
      .from('animal_health_records')
      .select('id, farm_id, animal_id, is_auto_generated')
      .eq('id', id)
      .single()
    
    if (fetchError || !existingRecord) {
      return NextResponse.json({ error: 'Health record not found' }, { status: 404 })
    }
    
    if (existingRecord.farm_id !== userRole.farm_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    // If this is an auto-generated record, update the animal's tracking status
    if (existingRecord.is_auto_generated) {
      await supabase
        .from('animals')
        .update({ 
          health_record_created: false,
          health_record_completed: false,
          auto_health_record_id: null
        })
        .eq('id', existingRecord.animal_id)
        .eq('farm_id', userRole.farm_id)
    }
    
    // Delete any follow-up relationships first
    await supabase
      .from('health_record_follow_ups')
      .delete()
      .or(`original_record_id.eq.${id},follow_up_record_id.eq.${id}`)
    
    // Delete the record
    const { error } = await supabase
      .from('animal_health_records')
      .delete()
      .eq('id', id)
      .eq('farm_id', userRole.farm_id)
    
    if (error) {
      console.error('Database delete error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Health record deleted successfully'
    })
    
  } catch (error) {
    console.error('Health record DELETE API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Enhanced completion method for auto-generated records
export async function PATCH(
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
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    
    console.log('🔍 [API] Health Record PATCH request for ID:', id)
    console.log('🔍 [API] Update data:', body)
    
    // Verify the record belongs to the user's farm
    const { data: existingRecord, error: fetchError } = await supabase
      .from('animal_health_records')
      .select('id, farm_id, is_auto_generated, animal_id')
      .eq('id', id)
      .single()
    
    if (fetchError || !existingRecord) {
      return NextResponse.json({ error: 'Health record not found' }, { status: 404 })
    }
    
    if (existingRecord.farm_id !== userRole.farm_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    // For PATCH, we do partial updates only
    const updateData: any = { ...body }
    
    // If this was an auto-generated record and we're adding substantial content, mark as completed
    if (existingRecord.is_auto_generated && 
        (body.symptoms || body.veterinarian || body.medication || body.treatment)) {
      updateData.is_auto_generated = false
      updateData.completion_status = 'completed'
      
      // Update the animal's health tracking status
      await supabase
        .from('animals')
        .update({ 
          health_record_completed: true 
        })
        .eq('id', existingRecord.animal_id)
        .eq('farm_id', userRole.farm_id)
    }
    
    // Remove undefined/null values for PATCH
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key]
      }
    })
    
    const { data, error } = await supabase
      .from('animal_health_records')
      .update(updateData)
      .eq('id', id)
      .eq('farm_id', userRole.farm_id)
      .select(`
        *,
        animals (
          id,
          tag_number,
          name,
          breed
        )
      `)
      .single()
    
    if (error) {
      console.error('Database update error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    console.log('✅ [API] Health record updated successfully')
    return NextResponse.json({ 
      success: true, 
      record: data,
      message: 'Health record updated successfully'
    })
    
  } catch (error) {
    console.error('Health record PATCH API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}