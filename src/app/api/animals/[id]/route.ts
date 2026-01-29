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
    
    if (!animal) {
      return NextResponse.json({ error: 'Animal not found' }, { status: 404 })
    }
    
    return NextResponse.json({ 
      success: true, 
      animal 
    })
    
  } catch (error) {
    console.error('Get animal API error:', error)
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
    
    if (!currentAnimal) {
      return NextResponse.json({ error: 'Animal not found' }, { status: 404 })
    }
    
    const oldWeight = currentAnimal.weight
    const newWeight = body.weight
    const oldHealthStatus = currentAnimal.health_status
    const newHealthStatus = body.health_status
    const oldProductionStatus = currentAnimal.production_status
    const newProductionStatus = body.production_status
    
    console.log('🔍 [API] Update changes detected:', {
      animalId,
      weightChanged: oldWeight !== newWeight,
      healthStatusChanged: oldHealthStatus !== newHealthStatus,
      productionStatusChanged: oldProductionStatus !== newProductionStatus
    })
    
    // Update the animal
    const result = await updateAnimal(animalId, userRole.farm_id, body)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    const supabase = await createServerSupabaseClient()
    
    // ===== WEIGHT HANDLING (animal_weight_records, animals_requiring_weight_update) =====
    if (newWeight !== undefined && newWeight !== null && newWeight !== oldWeight) {
      console.log('⚖️ [API] Weight was updated, creating weight record...')
      
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
        console.error('⚠️ [API] Failed to create weight record:', weightError)
      } else {
        console.log('✅ [API] Weight record created:', weightRecord.id)
        
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
          console.error('⚠️ [API] Failed to resolve weight requirements:', resolveError)
        } else {
          console.log('✅ [API] Resolved', resolvedReqs?.length || 0, 'weight requirement(s)')
        }
      }
    }
    
    // ===== HEALTH RECORD HANDLING (health_records, animals_requiring_health_attention) =====
    const concerningStatuses = ['sick', 'requires_attention', 'quarantined']
    const wasHealthy = !concerningStatuses.includes(oldHealthStatus)
    const isNowConcerning = concerningStatuses.includes(newHealthStatus)
    
    if (oldHealthStatus !== newHealthStatus && isNowConcerning) {
      console.log('🏥 [API] Health status changed to concerning:', newHealthStatus)
      
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
        console.log('✅ [API] Health record created:', (healthResult.data as any)?.id)
        
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
        console.error('❌ [API] Failed to create health record:', healthResult.error)
      }
    }
    
    // ===== BREEDING RECORDS HANDLING (breeding_records, animal_categories) =====
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
      
      console.log('🐄 [API] Breeding eligibility check:', {
        isBreedingAge,
        hasBreedingData,
        ageMonths: ageInMonths,
        minAge: minBreedingAge,
        productionStatus: newProductionStatus
      })
      
      if (isBreedingAge && hasBreedingData) {
        // Check if breeding record already exists
        const { data: existingRecord } = await (supabase as any)
          .from('breeding_records')
          .select('id')
          .eq('animal_id', animalId)
          .single()
        
        if (!existingRecord) {
          console.log('✅ [API] Creating breeding record for updated animal...')
          
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
            .from('breeding_records')
            .insert(breedingRecordData)
          
          if (breedingError) {
            console.error('⚠️ [API] Failed to create breeding record:', breedingError)
          } else {
            console.log('✅ [API] Breeding record created successfully')
          }
        } else {
          console.log('ℹ️ [API] Breeding record already exists, skipping creation')
        }
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      animal: result.data,
      message: 'Animal updated successfully'
    })
    
  } catch (error) {
    console.error('❌ [API] Update animal error:', error)
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