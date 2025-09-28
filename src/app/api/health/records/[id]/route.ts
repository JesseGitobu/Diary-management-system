// Enhanced Individual Health Record API Route with comprehensive field support
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

// PUT/PATCH update health record with comprehensive field support
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
      // Basic fields
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
      symptoms,
      treatment,
      is_auto_generated,
      completion_status,
      follow_up_status,
      treatment_effectiveness,
      is_resolved,
      resolved_date,
      
      // General checkup fields
      body_condition_score,
      weight,
      temperature,
      pulse,
      respiration,
      physical_exam_notes,
      
      // Vaccination fields
      vaccine_name,
      vaccine_batch_number,
      vaccine_dose,
      route_of_administration,
      administered_by,
      
      // Treatment fields
      diagnosis,
      medication_name,
      medication_dosage,
      medication_duration,
      treatment_route,
      withdrawal_period,
      response_notes,
      treating_personnel,
      
      // Injury fields
      injury_cause,
      injury_type,
      treatment_given,
      follow_up_required,
      
      // Illness fields
      illness_diagnosis,
      illness_severity,
      lab_test_results,
      treatment_plan,
      recovery_outcome,
      
      // Reproductive health fields
      reproductive_type,
      sire_id,
      pregnancy_result,
      calving_outcome,
      complications,
      
      // Deworming fields
      product_used,
      deworming_dose,
      next_deworming_date,
      deworming_administered_by
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
    
    // Prepare comprehensive update data
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
      treatment: treatment || null,
      
      // General checkup fields
      body_condition_score: body_condition_score || null,
      weight: weight || null,
      temperature: temperature || null,
      pulse: pulse || null,
      respiration: respiration || null,
      physical_exam_notes: physical_exam_notes || null,
      
      // Vaccination fields
      vaccine_name: vaccine_name || null,
      vaccine_batch_number: vaccine_batch_number || null,
      vaccine_dose: vaccine_dose || null,
      route_of_administration: route_of_administration || null,
      administered_by: administered_by || null,
      
      // Treatment fields
      diagnosis: diagnosis || null,
      medication_name: medication_name || null,
      medication_dosage: medication_dosage || null,
      medication_duration: medication_duration || null,
      treatment_route: treatment_route || null,
      withdrawal_period: withdrawal_period || null,
      response_notes: response_notes || null,
      treating_personnel: treating_personnel || null,
      
      // Injury fields
      injury_cause: injury_cause || null,
      injury_type: injury_type || null,
      treatment_given: treatment_given || null,
      follow_up_required: follow_up_required || false,
      
      // Illness fields
      illness_diagnosis: illness_diagnosis || null,
      illness_severity: illness_severity || null,
      lab_test_results: lab_test_results || null,
      treatment_plan: treatment_plan || null,
      recovery_outcome: recovery_outcome || null,
      
      // Reproductive health fields
      reproductive_type: reproductive_type || null,
      sire_id: sire_id || null,
      pregnancy_result: pregnancy_result || null,
      calving_outcome: calving_outcome || null,
      complications: complications || null,
      
      // Deworming fields
      product_used: product_used || null,
      deworming_dose: deworming_dose || null,
      next_deworming_date: next_deworming_date || null,
      deworming_administered_by: deworming_administered_by || null
    }
    
    // Handle auto-generated record completion
    if (isCompletingAutoRecord) {
      updateData.is_auto_generated = false
      updateData.completion_status = 'completed'
      
      // Update the corresponding animal's health tracking status
      await supabase
        .from('animals_requiring_health_attention')
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
    
    // Remove null/undefined values to avoid overwriting existing data
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key]
      }
    })
    
    // Update with comprehensive field support
    const { data, error } = await supabase
      .from('animal_health_records')
      .update(updateData)
      .eq('id', id)
      .eq('farm_id', userRole.farm_id)
      .select(`
        *,
        animals!animal_health_records_animal_id_fkey (
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
        .from('animals_requiring_health_attention')
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
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = await getUserRole(user.id);
    if (!userRole?.farm_id || !['farm_owner', 'farm_manager', 'worker'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    // Handle missing placeholder records
    if (id.startsWith('missing-')) {
      const animalId = id.substring(8);

      const { data: animalData, error: animalError } = await supabase
        .from('animals')
        .select('id')
        .eq('id', animalId)
        .eq('farm_id', userRole.farm_id)
        .single();

      if (animalError || !animalData) {
        return NextResponse.json({ error: 'Associated animal not found on this farm' }, { status: 404 });
      }

      // Prepare comprehensive create data
      const createData = {
        ...body,
        animal_id: animalId,
        farm_id: userRole.farm_id,
        created_by: user.id,
        is_auto_generated: false,
        completion_status: 'completed',
        record_date: body.record_date || new Date().toISOString().split('T')[0],
        record_type: body.record_type || 'checkup',
        
        // Include all the comprehensive fields with null defaults
        body_condition_score: body.body_condition_score || null,
        weight: body.weight || null,
        temperature: body.temperature || null,
        pulse: body.pulse || null,
        respiration: body.respiration || null,
        physical_exam_notes: body.physical_exam_notes || null,
        vaccine_name: body.vaccine_name || null,
        vaccine_batch_number: body.vaccine_batch_number || null,
        vaccine_dose: body.vaccine_dose || null,
        route_of_administration: body.route_of_administration || null,
        administered_by: body.administered_by || null,
        diagnosis: body.diagnosis || null,
        medication_name: body.medication_name || null,
        medication_dosage: body.medication_dosage || null,
        medication_duration: body.medication_duration || null,
        treatment_route: body.treatment_route || null,
        withdrawal_period: body.withdrawal_period || null,
        response_notes: body.response_notes || null,
        treating_personnel: body.treating_personnel || null,
        injury_cause: body.injury_cause || null,
        injury_type: body.injury_type || null,
        treatment_given: body.treatment_given || null,
        follow_up_required: body.follow_up_required || false,
        illness_diagnosis: body.illness_diagnosis || null,
        illness_severity: body.illness_severity || null,
        lab_test_results: body.lab_test_results || null,
        treatment_plan: body.treatment_plan || null,
        recovery_outcome: body.recovery_outcome || null,
        reproductive_type: body.reproductive_type || null,
        sire_id: body.sire_id || null,
        pregnancy_result: body.pregnancy_result || null,
        calving_outcome: body.calving_outcome || null,
        complications: body.complications || null,
        product_used: body.product_used || null,
        deworming_dose: body.deworming_dose || null,
        next_deworming_date: body.next_deworming_date || null,
        deworming_administered_by: body.deworming_administered_by || null
      };

      const { data, error } = await supabase
        .from('animal_health_records')
        .insert(createData)
        .select('*, animals!animal_health_records_animal_id_fkey(id, tag_number, name)')
        .single();
      
      if (error) {
        console.error('Database insert error for missing record:', error);
        return NextResponse.json({ error }, { status: 400 });
      }

      await supabase
        .from('animals_requiring_health_attention')
        .update({ health_record_completed: true, health_record_created: true })
        .eq('id', animalId);

      return NextResponse.json({ 
        success: true, 
        record: data,
        message: 'Health record created and completed successfully'
      });
    }
    
    // Handle existing record updates
    else {
      const { data: existingRecord, error: fetchError } = await supabase
        .from('animal_health_records')
        .select('id, farm_id, is_auto_generated, animal_id, original_health_status, requires_record_type_selection, record_type')
        .eq('id', id)
        .single();
    
      if (fetchError || !existingRecord) {
        return NextResponse.json({ error: 'Health record not found' }, { status: 404 });
      }
    
      if (existingRecord.farm_id !== userRole.farm_id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
      
      const updateData: any = { ...body };
      
      // Handle record type selection for pending records
      if (existingRecord.requires_record_type_selection && body.record_type) {
        updateData.requires_record_type_selection = false;
        updateData.record_type = body.record_type;
      }
      
      // Handle completion of auto-generated records
      if (existingRecord.is_auto_generated && (body.symptoms || body.veterinarian || body.medication)) {
        updateData.is_auto_generated = false;
        updateData.completion_status = 'completed';
        
        await supabase
          .from('animals_requiring_health_attention')
          .update({ health_record_completed: true })
          .eq('id', existingRecord.animal_id);
      }
      
      const { data, error } = await supabase
        .from('animal_health_records')
        .update(updateData)
        .eq('id', id)
        .select('*, animals!animal_health_records_animal_id_fkey(id, tag_number, name)')
        .single();
    
      if (error) {
        console.error('Database update error:', error);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    
      return NextResponse.json({ 
        success: true, 
        record: data,
        message: 'Health record updated successfully'
      });
    }

  } catch (error) {
    console.error('Health record PATCH API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

type HealthStatus = 'requires_attention' | 'quarantined' | 'sick';

function validateRecordTypeChoice(originalHealthStatus: HealthStatus, selectedRecordType: string): boolean {
  const allowedChoices = {
    'requires_attention': ['injury', 'checkup'],
    'quarantined': ['checkup', 'vaccination', 'illness', 'treatment'],
    'sick': ['illness']
  };
  
  return allowedChoices[originalHealthStatus]?.includes(selectedRecordType) || false;
}