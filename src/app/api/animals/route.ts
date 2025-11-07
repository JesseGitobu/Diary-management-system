// app/api/animals/route.ts - Updated with auto breeding generation
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, createServerSupabaseClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createAnimal } from '@/lib/database/animals'
import { createHealthRecord } from '@/lib/database/health'
import { getTaggingSettings } from '@/lib/database/tagging-settings'
import { generateAnimalTagNumber } from '@/lib/utils/tag-generator'
import { 
  calculateAgeDays, 
  getProductionStatusFromCategories,
  isValidProductionStatusForGender
} from '@/lib/utils/productionStatusUtils'
import { requiresImmediateWeightUpdate } from '@/lib/utils/weightScheduleUtils'
import { differenceInMonths } from 'date-fns'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [API] Animals POST request received')
    
    const user = await getCurrentUser()
    console.log('🔍 [API] Current user:', user?.email || 'No user')
    
    if (!user) {
      console.error('❌ [API] Unauthorized - no user')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id)
    console.log('🔍 [API] User role:', userRole)
    
    if (!userRole?.farm_id) {
      console.error('❌ [API] No farm associated with user')
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }
    
    const body = await request.json()
    console.log('🔍 [API] Request body:', body)
    
    const { farm_id, ...animalData } = body
    
    // Verify user owns the farm
    if (farm_id !== userRole.farm_id) {
      console.error('❌ [API] Forbidden - farm ID mismatch')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get tagging settings for the farm
    console.log('🔍 [API] Fetching tagging settings for farm:', farm_id)
    const taggingSettings = await getTaggingSettings(farm_id)
    console.log('🔍 [API] Tagging settings:', taggingSettings)

    // Auto-generate tag number if not provided or if user wants auto-generation
    let finalTagNumber = animalData.tag_number
    
    if (!finalTagNumber || animalData.autoGenerateTag) {
      console.log('🔍 [API] Auto-generating tag number...')
      
      try {
        finalTagNumber = await generateAnimalTagNumber(
          farm_id, 
          taggingSettings, 
          {
            animalSource: animalData.animal_source,
            animalData: animalData,
            customAttributes: animalData.customAttributes || []
          }
        )
        console.log('✅ [API] Generated tag number:', finalTagNumber)
      } catch (tagError) {
        console.error('❌ [API] Tag generation failed:', tagError)
        return NextResponse.json({ 
          error: 'Failed to generate tag number: ' + (tagError instanceof Error ? tagError.message : 'Unknown error')
        }, { status: 400 })
      }
    }

    // Validate the tag number
    if (!finalTagNumber || finalTagNumber.trim().length === 0) {
      return NextResponse.json({ error: 'Tag number is required' }, { status: 400 })
    }

    // ===== AUTO-CALCULATE PRODUCTION STATUS (ONLY IF NOT PROVIDED) =====
    let finalProductionStatus = animalData.production_status
    
    if (!finalProductionStatus && animalData.birth_date && animalData.gender) {
      console.log('🔍 [API] Production status not provided, calculating based on age and categories...')
      
      try {
        const supabase = await createServerSupabaseClient()
        const { data: dbCategories, error: categoriesError } = await supabase
          .from('animal_categories')
          .select('*')
          .eq('farm_id', farm_id)
          .order('sort_order', { ascending: true })

        const categories = dbCategories?.map(cat => ({
          ...cat,
          min_age_days: cat.min_age_days ?? undefined,
          max_age_days: cat.max_age_days ?? undefined,
          gender: cat.gender ?? undefined,
          created_at: cat.created_at ?? undefined,
          description: cat.description ?? undefined,
          is_default: cat.is_default ?? undefined,
          sort_order: cat.sort_order ?? undefined,
          updated_at: cat.updated_at ?? undefined,
          characteristics: cat.characteristics ? JSON.parse(JSON.stringify(cat.characteristics)) : {
            lactating: undefined,
            pregnant: undefined,
            breeding_male: undefined,
            growth_phase: undefined
          }
        }))
        
        if (categoriesError) {
          console.warn('⚠️ [API] Could not fetch categories, using default rules:', categoriesError)
        }
        
        const ageDays = calculateAgeDays(animalData.birth_date)
        console.log('🔍 [API] Animal age:', ageDays, 'days')
        
        finalProductionStatus = getProductionStatusFromCategories(
          ageDays,
          animalData.gender,
          (categories || []).map(cat => ({
            ...cat,
            min_age_days: cat.min_age_days ?? undefined,
            max_age_days: cat.max_age_days ?? undefined,
            gender: cat.gender ?? undefined,
            production_status: (cat.production_status as "calf" | "lactating" | "heifer" | "bull" | "served" | "dry" | null | undefined),
            characteristics: cat.characteristics ? {
              lactating: (cat.characteristics as any).lactating,
              pregnant: (cat.characteristics as any).pregnant,
              breeding_male: (cat.characteristics as any).breeding_male,
              growth_phase: (cat.characteristics as any).growth_phase
            } : {}
          }))
        )
        
        console.log('✅ [API] Calculated production status:', finalProductionStatus)
      } catch (statusError) {
        console.error('⚠️ [API] Production status calculation failed, using default:', statusError)
        finalProductionStatus = 'calf'
      }
    } else if (finalProductionStatus) {
      console.log('✅ [API] Using user-provided production status:', finalProductionStatus)
    } else {
      console.log('⚠️ [API] No production status provided or calculated, using default: calf')
      finalProductionStatus = 'calf'
    }

    // ===== VALIDATE PRODUCTION STATUS FOR GENDER =====
    if (animalData.gender && finalProductionStatus) {
      console.log('🔍 [API] Validating production status for gender...')
      
      if (!isValidProductionStatusForGender(finalProductionStatus, animalData.gender)) {
        console.error('❌ [API] Invalid production status for gender')
        return NextResponse.json({ 
          error: `Invalid production status "${finalProductionStatus}" for ${animalData.gender} animal. ${
            animalData.gender === 'male' 
              ? 'Males can only be "calf" or "bull".' 
              : 'Females cannot be "bull".'
          }`
        }, { status: 400 })
      }
      
      console.log('✅ [API] Production status valid for gender')
    }

    // Prepare final animal data
    const finalAnimalData = {
      ...animalData,
      tag_number: finalTagNumber.trim(),
      production_status: finalProductionStatus
    }
    
    console.log('🔍 [API] Creating animal with final data:', finalAnimalData)
    const result = await createAnimal(userRole.farm_id, finalAnimalData)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    const createdAnimal = result.data

    // ===== AUTO-GENERATE BREEDING RECORDS =====
    let breedingRecordsGenerated = false
    let generatedBreedingRecord = null
    
    // Check if animal is of breeding age
    if (animalData.birth_date && animalData.gender === 'female') {
      const supabase = await createServerSupabaseClient()
      
      // Get breeding settings
      const { data: breedingSettings } = await supabase
        .from('farm_breeding_settings')
        .select('*')
        .eq('farm_id', farm_id)
        .single()
      
      const minBreedingAge = breedingSettings?.minimum_breeding_age_months || 15
      const ageInMonths = differenceInMonths(new Date(), new Date(animalData.birth_date))
      
      console.log('🔍 [API] Checking breeding eligibility - Age:', ageInMonths, 'months, Min:', minBreedingAge)
      
      const isBreedingAge = ageInMonths >= minBreedingAge
      
      // Check if animal has breeding-related data
      const hasBreedingData = (
        animalData.service_date ||
        animalData.expected_calving_date ||
        (animalData.lactation_number && animalData.lactation_number > 0) ||
        finalProductionStatus === 'served' ||
        finalProductionStatus === 'dry'
      )
      
      console.log('🔍 [API] Has breeding data:', hasBreedingData)
      console.log('🔍 [API] Production status:', finalProductionStatus)
      
      if (isBreedingAge && hasBreedingData) {
        console.log('✅ [API] Eligible for breeding record generation')
        
        const breedingResult = await autoGenerateBreedingRecords(
          supabase,
          createdAnimal.id,
          farm_id,
          {
            production_status: finalProductionStatus,
            service_date: animalData.service_date,
            service_method: animalData.service_method,
            expected_calving_date: animalData.expected_calving_date,
            days_in_milk: animalData.days_in_milk,
            lactation_number: animalData.lactation_number
          },
          breedingSettings,
          user.id
        )
        
        if (breedingResult) {
          breedingRecordsGenerated = true
          generatedBreedingRecord = breedingResult
          console.log('✅ [API] Breeding records auto-generated')
        }
      } else {
        console.log('ℹ️ [API] Not eligible for breeding record generation')
      }
    }

    // ===== WEIGHT UPDATE LOGIC (existing code) =====
    let requiresWeightUpdate = false
    let weightUpdateReason = ''
    let weightUpdatePriority: 'high' | 'normal' | 'low' = 'normal'
    
    console.log('🔍 [API] Checking if weight update is required...')
    
    let referenceDate: Date | null = null
    let initialWeight: number | null = null
    
    if (animalData.animal_source === 'newborn_calf' && animalData.birth_date) {
      referenceDate = new Date(animalData.birth_date)
      initialWeight = animalData.birth_weight
    } else if (animalData.animal_source === 'purchased_animal' && animalData.purchase_date) {
      referenceDate = new Date(animalData.purchase_date)
      initialWeight = animalData.purchase_weight
    }
    
    if (referenceDate) {
      const now = new Date()
      const ageDays = Math.floor(
        (now.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      
      console.log('🔍 [API] Animal age:', ageDays, 'days')
      console.log('🔍 [API] Initial weight provided:', initialWeight ? `${initialWeight} kg` : 'No')
      console.log('🔍 [API] Current weight provided:', animalData.weight ? `${animalData.weight} kg` : 'No')
      
      const hasCurrentWeight = animalData.weight !== undefined && animalData.weight !== null
      
      if (ageDays > 30 && !hasCurrentWeight) {
        requiresWeightUpdate = true
        weightUpdatePriority = 'high'
        
        if (animalData.animal_source === 'newborn_calf') {
          weightUpdateReason = 'new_calf_over_month'
          console.log('⚠️ [API] Calf is', ageDays, 'days old - CURRENT weight required')
        } else {
          weightUpdateReason = 'purchased_over_month'
          console.log('⚠️ [API] Animal purchased', ageDays, 'days ago - CURRENT weight required')
        }
        
        const supabase = await createServerSupabaseClient()
        const { data: weightRequirement, error: weightError } = await supabase
          .from('animals_requiring_weight_update')
          .insert({
            animal_id: createdAnimal.id,
            farm_id: userRole.farm_id,
            reason: weightUpdateReason,
            due_date: now.toISOString().split('T')[0],
            priority: weightUpdatePriority
          })
          .select()
          .single()
        
        if (weightError) {
          console.error('❌ [API] Failed to create weight requirement:', weightError)
        } else {
          console.log('✅ [API] Weight requirement created:', weightRequirement)
        }
      }
      
      if (initialWeight && ageDays > 0) {
        const supabase = await createServerSupabaseClient()
        const measurementType = animalData.animal_source === 'newborn_calf' ? 'birth' : 'purchase'
        
        const { error: initialWeightError } = await supabase
          .from('animal_weight_records')
          .insert({
            animal_id: createdAnimal.id,
            farm_id: userRole.farm_id,
            weight_kg: initialWeight,
            measurement_date: referenceDate.toISOString().split('T')[0],
            measurement_type: measurementType,
            notes: `Initial ${measurementType} weight`,
            is_required: false,
            recorded_by: user.id
          })
        
        if (initialWeightError) {
          console.error('⚠️ [API] Failed to record initial weight:', initialWeightError)
        } else {
          console.log('✅ [API] Initial weight recorded:', initialWeight, 'kg on', referenceDate.toISOString().split('T')[0])
        }
      }
      
      if (hasCurrentWeight && ageDays > 0) {
        const supabase = await createServerSupabaseClient()
        
        const { error: currentWeightError } = await supabase
          .from('animal_weight_records')
          .insert({
            animal_id: createdAnimal.id,
            farm_id: userRole.farm_id,
            weight_kg: animalData.weight,
            measurement_date: now.toISOString().split('T')[0],
            measurement_type: 'routine',
            notes: 'Current weight at registration',
            is_required: true,
            recorded_by: user.id
          })
        
        if (currentWeightError) {
          console.error('⚠️ [API] Failed to record current weight:', currentWeightError)
        } else {
          console.log('✅ [API] Current weight recorded:', animalData.weight, 'kg on', now.toISOString().split('T')[0])
        }
      }
    }
    
    // ===== CHECK HEALTH STATUS (existing code) =====
    let healthRecordCreated = false
    let healthRecord = null
    
    const concerningStatuses = ['sick', 'requires_attention', 'quarantined']
    
    if (animalData.health_status && concerningStatuses.includes(animalData.health_status)) {
      console.log('🔍 [API] Health status requires health record:', animalData.health_status)
      
      const healthRecordData = {
        animal_id: createdAnimal.id,
        farm_id: userRole.farm_id,
        record_date: new Date().toISOString().split('T')[0],
        record_type: getRecordTypeFromHealthStatus(animalData.health_status),
        description: generateHealthDescription(animalData.health_status, createdAnimal),
        severity: getSeverityFromHealthStatus(animalData.health_status),
        notes: animalData.notes ? `Animal notes: ${animalData.notes}` : null,
        created_by: user.id,
        is_auto_generated: true,
        completion_status: 'pending',
        original_health_status: animalData.health_status,
        requires_record_type_selection: needsUserRecordTypeChoice(animalData.health_status),
        available_record_types: needsUserRecordTypeChoice(animalData.health_status) 
          ? getRecordTypeChoices(animalData.health_status) 
          : undefined
      }
      
      const healthResult = await createHealthRecord(healthRecordData)
      
      if (healthResult.success) {
        healthRecordCreated = true
        healthRecord = healthResult.data
        
        const supabase = await createServerSupabaseClient()
        await supabase
          .from('animals_requiring_health_attention')
          .update({
            health_record_id: healthRecord?.id || null,
            health_record_created: true
          })
          .eq('animal_id', createdAnimal.id)
          .eq('farm_id', userRole.farm_id)
          
        console.log('✅ [API] Created health record and updated tracking')
      }
    }
    
    // ===== BUILD SUCCESS RESPONSE =====
    let message = `Animal added successfully with tag ${finalTagNumber}`
    
    if (breedingRecordsGenerated && requiresWeightUpdate && healthRecordCreated) {
      message = `Animal added successfully. Breeding history created. Please record current weight and complete health details.`
    } else if (breedingRecordsGenerated && requiresWeightUpdate) {
      message = `Animal added successfully. Breeding history created. Please record current weight.`
    } else if (breedingRecordsGenerated && healthRecordCreated) {
      message = `Animal added successfully. Breeding history created. Please complete health details.`
    } else if (breedingRecordsGenerated) {
      message = `Animal added successfully. Breeding history automatically created from registration data.`
    } else if (requiresWeightUpdate && healthRecordCreated) {
      message = `Animal added successfully. Please record current weight and complete health details.`
    } else if (requiresWeightUpdate) {
      message = `Animal added successfully. Please record current weight (animal is over 30 days old).`
    } else if (healthRecordCreated) {
      message = `Animal added successfully. Health record created - please add additional details.`
    }
    
    console.log('✅ [API] Animal created successfully')
    return NextResponse.json({ 
      success: true, 
      animal: createdAnimal,
      
      // Health record info
      healthRecordCreated,
      healthRecord,
      requiresHealthDetails: healthRecordCreated,
      
      // Weight update info
      requiresWeightUpdate,
      weightUpdateReason,
      weightUpdatePriority,
      
      // Breeding records info
      breedingRecordsGenerated,
      generatedBreedingRecord,
      
      // Generated values
      generatedTagNumber: finalTagNumber !== animalData.tag_number ? finalTagNumber : undefined,
      calculatedProductionStatus: finalProductionStatus !== animalData.production_status ? finalProductionStatus : undefined,
      
      message
    })
    
  } catch (error) {
    console.error('❌ [API] Animals API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ===== AUTO-GENERATE BREEDING RECORDS HELPER =====
async function autoGenerateBreedingRecords(
  supabase: any,
  animalId: string,
  farmId: string,
  data: {
    production_status: string
    service_date?: string
    service_method?: string
    expected_calving_date?: string
    days_in_milk?: number
    lactation_number?: number
  },
  breedingSettings: any,
  userId: string
) {
  try {
    console.log('🔄 [AUTO-BREEDING] Starting auto-generation for animal:', animalId)
    console.log('🔄 [AUTO-BREEDING] Production status:', data.production_status)
    console.log('🔄 [AUTO-BREEDING] Service date:', data.service_date)
    console.log('🔄 [AUTO-BREEDING] Expected calving:', data.expected_calving_date)
    console.log('🔄 [AUTO-BREEDING] Lactation number:', data.lactation_number)

    const gestationPeriod = breedingSettings?.default_gestation || 280
    const pregnancyCheckDays = breedingSettings?.pregnancy_check_days || 45
    
    let breedingData: any = null
    let pregnancyData: any = null

    // Scenario 1: SERVED Status (Recently bred, pending confirmation)
    if (data.production_status === 'served' && data.service_date) {
      console.log('✅ [AUTO-BREEDING] Scenario: SERVED - Creating pending breeding record')
      
      // Calculate expected calving date
      const breedingDate = new Date(data.service_date)
      const expectedCalving = data.expected_calving_date || 
        new Date(breedingDate.getTime() + gestationPeriod * 24 * 60 * 60 * 1000)
          .toISOString().split('T')[0]

      breedingData = {
        animal_id: animalId,
        farm_id: farmId,
        breeding_type: data.service_method === 'artificial_insemination' ? 'artificial_insemination' :
                       data.service_method === 'natural' ? 'natural' : 'artificial_insemination',
        breeding_date: data.service_date,
        notes: '🤖 Auto-generated from registration (Served status)',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      pregnancyData = {
        animal_id: animalId,
        farm_id: farmId,
        pregnancy_status: 'suspected',
        expected_calving_date: expectedCalving,
        gestation_length: gestationPeriod,
        pregnancy_notes: 'Auto-generated from registration data',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }
    
    // Scenario 2: DRY Status (Confirmed pregnant)
    else if (data.production_status === 'dry' && data.expected_calving_date) {
      console.log('✅ [AUTO-BREEDING] Scenario: DRY - Creating confirmed breeding record')
      
      // Calculate breeding date (work backwards from calving date)
      const calvingDate = new Date(data.expected_calving_date)
      const breedingDate = new Date(calvingDate.getTime() - gestationPeriod * 24 * 60 * 60 * 1000)
      const breedingDateStr = breedingDate.toISOString().split('T')[0]
      
      // Calculate confirmation date (pregnancy check days after breeding)
      const confirmationDate = new Date(breedingDate.getTime() + pregnancyCheckDays * 24 * 60 * 60 * 1000)
      const confirmationDateStr = confirmationDate.toISOString().split('T')[0]

      breedingData = {
        animal_id: animalId,
        farm_id: farmId,
        breeding_type: data.service_method === 'artificial_insemination' ? 'artificial_insemination' :
                       data.service_method === 'natural' ? 'natural' : 'artificial_insemination',
        breeding_date: breedingDateStr,
        notes: '🤖 Auto-generated from registration (Dry/Pregnant status)',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      pregnancyData = {
        animal_id: animalId,
        farm_id: farmId,
        pregnancy_status: 'confirmed',
        confirmed_date: confirmationDateStr,
        confirmation_method: 'rectal_palpation',
        expected_calving_date: data.expected_calving_date,
        gestation_length: gestationPeriod,
        pregnancy_notes: `Auto-generated from registration data. Pregnancy confirmed on ${confirmationDateStr}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }
    
    // Scenario 3: LACTATING Status (Already calved)
    else if (data.production_status === 'lactating' && data.lactation_number && data.lactation_number > 0) {
      console.log('✅ [AUTO-BREEDING] Scenario: LACTATING - Creating completed breeding record')
      
      const today = new Date()
      const daysInMilk = data.days_in_milk || 60 // Default assumption
      
      // Calculate calving date (work backwards from today)
      const calvingDate = new Date(today.getTime() - daysInMilk * 24 * 60 * 60 * 1000)
      const calvingDateStr = calvingDate.toISOString().split('T')[0]
      
      // Calculate breeding date (work backwards from calving)
      const breedingDate = new Date(calvingDate.getTime() - gestationPeriod * 24 * 60 * 60 * 1000)
      const breedingDateStr = breedingDate.toISOString().split('T')[0]

      breedingData = {
        animal_id: animalId,
        farm_id: farmId,
        breeding_type: 'artificial_insemination',
        breeding_date: breedingDateStr,
        notes: `🤖 Auto-generated from registration (Lactating, Lactation #${data.lactation_number}, ${daysInMilk} DIM)`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      pregnancyData = {
        animal_id: animalId,
        farm_id: farmId,
        pregnancy_status: 'completed',
        confirmed_date: breedingDateStr, // Use breeding date as rough confirmation
        confirmation_method: 'visual',
        expected_calving_date: calvingDateStr,
        actual_calving_date: calvingDateStr,
        gestation_length: gestationPeriod,
        pregnancy_notes: `Auto-generated from registration data. Calved ${daysInMilk} days ago.`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }

    // Insert breeding and pregnancy records if generated
    if (breedingData && pregnancyData) {
      console.log('💾 [AUTO-BREEDING] Inserting breeding record...')
      
      // 1. Insert breeding record
      const { data: breedingRecord, error: breedingError } = await supabase
        .from('breeding_records')
        .insert(breedingData)
        .select()
        .single()

      if (breedingError) {
        console.error('❌ [AUTO-BREEDING] Failed to insert breeding record:', breedingError)
        return null
      }

      console.log('✅ [AUTO-BREEDING] Breeding record created:', breedingRecord.id)

      // 2. Create breeding event
      const breedingEvent = {
        farm_id: farmId,
        animal_id: animalId,
        event_type: 'insemination',
        event_date: breedingData.breeding_date,
        insemination_method: breedingData.breeding_type,
        semen_bull_code: breedingData.sire_name,
        technician_name: breedingData.technician_name,
        notes: `🤖 Auto-generated from registration (${data.production_status} status)`,
        created_by: userId 
      }

      const { error: eventError } = await supabase
        .from('breeding_events')
        .insert(breedingEvent)

      if (eventError) {
        console.error('❌ [AUTO-BREEDING] Failed to create breeding event:', eventError)
        // Don't fail the whole operation, just log the error
      } else {
        console.log('✅ [AUTO-BREEDING] Breeding event created')
      }

      // 3. Insert pregnancy record with breeding_record_id
      pregnancyData.breeding_record_id = breedingRecord.id
      
      const { data: pregnancyRecord, error: pregnancyError } = await supabase
        .from('pregnancy_records')
        .insert(pregnancyData)
        .select()
        .single()

      if (pregnancyError) {
        console.error('❌ [AUTO-BREEDING] Failed to insert pregnancy record:', pregnancyError)
        return breedingRecord // Return breeding record even if pregnancy fails
      }

      // 4. Create pregnancy check event if pregnancy is confirmed
      if (pregnancyData.pregnancy_status === 'confirmed') {
        const pregnancyEvent = {
          farm_id: farmId,
          animal_id: animalId,
          event_type: 'pregnancy_check',
          event_date: pregnancyData.confirmed_date,
          pregnancy_result: 'pregnant',
          examination_method: pregnancyData.confirmation_method,
          veterinarian_name: pregnancyData.veterinarian,
          estimated_due_date: pregnancyData.expected_calving_date,
          notes: pregnancyData.pregnancy_notes,
          created_by: userId 
        }

        const { error: pregnancyEventError } = await supabase
          .from('breeding_events')
          .insert(pregnancyEvent)

        if (pregnancyEventError) {
          console.error('❌ [AUTO-BREEDING] Failed to create pregnancy check event:', pregnancyEventError)
        } else {
          console.log('✅ [AUTO-BREEDING] Pregnancy check event created')
        }
      }

      console.log('✅ [AUTO-BREEDING] Auto-generation complete')

      return {
        breedingRecord,
        pregnancyRecord
      }
    }

    console.log('ℹ️ [AUTO-BREEDING] No breeding records generated - insufficient data')
    return null

  } catch (error) {
    console.error('❌ [AUTO-BREEDING] Error in autoGenerateBreedingRecords:', error)
    return null
  }
}

// Helper functions (existing)
function getRecordTypeFromHealthStatus(healthStatus: string): "treatment" | "vaccination" | "checkup" | "injury" | "illness" {
  switch (healthStatus) {
    case 'sick':
      return 'illness'
    case 'requires_attention':
      return 'checkup'
    case 'quarantined':
      return 'checkup'
    default:
      return 'checkup'
  }
}

function getRecordTypeChoices(healthStatus: string): string[] {
  switch (healthStatus) {
    case 'requires_attention':
      return ['injury', 'checkup']
    case 'quarantined':
      return ['checkup', 'vaccination', 'illness', 'treatment']
    default:
      return []
  }
}

function needsUserRecordTypeChoice(healthStatus: string): boolean {
  return ['requires_attention', 'quarantined'].includes(healthStatus)
}

function getSeverityFromHealthStatus(healthStatus: string): 'low' | 'medium' | 'high' {
  switch (healthStatus) {
    case 'sick':
      return 'medium'
    case 'requires_attention':
      return 'low'
    case 'quarantined':
      return 'high'
    default:
      return 'low'
  }
}

function generateHealthDescription(healthStatus: string, animal: any): string {
  const animalName = animal.name || `Animal ${animal.tag_number}`
  
  switch (healthStatus) {
    case 'sick':
      return `${animalName} registered with sick status - requires medical evaluation`
    case 'requires_attention':
      return `${animalName} requires health attention - needs assessment`
    case 'quarantined':
      return `${animalName} placed in quarantine - potential health concern`
    default:
      return `Health status assessment needed for ${animalName}`
  }
}