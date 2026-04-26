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
    
    const userRole = await getUserRole(user.id) as any
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

        // Cast dbCategories to any[] to avoid strict type checking on spread
        const categories = (dbCategories as any[])?.map(cat => ({
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
          (categories || []).map((cat: any) => ({
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

    // ===== BREEDING CYCLE NUMBER TRANSFORMATION =====
    // For SERVED and DRY animals: transform breeding_cycle_number to lactation_number
    // Logic: if breeding_cycle_number > 1, then lactation_number = breeding_cycle_number - 1
    //        otherwise, lactation_number = breeding_cycle_number
    let finalLactationNumber = animalData.lactation_number
    
    if ((finalProductionStatus === 'served' || finalProductionStatus === 'dry') && animalData.lactation_number) {
      // Apply transformation: if > 1, subtract 1
      finalLactationNumber = animalData.lactation_number > 1 ? animalData.lactation_number - 1 : animalData.lactation_number
      console.log(`✅ [API] Breeding cycle transformation: ${animalData.lactation_number} → ${finalLactationNumber}`)
    }
    
    // Prepare final animal data
    const finalAnimalData = {
      ...animalData,
      tag_number: finalTagNumber.trim(),
      production_status: finalProductionStatus,
      lactation_number: finalLactationNumber // ✅ Use transformed value
    }
    
    // ✅ FILTER OUT FIELDS THAT DON'T BELONG IN ANIMALS TABLE
    // Only keep fields that exist in the animals table schema
    const allowedAnimalFields = [
      'tag_number', 'name', 'breed', 'gender', 'birth_date', 'animal_source',
      'health_status', 'production_status', 'status', 'notes',
      'mother_id', 'father_id', 'father_info', 'mother_name',
      'autoGenerateTag', 'customAttributes' // These are for tag generation context
    ]
    
    const cleanAnimalData = Object.keys(finalAnimalData)
      .filter(key => allowedAnimalFields.includes(key))
      .reduce((obj: any, key: string) => {
        // Map camelCase autoGenerateTag to snake_case auto_generate_tag
        if (key === 'autoGenerateTag') {
          obj.auto_generate_tag = (finalAnimalData as any)[key]
        } else {
          obj[key] = (finalAnimalData as any)[key]
        }
        return obj
      }, {})
    
    console.log('🔍 [API] Creating animal with clean data (filtered):', cleanAnimalData)
    const result = await createAnimal(userRole.farm_id, cleanAnimalData)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    const createdAnimal = result.data

    // ===== CREATE ANIMAL_PURCHASES RECORD FOR PURCHASED ANIMALS =====
    if (animalData.animal_source === 'purchased_animal' && animalData.purchase_date) {
      console.log('🔍 [API] Creating animal_purchases record...')
      try {
        const supabase = await createServerSupabaseClient()
        const { error: purchaseError } = await (supabase as any)
          .from('animal_purchases')
          .insert({
            farm_id: userRole.farm_id,
            animal_id: createdAnimal.id,
            purchase_date: animalData.purchase_date,
            purchase_price: animalData.purchase_price || null,
            farm_seller_name: animalData.seller_info || 'Not specified',
            farm_seller_contact: animalData.seller_contact || null,
            previous_farm_tag: animalData.previous_farm_tag || null,
            dam_tag_at_origin: animalData.origin_dam_tag || null,
            dam_name_at_origin: animalData.origin_dam_name || null,
            sire_tag_or_semen_code: animalData.origin_sire_tag || null,
            sire_name_or_semen_source: animalData.origin_sire_name || null,
            notes: animalData.notes || null,
            created_by: user.id,
          })
        if (purchaseError) {
          console.error('❌ [API] animal_purchases insert failed:', purchaseError)
        } else {
          console.log('✅ [API] animal_purchases record created')
        }
      } catch (error) {
        console.error('❌ [API] Error creating animal_purchases record:', error)
      }
    }

    // ===== CREATE CALF_RECORDS FOR NEWBORN CALVES =====
    // calf_records.calving_record_id is NOT NULL — we must resolve or create a calving_record
    if (animalData.animal_source === 'newborn_calf' && animalData.mother_id) {
      console.log('🔍 [API] Resolving calving_record for newborn calf...')
      try {
        const supabase = await createServerSupabaseClient()

        // 1. Find existing calving_record for this mother on the birth date
        const { data: existingCalving } = await (supabase as any)
          .from('calving_records')
          .select('id')
          .eq('mother_id', animalData.mother_id)
          .eq('calving_date', animalData.birth_date)
          .maybeSingle()

        let calvingRecordId: string | null = (existingCalving as any)?.id || null

        if (!calvingRecordId) {
          // 2. Look for an open/active pregnancy on the mother
          const { data: openPregnancy } = await (supabase as any)
            .from('pregnancy_records')
            .select('id')
            .eq('animal_id', animalData.mother_id)
            .in('pregnancy_status', ['suspected', 'confirmed'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          let pregnancyForCalving: string | null = (openPregnancy as any)?.id || null

          if (!pregnancyForCalving) {
            // 3. No open pregnancy — build minimal service_record → pregnancy_record chain
            const { data: maxSvc } = await (supabase as any)
              .from('service_records')
              .select('service_number')
              .eq('animal_id', animalData.mother_id)
              .order('service_number', { ascending: false })
              .limit(1)
              .maybeSingle()
            const nextSvcNum = ((maxSvc as any)?.service_number || 0) + 1

            const estimatedServiceDate = new Date(animalData.birth_date)
            estimatedServiceDate.setDate(estimatedServiceDate.getDate() - 280)

            const { data: minService } = await (supabase as any)
              .from('service_records')
              .insert({
                farm_id: userRole.farm_id,
                animal_id: animalData.mother_id,
                service_number: nextSvcNum,
                service_date: estimatedServiceDate.toISOString().split('T')[0],
                service_type: 'natural',
                notes: 'Auto-created during calf registration',
              })
              .select()
              .single()

            if (minService) {
              const { data: minPreg } = await (supabase as any)
                .from('pregnancy_records')
                .insert({
                  farm_id: userRole.farm_id,
                  animal_id: animalData.mother_id,
                  service_record_id: (minService as any).id,
                  pregnancy_status: 'completed',
                  expected_calving_date: animalData.birth_date,
                  gestation_length_days: 280,
                  pregnancy_notes: 'Auto-created during calf registration',
                })
                .select()
                .single()
              pregnancyForCalving = (minPreg as any)?.id || null
            }
          } else {
            // Mark the matched open pregnancy as completed
            await (supabase as any)
              .from('pregnancy_records')
              .update({ pregnancy_status: 'completed' })
              .eq('id', pregnancyForCalving)
          }

          if (pregnancyForCalving) {
            // 4. Create calving_record for the mother
            const { data: newCalving } = await (supabase as any)
              .from('calving_records')
              .insert({
                farm_id: userRole.farm_id,
                mother_id: animalData.mother_id,
                pregnancy_record_id: pregnancyForCalving,
                calving_date: animalData.birth_date,
                calving_difficulty: 'normal',
                assistance_required: false,
                calf_alive: true,
                notes: `Calf registered: ${createdAnimal.tag_number}`,
              })
              .select()
              .single()

            calvingRecordId = (newCalving as any)?.id || null

            // 5. Create calving breeding event for the mother
            if (calvingRecordId) {
              const { error: calvingEventError } = await (supabase as any)
                .from('breeding_events')
                .insert({
                  farm_id: userRole.farm_id,
                  animal_id: animalData.mother_id,
                  event_type: 'calving',
                  event_date: new Date(animalData.birth_date).toISOString(),
                  calving_record_id: calvingRecordId,
                  notes: `Calf registered: ${createdAnimal.tag_number}`,
                  created_by: user.id,
                })
              if (calvingEventError) {
                console.warn('⚠️ calving breeding_event failed:', calvingEventError.message)
              }
            }
          }
        }

        if (calvingRecordId) {
          const { error: calfError } = await (supabase as any)
            .from('calf_records')
            .insert({
              farm_id: userRole.farm_id,
              calving_record_id: calvingRecordId,
              animal_id: createdAnimal.id,
              dam_id: animalData.mother_id,
              birth_date: animalData.birth_date,
              gender: animalData.gender,
              birth_weight: animalData.birth_weight || null,
              breed: animalData.breed || null,
              sire_tag: animalData.father_info || null,
              health_status: calfHealthStatus(animalData.health_status),
              notes: animalData.notes || null,
            })
          if (calfError) {
            console.error('❌ [API] calf_records insert failed:', calfError)
          } else {
            console.log('✅ [API] calf_records created (calving_record_id:', calvingRecordId, ')')
          }
        } else {
          console.error('❌ [API] Could not obtain calving_record_id — calf_records skipped')
        }
      } catch (error) {
        console.error('❌ [API] Error in calf_records section:', error)
      }
    }

    // ===== HOIST BREEDING RECORDS STATE =====
    let breedingRecordsGenerated = false
    let generatedBreedingRecord = null

    // ===== DETERMINE IF USER PROVIDED EXPLICIT SERVICE RECORDS =====
    const hasUserServiceRecords = Array.isArray(animalData.service_records) &&
      animalData.service_records.length > 0

    // ===== PROCESS USER-PROVIDED SERVICE RECORDS =====
    if (hasUserServiceRecords) {
      console.log('🔍 [API] Processing', animalData.service_records.length, 'user-provided service records')
      const supabase = await createServerSupabaseClient()
      const serviceRecordsData: any[] = animalData.service_records
      const totalCycles = serviceRecordsData.length

      // Collect calving data for lactation post-processing (mirrors import logic)
      const lactationData: Array<{
        cycleNum: number
        calvingRecordId: string
        actualCalvingDate: string
        steaming_date: string | null
        days_in_milk: number | null
      }> = []

      for (const record of serviceRecordsData) {
        const isCurrent = record.cycle_number === totalCycles
        const isPrevious = !isCurrent

        // service_date is NOT NULL in the schema — skip cycles without it
        if (!record.service_date) {
          console.warn(`⚠️ [API] Cycle ${record.cycle_number} skipped: service_date required`)
          continue
        }

        // Normalize service_type to valid enum values
        const serviceType: 'natural' | 'artificial_insemination' | 'embryo_transfer' =
          record.service_method === 'natural' ? 'natural' :
          record.service_method === 'embryo_transfer' ? 'embryo_transfer' :
          'artificial_insemination'

        // ── 1. service_records ──────────────────────────────────────────────
        const { data: serviceRecord, error: serviceError } = await (supabase as any)
          .from('service_records')
          .insert({
            farm_id: userRole.farm_id,
            animal_id: createdAnimal.id,
            service_number: record.cycle_number,
            service_date: record.service_date,
            service_type: serviceType,
            bull_tag_or_semen_code: record.bull_code || null,
            bull_name_or_semen_source: record.bull_name || null,
            technician_name: record.ai_technician || null,
            expected_calving_date: record.expected_calving_date || null,
            outcome: record.service_outcome || null,
            semen_type: record.semen_type || null,
            notes: record.semen_type ? `Semen type: ${record.semen_type}` : null,
          })
          .select()
          .single()

        if (serviceError) {
          console.error(`❌ [API] service_records insert failed cycle ${record.cycle_number}:`, serviceError)
          continue
        }
        console.log(`✅ [API] service_record inserted for cycle ${record.cycle_number}`)

        // ── 2. insemination breeding_event (requires service_record_id) ─────
        try {
          await (supabase as any)
            .from('breeding_events')
            .insert({
              farm_id: userRole.farm_id,
              animal_id: createdAnimal.id,
              event_type: 'insemination',
              event_date: new Date(record.service_date).toISOString(),
              service_record_id: (serviceRecord as any).id,
              notes: `Cycle #${record.cycle_number}${record.bull_name ? ` — ${record.bull_name}` : ''}`,
              created_by: user.id,
            })
        } catch (e: any) {
          console.error(`❌ insemination event cycle ${record.cycle_number}:`, e.message)
        }

        // ── 3. pregnancy_records ─────────────────────────────────────────────
        // Valid pregnancy_status values: suspected | confirmed | false | aborted | completed
        let pregnancyStatus: 'suspected' | 'confirmed' | 'false' | 'aborted' | 'completed'
        let confirmedDate: string | null = null
        let confirmationMethod: string | null = null
        const steamingDate: string | null = record.steaming_date || null
        const actualCalvingDate: string | null = record.actual_calving_date || null

        const cycleCalved = isPrevious
          ? !!actualCalvingDate
          : (finalProductionStatus === 'lactating' || finalProductionStatus === 'steaming_dry_cows') && !!actualCalvingDate

        if (cycleCalved || (isPrevious && !actualCalvingDate)) {
          // Previous cycles always treated as completed regardless
          pregnancyStatus = 'completed'
          if (record.service_date) {
            const d = new Date(record.service_date)
            d.setDate(d.getDate() + 45)
            confirmedDate = d.toISOString().split('T')[0]
          }
        } else if (finalProductionStatus === 'served' && isCurrent) {
          if (record.service_outcome === 'conceived') {
            pregnancyStatus = 'confirmed'
            if (record.service_date) {
              const d = new Date(record.service_date)
              d.setDate(d.getDate() + 45)
              confirmedDate = d.toISOString().split('T')[0]
            }
            confirmationMethod = 'rectal_palpation'
          } else if (record.service_outcome === 'not_conceived') {
            pregnancyStatus = 'false'  // 'not_pregnant' is invalid — DB enum is 'false'
          } else {
            pregnancyStatus = 'suspected'
          }
        } else {
          pregnancyStatus = 'suspected'
        }

        // Only set confirmation_method when status = 'confirmed' (DB constraint)
        if (pregnancyStatus !== 'confirmed') confirmationMethod = null

        let gestationDays: number | null = null
        if (record.service_date && actualCalvingDate) {
          const diff = Math.floor(
            (new Date(actualCalvingDate).getTime() - new Date(record.service_date).getTime()) / 86400000
          )
          gestationDays = diff >= 240 && diff <= 310 ? diff : 280
        }

        const { data: pregnancyRecord, error: pregnancyError } = await (supabase as any)
          .from('pregnancy_records')
          .insert({
            farm_id: userRole.farm_id,
            animal_id: createdAnimal.id,
            service_record_id: (serviceRecord as any).id,   // correct FK name
            pregnancy_status: pregnancyStatus,
            confirmed_date: confirmedDate,
            confirmation_method: confirmationMethod,
            expected_calving_date: record.expected_calving_date || null,
            gestation_length_days: gestationDays,           // correct column name
            steaming_date: steamingDate,                    // belongs here, NOT in calving_records
            pregnancy_notes: `Cycle #${record.cycle_number} — user-provided`,
          })
          .select()
          .single()

        if (pregnancyError) {
          console.error(`❌ [API] pregnancy_records insert failed cycle ${record.cycle_number}:`, pregnancyError)
          continue
        }
        console.log(`✅ [API] pregnancy_record created for cycle ${record.cycle_number}`)

        // ── 4. pregnancy_check breeding_event (requires pregnancy_record_id) ─
        const checkDate = new Date(record.service_date)
        checkDate.setDate(checkDate.getDate() + 60)
        try {
          await (supabase as any)
            .from('breeding_events')
            .insert({
              farm_id: userRole.farm_id,
              animal_id: createdAnimal.id,
              event_type: 'pregnancy_check',
              event_date: checkDate.toISOString(),
              pregnancy_record_id: (pregnancyRecord as any).id,
              notes: `Cycle #${record.cycle_number} pregnancy check`,
              created_by: user.id,
            })
        } catch (e: any) {
          console.error(`❌ pregnancy_check event cycle ${record.cycle_number}:`, e.message)
        }

        // ── 5. calving_record (only for cycles that have already calved) ──────
        if (cycleCalved && actualCalvingDate) {
          // Parse calving difficulty — handle "value - description" format from form selects
          const rawDiff = (record.calving_outcome || 'normal').toLowerCase().trim()
          const diffBase = rawDiff.includes(' - ') ? rawDiff.split(' - ')[0] : rawDiff
          const validDifficulties = ['easy', 'normal', 'difficult', 'assisted', 'cesarean', 'aborted']
          const calvingDifficulty = validDifficulties.includes(diffBase) ? diffBase : 'normal'
          // DB constraint: assistance_required must be true when difficulty is assisted or cesarean
          const assistanceRequired = ['assisted', 'cesarean'].includes(calvingDifficulty)
          const calfAlive = !['aborted', 'stillbirth'].includes(rawDiff)

          const colostrumVal = record.colostrum_produced !== '' && record.colostrum_produced != null
            ? (parseFloat(String(record.colostrum_produced)) || null) : null

          // Parse calving_time: convert HH:MM to HH:MM:SS format
          let calvingTime: string | null = null
          if (record.calving_time && record.calving_time.trim() !== '') {
            const timeStr = record.calving_time.trim()
            // If format is HH:MM, convert to HH:MM:SS
            calvingTime = timeStr.includes(':') 
              ? (timeStr.split(':').length === 2 ? `${timeStr}:00` : timeStr)
              : null
          }

          const { data: calvingRecord, error: calvingError } = await (supabase as any)
            .from('calving_records')
            .insert({
              farm_id: userRole.farm_id,
              mother_id: createdAnimal.id,
              pregnancy_record_id: (pregnancyRecord as any).id,
              calving_date: actualCalvingDate,
              calving_time: calvingTime,
              calving_difficulty: calvingDifficulty,
              assistance_required: assistanceRequired,
              calf_alive: calfAlive,
              colostrum_produced: colostrumVal,
              // steaming_date is in pregnancy_records, not calving_records
              notes: `Cycle #${record.cycle_number} calving — user-provided`,
            })
            .select()
            .single()

          if (calvingError) {
            console.error(`❌ [API] calving_records insert failed cycle ${record.cycle_number}:`, calvingError)
            continue
          }
          console.log(`✅ [API] calving_record created for cycle ${record.cycle_number}`)

          // ── 6. calving breeding_event (requires calving_record_id) ──────────
          try {
            await (supabase as any)
              .from('breeding_events')
              .insert({
                farm_id: userRole.farm_id,
                animal_id: createdAnimal.id,
                event_type: 'calving',
                event_date: new Date(actualCalvingDate).toISOString(),
                calving_record_id: (calvingRecord as any).id,
                notes: `Cycle #${record.cycle_number} calving`,
                created_by: user.id,
              })
          } catch (e: any) {
            console.error(`❌ calving event cycle ${record.cycle_number}:`, e.message)
          }

          // Collect for lactation post-processing
          const rawDim = record.days_in_milk
          lactationData.push({
            cycleNum: record.cycle_number,
            calvingRecordId: (calvingRecord as any).id,
            actualCalvingDate,
            steaming_date: steamingDate,
            days_in_milk: (rawDim !== '' && rawDim != null) ? (parseInt(String(rawDim)) || null) : null,
          })
        }
      } // end for loop

      // ── 7. lactation_cycle_records — post-process after all cycles done ────
      // Mirrors import logic: lactating=active(latest)/completed(prev), steaming=completed+dry_off_reason
      if (lactationData.length > 0) {
        const lastIdx = lactationData.length - 1

        for (let i = 0; i < lactationData.length; i++) {
          const { cycleNum, calvingRecordId, actualCalvingDate, steaming_date, days_in_milk } = lactationData[i]
          const isLatest = i === lastIdx
          const nextCycle = i < lastIdx ? lactationData[i + 1] : null

          const expectedEndDate = new Date(actualCalvingDate)
          expectedEndDate.setDate(expectedEndDate.getDate() + 305)

          let lactStatus: 'active' | 'completed' | 'culling dry'
          let actualEnd: string | null = null
          let dryOffReason: 'voluntary' | 'disease' | 'pregnancy' | 'age' | 'other' | null = null
          let dimValue: number | null = null

          if (finalProductionStatus === 'lactating') {
            if (isLatest) {
              lactStatus = 'active'
              dimValue = days_in_milk
            } else {
              lactStatus = 'completed'
              actualEnd = nextCycle?.actualCalvingDate || null
              dryOffReason = 'pregnancy'
              if (actualEnd) {
                dimValue = Math.floor(
                  (new Date(actualEnd).getTime() - new Date(actualCalvingDate).getTime()) / 86400000
                )
              }
            }
          } else if (finalProductionStatus === 'steaming_dry_cows') {
            lactStatus = 'completed'
            actualEnd = steaming_date || (nextCycle ? nextCycle.actualCalvingDate : null)
            dryOffReason = isLatest ? 'voluntary' : 'pregnancy'
            if (actualEnd) {
              dimValue = Math.floor(
                (new Date(actualEnd).getTime() - new Date(actualCalvingDate).getTime()) / 86400000
              )
            }
          } else {
            lactStatus = 'completed'
            dryOffReason = 'other'
          }

          const { error: lactError } = await (supabase as any)
            .from('lactation_cycle_records')
            .insert({
              farm_id: userRole.farm_id,
              animal_id: createdAnimal.id,
              calving_record_id: calvingRecordId,
              lactation_number: cycleNum,
              start_date: actualCalvingDate,
              expected_end_date: expectedEndDate.toISOString().split('T')[0],
              actual_end_date: actualEnd,
              status: lactStatus,
              dry_off_reason: dryOffReason,
              days_in_milk: dimValue,
              notes: `Cycle #${cycleNum}`,
            })
          if (lactError) {
            console.error(`❌ [API] lactation_cycle_records insert failed cycle ${cycleNum}:`, lactError)
          } else {
            const dimInfo = dimValue != null ? `, DIM=${dimValue}` : ''
            console.log(`✅ [API] lactation_cycle_record: cycle=${cycleNum}, status=${lactStatus}${dimInfo}`)
          }
        }
      }

      breedingRecordsGenerated = true
      console.log('✅ [API] All user-provided service records processed')
    }

    // ===== CREATE SERVICE_RECORDS FOR SERVED ANIMALS (fallback when no explicit records provided) =====
    if (!hasUserServiceRecords && finalProductionStatus === 'served' && animalData.service_date) {
      console.log('🔍 [API] Creating service_records record for served animal...')
      
      try {
        const supabase = await createServerSupabaseClient()
        const { error: serviceError } = await (supabase as any)
          .from('service_records')
          .insert({
            farm_id: userRole.farm_id,
            animal_id: createdAnimal.id,
            service_number: animalData.lactation_number || 1,
            service_date: animalData.service_date,
            service_type: animalData.service_method === 'artificial_insemination' ? 'artificial_insemination' : (animalData.service_method || 'artificial_insemination'),
            bull_tag_or_semen_code: null,
            expected_calving_date: animalData.expected_calving_date || null,
            notes: animalData.notes || null
          })
        
        if (serviceError) {
          console.error('❌ [API] Failed to create service_records record:', serviceError)
        } else {
          console.log('✅ [API] service_records record created for served animal')
        }
      } catch (error) {
        console.error('❌ [API] Error creating service_records record:', error)
      }
    }

    // ===== CREATE LACTATION_CYCLE_RECORDS FOR LACTATING/DRY ANIMALS (fallback) =====
    if (!hasUserServiceRecords && (finalProductionStatus === 'lactating' || finalProductionStatus === 'served' || finalProductionStatus === 'steaming_dry_cows' || finalProductionStatus === 'open_culling_dry_cows') && animalData.lactation_number) {
      console.log('🔍 [API] Creating lactation_cycle_records record...')
      
      try {
        const supabase = await createServerSupabaseClient()
        
        // Determine lactation cycle status based on production_status
        let cycleStatus: 'active' | 'completed' | 'culling dry'
        if (finalProductionStatus === 'lactating') {
          cycleStatus = 'active'
        } else if (finalProductionStatus === 'steaming_dry_cows' || finalProductionStatus === 'served') {
          cycleStatus = 'active'
        } else {
          cycleStatus = 'culling dry'
        }

        // For lactating animals, use provided days_in_milk or estimate
        let startDate = new Date()
        if (finalProductionStatus === 'lactating' && animalData.days_in_milk) {
          startDate = new Date()
          startDate.setDate(startDate.getDate() - animalData.days_in_milk)
        }

        const { error: lactationError } = await (supabase as any)
          .from('lactation_cycle_records')
          .insert({
            farm_id: userRole.farm_id,
            animal_id: createdAnimal.id,
            lactation_number: animalData.lactation_number,
            start_date: startDate.toISOString().split('T')[0],
            expected_end_date: animalData.expected_calving_date || new Date(new Date().getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: cycleStatus,
            current_average_production: animalData.current_daily_production || null,
            days_in_milk: animalData.days_in_milk || (finalProductionStatus === 'lactating' ? 60 : null),
            notes: animalData.notes || null
          })
        
        if (lactationError) {
          console.error('❌ [API] Failed to create lactation_cycle_records record:', lactationError)
        } else {
          console.log('✅ [API] lactation_cycle_records record created')
        }
      } catch (error) {
        console.error('❌ [API] Error creating lactation_cycle_records record:', error)
      }
    }

    // ===== AUTO-GENERATE BREEDING RECORDS =====
    // Check if animal is of breeding age
    if (animalData.birth_date && animalData.gender === 'female') {
      const supabase = await createServerSupabaseClient()
      
      // Get breeding settings
      const { data: breedingSettingsResult } = await supabase
        .from('farm_breeding_settings')
        .select('*')
        .eq('farm_id', farm_id)
        .single()
      
      // Cast to any to avoid "property does not exist on type 'never'" error
      const breedingSettings = breedingSettingsResult as any

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
      
      if (!hasUserServiceRecords && isBreedingAge && hasBreedingData) {
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
        // Cast supabase to any to fix type error on insert
        const { data: weightRequirement, error: weightError } = await (supabase as any)
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
      
      if (initialWeight && ageDays >= 0) {
        const supabase = await createServerSupabaseClient()
        const measurementPurpose = animalData.animal_source === 'newborn_calf' ? 'birth' : 'purchase'
        
        // Cast supabase to any
        const { error: initialWeightError } = await (supabase as any)
          .from('animal_weight_records')
          .insert({
            animal_id: createdAnimal.id,
            farm_id: userRole.farm_id,
            weight_kg: initialWeight,
            weight_date: referenceDate.toISOString().split('T')[0],
            measurement_purpose: measurementPurpose,
            measured_by: user.id,
            notes: `Initial ${measurementPurpose} weight`,
            weight_unit: 'kg'
          })
        
        if (initialWeightError) {
          console.error('⚠️ [API] Failed to record initial weight:', initialWeightError)
        } else {
          console.log('✅ [API] Initial weight recorded:', initialWeight, 'kg on', referenceDate.toISOString().split('T')[0])
        }
      }
      
      if (hasCurrentWeight && ageDays >= 0) {
        const supabase = await createServerSupabaseClient()
        
        // Cast supabase to any
        const { error: currentWeightError } = await (supabase as any)
          .from('animal_weight_records')
          .insert({
            animal_id: createdAnimal.id,
            farm_id: userRole.farm_id,
            weight_kg: animalData.weight,
            weight_date: now.toISOString().split('T')[0],
            measurement_purpose: 'routine',
            measured_by: user.id,
            notes: 'Current weight at registration',
            weight_unit: 'kg'
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
        // Cast to any for the update
        await (supabase as any)
          .from('animals_requiring_health_attention')
          .update({
            // Cast healthRecord to any to fix "Property 'id' does not exist on type 'never'"
            health_record_id: (healthRecord as any)?.id || null,
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
    // ✅ NOW: Creates current cycle + all past completed cycles based on breeding cycle number
    if (data.production_status === 'served' && data.service_date && data.lactation_number) {
      console.log('✅ [AUTO-BREEDING] Scenario: SERVED - Creating complete breeding history up to current cycle')
      console.log('🔄 [AUTO-BREEDING] Breeding cycle number:', data.lactation_number)
      
      breedingData = {
        animal_id: animalId,
        farm_id: farmId,
        cycles: [] // Will hold all breeding cycles
      }
      
      const postpartumDelay = breedingSettings?.postpartum_breeding_delay_days || 60
      
      // ===== CALCULATE CURRENT CYCLE DATES =====
      const currentServiceDate = new Date(data.service_date)
      const currentServiceDateStr = data.service_date
      
      // ===== GENERATE ALL PAST COMPLETED CYCLES (1 through lactation_number - 1) =====
      // Work backwards from current cycle service date, accounting for postpartum delay
      
      // Next cycle's service date (for calculating previous cycle)
      let nextCycleServiceDate = currentServiceDate
      
      for (let i = data.lactation_number - 1; i >= 1; i--) {
        // ✅ Updated logic: Calving must be postpartumDelay days BEFORE the next cycle's service
        // This ensures proper recovery time
        const calvingDate = new Date(nextCycleServiceDate.getTime() - postpartumDelay * 24 * 60 * 60 * 1000)
        const calvingDateStr = calvingDate.toISOString().split('T')[0]
        
        // Calculate service date for THIS cycle (gestation before calving)
        const breedingDate = new Date(calvingDate.getTime() - gestationPeriod * 24 * 60 * 60 * 1000)
        const breedingDateStr = breedingDate.toISOString().split('T')[0]
        
        // Heat detection 3 days before service
        const heatDate = new Date(breedingDate.getTime() - 3 * 24 * 60 * 60 * 1000)
        const heatDateStr = heatDate.toISOString()
        
        // Pregnancy check ~45 days after service
        const pregnancyCheckDate = new Date(breedingDate.getTime() + pregnancyCheckDays * 24 * 60 * 60 * 1000)
        const pregnancyCheckDateStr = pregnancyCheckDate.toISOString().split('T')[0]

        const cycle = {
          lactationNumber: i,
          isCurrentLactation: false,
          calvingDate: calvingDateStr,
          breedingDate: breedingDateStr,
          heatDate: heatDateStr,
          pregnancyCheckDate: pregnancyCheckDateStr,
          breeding_type: data.service_method === 'artificial_insemination' ? 'artificial_insemination' : 'artificial_insemination',
          notes: `🤖 Auto-generated from registration (Past Lactation #${i} - Calved ${calvingDateStr}, ${postpartumDelay} days before Cycle #${i + 1} service)`,
          auto_generated: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        
        breedingData.cycles.push(cycle)
        console.log(`📅 [AUTO-BREEDING] Past Lactation #${i}: Calving=${calvingDateStr}, Breeding=${breedingDateStr}, (${postpartumDelay} days before Cycle #${i + 1} service)`)
        
        // For next iteration, THIS cycle's service becomes the reference
        nextCycleServiceDate = breedingDate
      }
      
      // Add CURRENT cycle (currently SERVED, pending pregnancy confirmation)
      const expectedCalving = data.expected_calving_date || 
        new Date(currentServiceDate.getTime() + gestationPeriod * 24 * 60 * 60 * 1000)
          .toISOString().split('T')[0]
      const heatDate = new Date(currentServiceDate.getTime() - 3 * 24 * 60 * 60 * 1000)
      const heatDateStr = heatDate.toISOString()
      const pregnancyCheckDate = new Date(currentServiceDate.getTime() + pregnancyCheckDays * 24 * 60 * 60 * 1000)
      const pregnancyCheckDateStr = pregnancyCheckDate.toISOString().split('T')[0]

      const currentCycle = {
        lactationNumber: data.lactation_number,
        isCurrentLactation: true,
        calvingDate: expectedCalving,
        breedingDate: currentServiceDateStr,
        heatDate: heatDateStr,
        pregnancyCheckDate: pregnancyCheckDateStr,
        breeding_type: data.service_method === 'artificial_insemination' ? 'artificial_insemination' : 'artificial_insemination',
        notes: `🤖 Auto-generated from registration (Served - Cycle #${data.lactation_number})`,
        auto_generated: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      breedingData.cycles.push(currentCycle)
      console.log(`📅 [AUTO-BREEDING] Current SERVED Cycle #${data.lactation_number}: Breeding=${currentServiceDateStr}, Expected Calving=${expectedCalving}`)
    }
    
    // Scenario 2: DRY Status (Confirmed pregnant)
    // ✅ NOW: Creates all completed cycles + current cycle with confirmed pregnancy
    else if (data.production_status === 'dry' && data.expected_calving_date && data.lactation_number) {
      console.log('✅ [AUTO-BREEDING] Scenario: DRY - Creating complete breeding history including current cycle')
      console.log('🔄 [AUTO-BREEDING] Breeding cycle number:', data.lactation_number)
      
      breedingData = {
        animal_id: animalId,
        farm_id: farmId,
        cycles: [] // Will hold all breeding cycles
      }
      
      const postpartumDelay = breedingSettings?.postpartum_breeding_delay_days || 60
      
      // ===== CALCULATE CURRENT CYCLE DATES =====
      const currentCalvingDate = new Date(data.expected_calving_date)
      const currentCalvingDateStr = data.expected_calving_date
      const currentServiceDate = new Date(currentCalvingDate.getTime() - gestationPeriod * 24 * 60 * 60 * 1000)
      const currentServiceDateStr = currentServiceDate.toISOString().split('T')[0]
      
      // ===== GENERATE ALL PAST COMPLETED CYCLES (1 through lactation_number - 1) =====
      // Work backwards from current cycle service date, accounting for postpartum delay
      
      // Next cycle's service date (for calculating previous cycle)
      let nextCycleServiceDate = currentServiceDate
      
      for (let i = data.lactation_number - 1; i >= 1; i--) {
        // ✅ Updated logic: Calving must be postpartumDelay days BEFORE the next cycle's service
        const calvingDate = new Date(nextCycleServiceDate.getTime() - postpartumDelay * 24 * 60 * 60 * 1000)
        const calvingDateStr = calvingDate.toISOString().split('T')[0]
        
        // Calculate service date for THIS cycle (gestation before calving)
        const breedingDate = new Date(calvingDate.getTime() - gestationPeriod * 24 * 60 * 60 * 1000)
        const breedingDateStr = breedingDate.toISOString().split('T')[0]
        
        // Heat detection 3 days before service
        const heatDate = new Date(breedingDate.getTime() - 3 * 24 * 60 * 60 * 1000)
        const heatDateStr = heatDate.toISOString()
        
        // Pregnancy check ~45 days after service
        const pregnancyCheckDate = new Date(breedingDate.getTime() + pregnancyCheckDays * 24 * 60 * 60 * 1000)
        const pregnancyCheckDateStr = pregnancyCheckDate.toISOString().split('T')[0]

        const cycle = {
          lactationNumber: i,
          isCurrentLactation: false,
          calvingDate: calvingDateStr,
          breedingDate: breedingDateStr,
          heatDate: heatDateStr,
          pregnancyCheckDate: pregnancyCheckDateStr,
          breeding_type: data.service_method === 'artificial_insemination' ? 'artificial_insemination' : 'artificial_insemination',
          notes: `🤖 Auto-generated from registration (Past Lactation #${i} - Calved ${calvingDateStr}, ${postpartumDelay} days before Cycle #${i + 1} service)`,
          auto_generated: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        
        breedingData.cycles.push(cycle)
        console.log(`📅 [AUTO-BREEDING] Past Lactation #${i}: Calving=${calvingDateStr}, Breeding=${breedingDateStr}, (${postpartumDelay} days before Cycle #${i + 1} service)`)
        
        // For next iteration, THIS cycle's service becomes the reference
        nextCycleServiceDate = breedingDate
      }
      
      // Add CURRENT cycle (currently DRY, confirmed pregnant, awaiting calving)
      const heatDate = new Date(currentServiceDate.getTime() - 3 * 24 * 60 * 60 * 1000)
      const heatDateStr = heatDate.toISOString()
      const pregnancyCheckDate = new Date(currentServiceDate.getTime() + pregnancyCheckDays * 24 * 60 * 60 * 1000)
      const pregnancyCheckDateStr = pregnancyCheckDate.toISOString().split('T')[0]

      const currentCycle = {
        lactationNumber: data.lactation_number,
        isCurrentLactation: true,
        calvingDate: currentCalvingDateStr,
        breedingDate: currentServiceDateStr,
        heatDate: heatDateStr,
        pregnancyCheckDate: pregnancyCheckDateStr,
        breeding_type: data.service_method === 'artificial_insemination' ? 'artificial_insemination' : 'artificial_insemination',
        notes: `🤖 Auto-generated from registration (Dry/Pregnant - Cycle #${data.lactation_number})`,
        auto_generated: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      breedingData.cycles.push(currentCycle)
      console.log(`📅 [AUTO-BREEDING] Current DRY Cycle #${data.lactation_number}: Breeding=${currentServiceDateStr}, Expected Calving=${currentCalvingDateStr}`)
      
      // Construct pregnancyData for insertion loop
      const currentDryCycle = breedingData.cycles[breedingData.cycles.length - 1]
      pregnancyData = {
        animal_id: animalId,
        farm_id: farmId,
        pregnancy_status: 'confirmed',
        confirmed_date: currentDryCycle.pregnancyCheckDate,
        confirmation_method: 'rectal_palpation',
        expected_calving_date: currentDryCycle.calvingDate,
        gestation_length: gestationPeriod,
        pregnancy_notes: `Auto-generated from registration. Animal is dry and confirmed pregnant (Cycle #${data.lactation_number}).`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        _cycles: breedingData.cycles // Store cycles for event creation
      }
    }
    
    // Scenario 1b: SERVED Status - set pregnancyData after cycles created
    if (data.production_status === 'served' && breedingData?.cycles) {
      console.log('✅ [AUTO-BREEDING] Setting pregnancyData for SERVED animal')
      const currentServedCycle = breedingData.cycles[breedingData.cycles.length - 1]
      
      pregnancyData = {
        animal_id: animalId,
        farm_id: farmId,
        pregnancy_status: 'suspected',
        expected_calving_date: currentServedCycle.calvingDate,
        gestation_length: gestationPeriod,
        pregnancy_notes: `Auto-generated from registration. Animal is served and awaiting pregnancy confirmation (Cycle #${data.lactation_number}).`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        _cycles: breedingData.cycles // Store cycles for event creation
      }
    }
    
    // Scenario 3: LACTATING Status (Already calved - comprehensive breeding history for ALL lactations)
    else if (data.production_status === 'lactating' && data.lactation_number && data.lactation_number > 0) {
      console.log('✅ [AUTO-BREEDING] Scenario: LACTATING - Creating complete breeding history for', data.lactation_number, 'lactation cycles')
      
      const today = new Date()
      const daysInMilk = data.days_in_milk || 60 // Default assumption
      const postpartumDelay = breedingSettings?.postpartum_breeding_delay_days || 60
      
      // ===== GENERATE BREEDING DATA FOR EACH LACTATION CYCLE =====
      // Store all cycles for later processing
      breedingData = {
        animal_id: animalId,
        farm_id: farmId,
        cycles: [] // Will hold all breeding cycles
      }
      
      // For each lactation, generate a complete breeding cycle
      for (let i = data.lactation_number; i >= 1; i--) {
        const isCurrentLactation = i === data.lactation_number
        
        // Calculate days back from today for this lactation
        // Current lactation: Today - DIM
        // Previous lactations: Need to account for gestation + postpartum + previous DIM
        let calvingDate
        
        if (isCurrentLactation) {
          // Current lactation: calved DIM days ago
          calvingDate = new Date(today.getTime() - daysInMilk * 24 * 60 * 60 * 1000)
        } else {
          // Previous lactations: work backwards
          // Each complete cycle = gestation (280) + postpartum (60) + average DIM for that lactation (estimate 305 days)
          const cycleLength = gestationPeriod + postpartumDelay + 305 // ~645 days per cycle
          const cyclesBack = data.lactation_number - i
          calvingDate = new Date(today.getTime() - daysInMilk * 24 * 60 * 60 * 1000 - (cyclesBack * cycleLength * 24 * 60 * 60 * 1000))
        }
        
        const calvingDateStr = calvingDate.toISOString().split('T')[0]
        
        // Breeding date: Calving date - Gestation period
        const breedingDate = new Date(calvingDate.getTime() - gestationPeriod * 24 * 60 * 60 * 1000)
        const breedingDateStr = breedingDate.toISOString().split('T')[0]
        
        // Heat detection: 3 days before breeding
        const heatDate = new Date(breedingDate.getTime() - 3 * 24 * 60 * 60 * 1000)
        const heatDateStr = heatDate.toISOString()
        
        // Pregnancy check: ~45 days after breeding
        const pregnancyCheckDate = new Date(breedingDate.getTime() + pregnancyCheckDays * 24 * 60 * 60 * 1000)
        const pregnancyCheckDateStr = pregnancyCheckDate.toISOString().split('T')[0]

        const cycle = {
          lactationNumber: i,
          isCurrentLactation: isCurrentLactation,
          calvingDate: calvingDateStr,
          breedingDate: breedingDateStr,
          heatDate: heatDateStr,
          pregnancyCheckDate: pregnancyCheckDateStr,
          breeding_type: 'artificial_insemination',
          notes: `🤖 Auto-generated from registration (Lactation #${i}${isCurrentLactation ? ` - Current, ${daysInMilk} DIM` : ''})`,
          auto_generated: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        
        breedingData.cycles.push(cycle)
        
        console.log(`📅 [AUTO-BREEDING] Lactation #${i} cycle: Breeding=${breedingDateStr}, Calving=${calvingDateStr}`)
      }
      
      // Use the current lactation (first in array after sorting) for primary breeding data
      const currentCycle = breedingData.cycles[0]
      
      pregnancyData = {
        animal_id: animalId,
        farm_id: farmId,
        pregnancy_status: 'completed',
        confirmed_date: currentCycle.pregnancyCheckDate,
        confirmation_method: 'ultrasound',
        expected_calving_date: currentCycle.calvingDate,
        actual_calving_date: currentCycle.calvingDate,
        gestation_length: gestationPeriod,
        pregnancy_notes: `Auto-generated from registration. Animal is now lactating (${daysInMilk} DIM). Lactation #${data.lactation_number}.`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        _cycles: breedingData.cycles // Store cycles for event creation
      }
    }

    // Insert breeding and pregnancy records if generated
    if (breedingData && pregnancyData) {
      console.log('💾 [AUTO-BREEDING] Inserting breeding records...')
      
      // Track all created records
      let lastBreedingRecord = null
      let lastPregnancyRecord = null
      const cycles = pregnancyData._cycles || (breedingData.cycles ? breedingData.cycles : [])
      
      // Handle LACTATING scenarios with multiple cycles
      if (cycles && cycles.length > 0) {
        console.log(`🔄 [AUTO-BREEDING] Processing ${cycles.length} lactation cycles...`)
        
        // Process each lactation cycle (iterate in reverse so current is last)
        for (const cycle of cycles) {
          console.log(`📝 [AUTO-BREEDING] Processing Lactation #${cycle.lactationNumber}`)
          
          // 1. Create BREEDING RECORD for this cycle
          const breedingRecordData = {
            animal_id: animalId,
            farm_id: farmId,
            breeding_type: cycle.breeding_type,
            breeding_date: cycle.breedingDate,
            notes: cycle.notes,
            auto_generated: cycle.auto_generated,
            created_at: cycle.created_at,
            updated_at: cycle.updated_at
          }
          
          const { data: breedingRecord, error: breedingError } = await (supabase as any)
            .from('service_records')
            .insert(breedingRecordData)
            .select()
            .single()

          if (breedingError) {
            console.error('❌ [AUTO-BREEDING] Failed to insert breeding record for cycle', cycle.lactationNumber, breedingError)
            continue
          }

          console.log(`✅ [AUTO-BREEDING] Breeding record #${cycle.lactationNumber} created:`, breedingRecord.id)
          lastBreedingRecord = breedingRecord

          // 2. Create HEAT DETECTION event
          const heatEvent = {
            farm_id: farmId,
            animal_id: animalId,
            event_type: 'heat_detection',
            event_date: cycle.heatDate,
            heat_signs: ['standing_heat', 'tail_raising', 'mucus_discharge'],
            heat_action_taken: 'insemination_scheduled',
            notes: `🤖 Auto-generated Lactation #${cycle.lactationNumber} heat detection`,
            created_by: userId
          }

          const { error: heatError } = await (supabase as any)
            .from('breeding_events')
            .insert(heatEvent)

          if (heatError) {
            console.error('❌ [AUTO-BREEDING] Failed to create heat detection for cycle', cycle.lactationNumber, heatError)
          } else {
            console.log(`✅ [AUTO-BREEDING] Heat detection event #${cycle.lactationNumber} created`)
          }

          // 3. Create INSEMINATION event
          const inseminationEvent = {
            farm_id: farmId,
            animal_id: animalId,
            event_type: 'insemination',
            event_date: cycle.breedingDate,
            insemination_method: cycle.breeding_type,
            semen_bull_code: 'AUTO_GEN_' + Math.random().toString(36).substr(2, 9).toUpperCase(),
            technician_name: 'Auto-System',
            notes: `🤖 Auto-generated Lactation #${cycle.lactationNumber} insemination`,
            created_by: userId 
          }

          const { error: insemError } = await (supabase as any)
            .from('breeding_events')
            .insert(inseminationEvent)

          if (insemError) {
            console.error('❌ [AUTO-BREEDING] Failed to create insemination for cycle', cycle.lactationNumber, insemError)
          } else {
            console.log(`✅ [AUTO-BREEDING] Insemination event #${cycle.lactationNumber} created`)
          }

          // 4. Create PREGNANCY RECORD for this cycle
          // ✅ UPDATED: Handle SERVED/DRY/LACTATING differently for current vs past cycles
          let pregnancyStatus = 'completed' // Default for past cycles
          let confirmedDate = cycle.pregnancyCheckDate
          let actualCalvingDate = cycle.calvingDate
          let pregnancyNotes = ''
          
          // For current cycle in SERVED status
          if (data.production_status === 'served' && cycle.isCurrentLactation) {
            pregnancyStatus = 'suspected'
            confirmedDate = null
            actualCalvingDate = null
            pregnancyNotes = `Auto-generated Served Status. Animal recently serviced, awaiting pregnancy confirmation (Cycle #${cycle.lactationNumber}).`
          }
          // For current cycle in DRY status
          else if (data.production_status === 'dry' && cycle.isCurrentLactation) {
            pregnancyStatus = 'confirmed'
            confirmedDate = cycle.pregnancyCheckDate
            actualCalvingDate = null // Not calved yet
            pregnancyNotes = `Auto-generated Dry Status. Animal confirmed pregnant, awaiting calving (Cycle #${cycle.lactationNumber}).`
          }
          // For past cycles in any status
          else if (!cycle.isCurrentLactation) {
            pregnancyStatus = 'completed'
            confirmedDate = cycle.pregnancyCheckDate
            actualCalvingDate = cycle.calvingDate
            pregnancyNotes = `Auto-generated historical cycle (Lactation #${cycle.lactationNumber}). Previous lactation cycle.`
          }
          // For current cycle in LACTATING status
          else {
            pregnancyStatus = 'completed'
            confirmedDate = cycle.pregnancyCheckDate
            actualCalvingDate = cycle.calvingDate
            pregnancyNotes = `Auto-generated Lactation #${cycle.lactationNumber}. Currently in lactation (${data.days_in_milk || 60} DIM).`
          }

          const pregnancyRecordData = {
            animal_id: animalId,
            farm_id: farmId,
            breeding_record_id: breedingRecord.id,
            pregnancy_status: pregnancyStatus,
            confirmed_date: confirmedDate,
            confirmation_method: pregnancyStatus === 'suspected' ? null : (pregnancyStatus === 'confirmed' ? 'rectal_palpation' : 'ultrasound'),
            expected_calving_date: cycle.calvingDate,
            actual_calving_date: actualCalvingDate,
            gestation_length: gestationPeriod,
            pregnancy_notes: pregnancyNotes,
            created_at: cycle.created_at,
            updated_at: cycle.updated_at
          }

          const { data: pregnancyRecord, error: pregnancyError } = await (supabase as any)
            .from('pregnancy_records')
            .insert(pregnancyRecordData)
            .select()
            .single()

          if (pregnancyError) {
            console.error('❌ [AUTO-BREEDING] Failed to insert pregnancy record for cycle', cycle.lactationNumber, pregnancyError)
            continue
          }

          console.log(`✅ [AUTO-BREEDING] Pregnancy record #${cycle.lactationNumber} created:`, pregnancyRecord.id)
          lastPregnancyRecord = pregnancyRecord

          // 5. Create PREGNANCY CHECK event
          // ✅ UPDATED: Only create for confirmed/completed pregnancies, not for SERVED current (awaiting check)
          const shouldCreatePregnancyCheck = (data.production_status !== 'served') || !cycle.isCurrentLactation
          
          if (shouldCreatePregnancyCheck) {
            const pregnancyCheckEvent = {
              farm_id: farmId,
              animal_id: animalId,
              event_type: 'pregnancy_check',
              event_date: cycle.pregnancyCheckDate,
              pregnancy_result: 'pregnant',
              examination_method: (data.production_status === 'dry' && cycle.isCurrentLactation) ? 'rectal_palpation' : 'ultrasound',
              veterinarian_name: 'Auto-System',
              estimated_due_date: cycle.calvingDate,
              notes: `🤖 Auto-generated Lactation #${cycle.lactationNumber} pregnancy confirmation`,
              created_by: userId 
            }

            const { error: pregnancyEventError } = await (supabase as any)
              .from('breeding_events')
              .insert(pregnancyCheckEvent)

            if (pregnancyEventError) {
              console.error('❌ [AUTO-BREEDING] Failed to create pregnancy check for cycle', cycle.lactationNumber, pregnancyEventError)
            } else {
              console.log(`✅ [AUTO-BREEDING] Pregnancy check event #${cycle.lactationNumber} created`)
            }
          } else {
            console.log(`ℹ️ [AUTO-BREEDING] Skipping pregnancy check for SERVED current cycle #${cycle.lactationNumber} (scheduled for ${cycle.pregnancyCheckDate})`)
          }

          // 6. Create CALVING event and record
          // ✅ UPDATED: Only create calving records for cycles that have already calved
          // Skip for SERVED/DRY current cycles as they haven't calved yet
          const hasCalved = (data.production_status === 'lactating') || 
                           (data.production_status === 'served' && !cycle.isCurrentLactation) ||
                           (data.production_status === 'dry' && !cycle.isCurrentLactation)
          
          if (hasCalved) {
            const calvingEvent = {
              farm_id: farmId,
              animal_id: animalId,
              event_type: 'calving',
              event_date: cycle.calvingDate,
              calving_outcome: 'normal',
              calf_gender: Math.random() > 0.5 ? 'female' : 'male',
              calf_weight: parseFloat((40 + Math.random() * 10).toFixed(2)), // 40-50 kg
              calf_health_status: 'healthy',
              notes: `🤖 Auto-generated Lactation #${cycle.lactationNumber} calving`,
              created_by: userId
            }

            const { error: calvingEventError } = await (supabase as any)
              .from('breeding_events')
              .insert(calvingEvent)

            if (calvingEventError) {
              console.error('❌ [AUTO-BREEDING] Failed to create calving event for cycle', cycle.lactationNumber, calvingEventError)
            } else {
              console.log(`✅ [AUTO-BREEDING] Calving event #${cycle.lactationNumber} created`)
            }

            // 7. Create CALVING RECORD
            const calvingRecord = {
              pregnancy_record_id: pregnancyRecord.id,
              mother_id: animalId,
              farm_id: farmId,
              calving_date: cycle.calvingDate,
              calving_time: '12:00:00', // Noon default
              calving_difficulty: 'normal',
              assistance_required: false,
              veterinarian: null,
              complications: null,
              birth_weight: calvingEvent.calf_weight,
              calf_gender: calvingEvent.calf_gender,
              calf_alive: true,
              calf_health_status: 'healthy',
              colostrum_quality: 'excellent',
              notes: `🤖 Auto-generated Lactation #${cycle.lactationNumber} from registration`,
              created_at: cycle.created_at,
              updated_at: cycle.updated_at
            }

            const { error: calvingRecordError, data: calvingRecordData } = await (supabase as any)
              .from('calving_records')
              .insert(calvingRecord)
              .select()
              .single()

            if (calvingRecordError) {
              console.error('❌ [AUTO-BREEDING] Failed to create calving record for cycle', cycle.lactationNumber, calvingRecordError)
            } else {
              console.log(`✅ [AUTO-BREEDING] Calving record #${cycle.lactationNumber} created:`, calvingRecordData?.id)
            }
          } else {
            console.log(`ℹ️ [AUTO-BREEDING] Skipping calving record for cycle #${cycle.lactationNumber} (not yet calved)`)
          }
        }

        console.log(`✅ [AUTO-BREEDING] All ${cycles.length} lactation cycles processed with complete breeding history`)
      }

      return {
        breedingRecord: lastBreedingRecord,
        pregnancyRecord: lastPregnancyRecord,
        lactationsCycles: cycles.length
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

// Map animal health_status to calf_records.health_status enum (healthy | weak | sick | deceased)
function calfHealthStatus(status?: string): string | null {
  const map: Record<string, string> = {
    healthy: 'healthy',
    sick: 'sick',
    requires_attention: 'weak',
    quarantined: 'sick',
    weak: 'weak',
    deceased: 'deceased',
  }
  return status ? (map[status.toLowerCase()] ?? null) : null
}