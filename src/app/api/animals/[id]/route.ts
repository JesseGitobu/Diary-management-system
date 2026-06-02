// src/app/api/animals/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, createServerSupabaseClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { updateAnimal, getAnimalById, getAnimalByTagNumber } from '@/lib/database/animals'
import { createHealthRecord } from '@/lib/database/health'
import { differenceInMonths } from 'date-fns'

// GET single animal
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
    
    const { id: animalId } = await params
    
    const animal = await getAnimalById(animalId)
    
    // 🔍 DEBUG: Log birth_weight retrieval from GET endpoint
    console.log('[DEBUG GET /api/animals/[id]] Animal fetched from getAnimalById:', {
      found: !!animal,
      animal_id: animalId,
      tag_number: (animal as any)?.tag_number,
      animal_source: (animal as any)?.animal_source,
      birth_weight: (animal as any)?.birth_weight,
      birth_weight_type: typeof (animal as any)?.birth_weight,
      birth_weight_is_null: (animal as any)?.birth_weight === null,
      birth_weight_is_undefined: (animal as any)?.birth_weight === undefined,
      all_keys: Object.keys(animal as any)
    })
    
    console.log('✅✅✅ [API] Animal fetched:', {
      found: !!animal,
      tag_number: (animal as any)?.tag_number,
      has_current_daily_production: (animal as any)?.current_daily_production !== undefined,
      current_daily_production_value: (animal as any)?.current_daily_production,
      has_latest_calving: (animal as any)?.latest_calving !== undefined,
      has_breeding_events: Array.isArray((animal as any)?.breeding_events),
      breeding_events_count: (animal as any)?.breeding_events?.length || 0,
    })
    
    if (!animal) {
      console.warn('[API] ❌ Animal not found:', { animalId })
      return NextResponse.json({ error: 'Animal not found' }, { status: 404 })
    }
    
    console.log('[API] 🎯 HeatDetectionForm expected fields:', {
      tag_number: (animal as any)?.tag_number,
      name: (animal as any)?.name,
      breed: (animal as any)?.breed,
      production_status: (animal as any)?.production_status,
      current_daily_production: (animal as any)?.current_daily_production,
      birth_weight: (animal as any)?.birth_weight,
      latest_calving: (animal as any)?.latest_calving,
      breeding_events: (animal as any)?.breeding_events,
      breeding_events_count: (animal as any)?.breeding_events?.length || 0,
    })
    
    console.log('[API] ========== FIELD ANALYSIS ==========')
    console.log('[API] birth_weight status:', {
      value: (animal as any)?.birth_weight,
      isNull: (animal as any)?.birth_weight === null,
      isUndefined: (animal as any)?.birth_weight === undefined,
      type: typeof (animal as any)?.birth_weight,
      animal_source: (animal as any)?.animal_source,
    })
    console.log('[API] current_daily_production status:', {
      value: (animal as any)?.current_daily_production,
      isNull: (animal as any)?.current_daily_production === null,
      type: typeof (animal as any)?.current_daily_production,
    })
    console.log('[API] latest_calving status:', {
      value: (animal as any)?.latest_calving,
      isDefined: (animal as any)?.latest_calving !== undefined,
      hasCalvingDate: !!(animal as any)?.latest_calving?.calving_date,
    })
    console.log('[API] breeding_events status:', {
      count: (animal as any)?.breeding_events?.length || 0,
      isEmpty: (animal as any)?.breeding_events?.length === 0,
      types: (animal as any)?.breeding_events?.map((e: any) => e.event_type) || [],
    })
    console.log('[API] ======================================')
    
    console.log('[API] 📋 Full animal object structure:', {
      keys: Object.keys(animal as any),
      object: animal,
    })
    
    const response = { 
      success: true, 
      animal 
    }
    
    // 🔍 DEBUG: Log response being sent to client
    console.log('[DEBUG GET /api/animals/[id]] Response being sent:', {
      status: 'success',
      animal_id: (animal as any)?.id,
      tag_number: (animal as any)?.tag_number,
      animal_source: (animal as any)?.animal_source,
      birth_weight_in_response: (response.animal as any)?.birth_weight,
      birth_weight_type: typeof (response.animal as any)?.birth_weight,
      birth_weight_is_null: (response.animal as any)?.birth_weight === null,
    })
    
    console.log('[API] ✅ Returning response:', {
      status: 'success',
      animalId,
      hasAnimal: !!response.animal,
    })
    
    return NextResponse.json(response)
    
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// UPDATE animal
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
    
    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    const body = await request.json()
    const { id: animalId } = await params
    
    // 🔍 DEBUG: Log request body
    console.log('[DEBUG PUT /api/animals/[id]] Request received:', {
      animal_id: animalId,
      birth_weight_in_body: body.birth_weight,
      birth_weight_type: typeof body.birth_weight,
      animal_source: body.animal_source,
      body_keys: Object.keys(body)
    })
    
    if (!body.tag_number || !body.breed || !body.gender) {
      return NextResponse.json({ 
        error: 'Missing required fields: tag_number, breed, gender' 
      }, { status: 400 })
    }
    
    // Check for duplicate tag number (excluding current animal)
    const existingAnimal = await getAnimalByTagNumber(body.tag_number, userRole.farm_id, animalId)
    if (existingAnimal) {
      return NextResponse.json({ 
        error: 'An animal with this tag number already exists' 
      }, { status: 400 })
    }
    
    // 🆕 GET CURRENT ANIMAL DATA BEFORE UPDATE
    const currentAnimal = await getAnimalById(animalId) as any
    
    // 🔍 DEBUG: Log current animal data
    console.log('[DEBUG PUT /api/animals/[id]] Current animal fetched:', {
      animal_id: animalId,
      tag_number: currentAnimal?.tag_number,
      animal_source: currentAnimal?.animal_source,
      current_birth_weight: currentAnimal?.birth_weight,
      current_birth_weight_type: typeof currentAnimal?.birth_weight,
      has_calf_info: !!currentAnimal?.calf_info
    })
    
    if (!currentAnimal) {
      return NextResponse.json({ error: 'Animal not found' }, { status: 404 })
    }
    
    const oldWeight = currentAnimal.weight
    const newWeight = body.weight
    const oldHealthStatus = currentAnimal.health_status
    const newHealthStatus = body.health_status
    const oldProductionStatus = currentAnimal.production_status
    const newProductionStatus = body.production_status
    
    // Update the animal
    const result = await updateAnimal(animalId, userRole.farm_id, body)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    const supabase = await createServerSupabaseClient()
    
    // ===== CALF_RECORDS HANDLING FOR NEWBORN CALVES =====
    // For newborn calves, save birth_weight to calf_records table instead of animal_weight_records
    if (currentAnimal.animal_source === 'newborn_calf' && body.birth_weight !== undefined) {
      console.log('[DEBUG PUT] Processing calf_records update:', {
        animal_id: animalId,
        birth_weight_to_save: body.birth_weight,
        is_newborn_calf: currentAnimal.animal_source === 'newborn_calf',
        birth_weight_defined: body.birth_weight !== undefined
      })
      
      // Get existing calf record
      const { data: calfRecord, error: calfFetchError } = await (supabase as any)
        .from('calf_records')
        .select('id')
        .eq('animal_id', animalId)
        .eq('farm_id', userRole.farm_id)
        .single()
      
      console.log('[DEBUG PUT] Calf record fetch result:', {
        calfRecord_found: !!calfRecord,
        calfRecord_id: calfRecord?.id,
        calfFetchError: calfFetchError?.message
      })
      
      if (calfRecord) {
        // Update existing calf record with birth_weight
        const { data: updateResult, error: calfUpdateError } = await (supabase as any)
          .from('calf_records')
          .update({
            birth_weight: body.birth_weight || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', calfRecord.id)
          .select()
        
        console.log('[DEBUG PUT] Calf record update result:', {
          calf_record_id: calfRecord.id,
          birth_weight_saved: body.birth_weight,
          update_success: !calfUpdateError,
          update_error: calfUpdateError?.message,
          updated_record: updateResult
        })
        
        if (calfUpdateError) {
          console.warn('[API] Warning: Failed to update birth_weight in calf_records:', calfUpdateError)
        } else {
          console.log('[API] ✅ Birth weight updated in calf_records for animal:', animalId)
        }

        // Also save birth weight to animal_weight_records table
        if (body.birth_weight) {
          // Check if weight record already exists for this birth date
          const birthDate = currentAnimal.birth_date || new Date().toISOString().split('T')[0]
          const { data: existingWeightRecord } = await (supabase as any)
            .from('animal_weight_records')
            .select('id')
            .eq('animal_id', animalId)
            .eq('farm_id', userRole.farm_id)
            .eq('weight_date', birthDate)
            .eq('measurement_purpose', 'Birth Weight Measurement')
            .single()

          if (existingWeightRecord) {
            // Update existing weight record
            const { error: weightUpdateError } = await (supabase as any)
              .from('animal_weight_records')
              .update({
                weight_kg: body.birth_weight,
                method: 'scale',
                updated_at: new Date().toISOString()
              })
              .eq('id', existingWeightRecord.id)
            
            if (weightUpdateError) {
              console.warn('[API] Warning: Failed to update weight record:', weightUpdateError)
            } else {
              console.log('[API] ✅ Birth weight record updated in animal_weight_records')
            }
          } else {
            // Create new weight record
            const { error: weightInsertError } = await (supabase as any)
              .from('animal_weight_records')
              .insert({
                farm_id: userRole.farm_id,
                animal_id: animalId,
                weight_date: birthDate,
                weight_kg: body.birth_weight,
                weight_unit: 'kg',
                measurement_purpose: 'Birth Weight Measurement',
                measured_by: null,
                method: 'scale',
                notes: 'Birth weight recorded'
              })
            
            if (weightInsertError) {
              console.warn('[API] Warning: Failed to create birth weight record:', weightInsertError)
            } else {
              console.log('[API] ✅ Birth weight record created in animal_weight_records')
            }
          }
        }
      }
    }
    
    // ===== WEIGHT HANDLING (animal_weight_records, animals_requiring_weight_update) =====
    // Note: For newborn calves, birth_weight is stored in calf_records, not animal_weight_records
    if (newWeight !== undefined && newWeight !== null && newWeight !== oldWeight && currentAnimal.animal_source !== 'newborn_calf') {
      // Create weight record
      const { data: weightRecord, error: weightError } = await (supabase as any)
        .from('animal_weight_records')
        .insert({
          animal_id: animalId,
          farm_id: userRole.farm_id,
          weight_kg: newWeight,
          measurement_date: new Date().toISOString().split('T')[0],
          measurement_type: 'routine',
          notes: 'Weight updated via edit form',
          is_required: true,
          recorded_by: user.id
        })
        .select()
        .single()
      
      if (weightError) {
        // Error creating weight record
      } else {
        // Resolve any pending weight requirements
        const { data: resolvedReqs, error: resolveError } = await (supabase as any)
          .from('animals_requiring_weight_update')
          .update({
            is_resolved: true,
            resolved_at: new Date().toISOString(),
            weight_record_id: weightRecord.id
          })
          .eq('animal_id', animalId)
          .eq('farm_id', userRole.farm_id)
          .eq('is_resolved', false)
          .select()
        
        if (resolveError) {
          // Error resolving weight requirements
        } else {
          // Weight requirements resolved
        }
      }
    }
    
    // ===== HEALTH RECORD HANDLING (health_records, animals_requiring_health_attention) =====
    const concerningStatuses = ['sick', 'requires_attention', 'quarantined']
    const wasHealthy = !concerningStatuses.includes(oldHealthStatus)
    const isNowConcerning = concerningStatuses.includes(newHealthStatus)
    
    if (oldHealthStatus !== newHealthStatus && isNowConcerning) {
      // Create health record for the status change
      const healthRecordData = {
        animal_id: animalId,
        farm_id: userRole.farm_id,
        record_date: new Date().toISOString().split('T')[0],
        record_type: getRecordTypeFromHealthStatus(newHealthStatus),
        description: `Health status updated to: ${newHealthStatus}`,
        severity: getSeverityFromHealthStatus(newHealthStatus) as 'low' | 'medium' | 'high',
        notes: `Status changed from ${oldHealthStatus} to ${newHealthStatus} via animal edit`,
        created_by: user.id,
        is_auto_generated: true,
        completion_status: 'pending'
      }
      
      const healthResult = await createHealthRecord(healthRecordData)
      
      if (healthResult.success) {
        // Track in animals_requiring_health_attention
        await (supabase as any)
          .from('animals_requiring_health_attention')
          .insert({
            animal_id: animalId,
            farm_id: userRole.farm_id,
            health_status: newHealthStatus,
            health_record_id: (healthResult.data as any)?.id,
            health_record_created: true,
            created_by: user.id
          })
      } else {
        // Error creating health record
      }
    }
    
    // ===== BREEDING RECORDS HANDLING (service_records, animal_categories) =====
    if (body.gender === 'female' && currentAnimal.birth_date) {
      const ageInMonths = differenceInMonths(new Date(), new Date(currentAnimal.birth_date))
      
      // Get breeding settings
      const { data: breedingSettingsResult } = await (supabase as any)
        .from('farm_breeding_settings')
        .select('*')
        .eq('farm_id', userRole.farm_id)
        .single()
      
      const breedingSettings = breedingSettingsResult as any
      const minBreedingAge = breedingSettings?.minimum_breeding_age_months || 15
      const isBreedingAge = ageInMonths >= minBreedingAge
      
      // Check if production status indicates breeding activity
      const hasBreedingData = (
        body.service_date ||
        body.expected_calving_date ||
        (body.lactation_number && body.lactation_number > 0) ||
        newProductionStatus === 'served' ||
        newProductionStatus === 'lactating' ||
        newProductionStatus === 'dry'
      )
      
      if (isBreedingAge && hasBreedingData) {
        // Check if breeding record already exists
        const { data: existingRecord } = await (supabase as any)
          .from('service_records')
          .select('id')
          .eq('animal_id', animalId)
          .single()
        
        if (!existingRecord) {
          // Determine breeding type based on production status
          let breedingType = 'natural'
          if (body.service_method === 'artificial_insemination') {
            breedingType = 'artificial_insemination'
          } else if (body.service_method === 'embryo_transfer') {
            breedingType = 'embryo_transfer'
          }
          
          const breedingRecordData: any = {
            animal_id: animalId,
            farm_id: userRole.farm_id,
            breeding_type: breedingType,
            breeding_date: body.service_date || new Date().toISOString().split('T')[0],
            auto_generated: true,
            notes: 'Breeding record auto-generated from animal update'
          }
          
          // Add optional breeding-related fields if provided
          if (body.technician_name) breedingRecordData.technician_name = body.technician_name
          if (body.sire_name) breedingRecordData.sire_name = body.sire_name
          if (body.sire_breed) breedingRecordData.sire_breed = body.sire_breed
          if (body.sire_registration_number) breedingRecordData.sire_registration_number = body.sire_registration_number
          
          const { error: breedingError } = await (supabase as any)
            .from('service_records')
            .insert(breedingRecordData)
          
          if (breedingError) {
            // Error creating breeding record
          } else {
            // Breeding record created successfully
          }
        } else {
          // Breeding record already exists
        }
      }
    }
    
    // 🔍 DEBUG: Log response data
    console.log('[DEBUG PUT /api/animals/[id]] Response being sent:', {
      animal_id: result.data?.id,
      birth_weight_in_response: result.data?.birth_weight,
      animal_source: result.data?.animal_source,
      all_animal_keys: result.data ? Object.keys(result.data) : []
    })
    
    return NextResponse.json({ 
      success: true, 
      animal: result.data,
      message: 'Animal updated successfully'
    })
    
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ===== HELPER FUNCTIONS =====
function getRecordTypeFromHealthStatus(healthStatus: string): 'vaccination' | 'treatment' | 'checkup' | 'injury' | 'illness' | 'reproductive' | 'deworming' {
  const mapping: Record<string, 'vaccination' | 'treatment' | 'checkup' | 'injury' | 'illness' | 'reproductive' | 'deworming'> = {
    'sick': 'illness',
    'requires_attention': 'treatment',
    'quarantined': 'treatment'
  }
  return mapping[healthStatus] || 'checkup'
}

function getSeverityFromHealthStatus(healthStatus: string): string {
  const mapping: Record<string, string> = {
    'sick': 'high',
    'requires_attention': 'medium',
    'quarantined': 'high'
  }
  return mapping[healthStatus] || 'low'
}

// DELETE animal (soft delete - sets status to inactive)
export async function DELETE(
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
    
    // Only farm owners can delete animals
    if (userRole.role_type !== 'farm_owner') {
      return NextResponse.json({ error: 'Only farm owners can delete animals' }, { status: 403 })
    }
    
    const { id: animalId } = await params
    
    const result = await updateAnimal(animalId, userRole.farm_id, { 
      status: 'inactive',
      updated_at: new Date().toISOString()
    })
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Animal deleted successfully'
    })
    
  } catch (error) {
    console.error('Delete animal API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}