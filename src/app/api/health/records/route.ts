// Enhanced Health Records API Route with comprehensive field support
// src/app/api/health/records/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getAnimalHealthRecords, createHealthRecordWithStatusUpdate, 
  getHealthRecordsWithFollowUps,
  updateAnimalHealthStatus, createHealthRecord } from '@/lib/database/health'

export async function POST(request: NextRequest) {
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
      is_auto_generated = false,
      completion_status = 'pending',
      
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
    
    // Validate required fields
    if (!animal_id || !record_date || !record_type || !description) {
      return NextResponse.json({ 
        error: 'Missing required fields: animal_id, record_date, record_type, description' 
      }, { status: 400 })
    }
    
    // Validate record type
    const validRecordTypes = ['vaccination', 'treatment', 'checkup', 'injury', 'illness', 'reproductive', 'deworming']
    if (!validRecordTypes.includes(record_type)) {
      return NextResponse.json({ 
        error: `Invalid record type. Must be one of: ${validRecordTypes.join(', ')}` 
      }, { status: 400 })
    }
    
    // Prepare comprehensive record data
    const recordData = {
      farm_id: userRole.farm_id,
      animal_id,
      record_date,
      record_type,
      description,
      veterinarian: veterinarian || null,
      cost: cost || 0,
      notes: notes || null,
      next_due_date: next_due_date || null,
      medication: medication || null,
      severity: severity || null,
      created_by: user.id,
      symptoms: symptoms || null,
      treatment: treatment || null,
      is_auto_generated,
      completion_status,
      
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
    
    // Use enhanced function that updates health status
    const result = await createHealthRecordWithStatusUpdate(recordData) as any
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    const response: {
      success: boolean;
      record: any;
      message: string;
      animalHealthStatusUpdated?: boolean;
      newHealthStatus?: string;
      updatedAnimal?: any;
    } = { 
      success: true, 
      record: result.data,
      message: 'Health record created successfully'
    }
    
    // Include animal health status update info if available
    if (result.animalHealthStatusUpdated) {
      response.animalHealthStatusUpdated = true
      response.newHealthStatus = result.newHealthStatus
      response.updatedAnimal = result.updatedAnimal
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Health record POST API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id)
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const includeFollowUps = searchParams.get('includeFollowUps') === 'true'
    const animalId = searchParams.get('animalId') || undefined
    const recordType = searchParams.get('recordType') || undefined
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined

    console.log('Fetching health records with options:', {
      farmId: userRole.farm_id,
      includeFollowUps,
      animalId,
      recordType,
      limit
    })

    let healthRecords

    if (includeFollowUps) {
      // Use the new function that includes follow-ups
      healthRecords = await getHealthRecordsWithFollowUps(userRole.farm_id, {
        animalId,
        recordType,
        limit
      })
    } else {
      // Use the existing function for backwards compatibility
      healthRecords = await getAnimalHealthRecords(userRole.farm_id, {
        animalId,
        recordType,
        limit
      })
    }

    console.log(`Found ${healthRecords.length} health records`)

    return NextResponse.json({ 
      success: true, 
      healthRecords,
      total: healthRecords.length
    })
    
  } catch (error) {
    console.error('Health records API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}