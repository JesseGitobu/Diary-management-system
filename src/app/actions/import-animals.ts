// app/actions/import-animals.ts (Mapped to your database schema)
'use server'

import { createServerActionClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

interface ImportAnimal {
  tag_number: string
  name?: string
  breed?: string
  gender: 'male' | 'female'
  date_of_birth?: string
  birth_time?: string  // HH:MM format for newborn calves
  birth_difficulty_level?: string  // normal, assisted, difficult, cesarean
  animal_source: 'newborn_calf' | 'purchased_animal'
  previous_farm_tag_number?: string  // For purchased animals
  
  // Lineage (Layer 1 - correctable)
  mother_dam_tag?: string
  mother_dam_name?: string
  father_sire_semen_tag?: string
  father_sire_name_semen_source?: string
  
  birth_weight_kg?: number
  current_weight_kg?: number
  weighing_date?: string  // YYYY-MM-DD format for weight measurement date
  
  // Purchased animal fields (Layer 3 lineage snapshot)
  farm_seller_name?: string
  farm_seller_contact?: string
  purchase_date?: string
  purchase_price?: number
  
  production_status?: 'calf' | 'heifer' | 'bull' | 'served' | 'lactating' | 'steaming_dry_cows' | 'open_culling_dry_cows'
  health_status?: string
  notes?: string
  
  // Production cycles (1-7)
  service_date_1?: string; service_method_1?: string; outcome_1?: string; bull_tag_semen_code_1?: string; bull_name_semen_source_1?: string; ai_technician_1?: string; steaming_date_1?: string; expected_calving_date_1?: string; actual_calving_date_1?: string; calving_time_1?: string; calving_outcome_1?: string; colostrum_produced_1?: string; days_in_milk_1?: number;
  
  service_date_2?: string; service_method_2?: string; outcome_2?: string; bull_tag_semen_code_2?: string; bull_name_semen_source_2?: string; ai_technician_2?: string; steaming_date_2?: string; expected_calving_date_2?: string; actual_calving_date_2?: string; calving_time_2?: string; calving_outcome_2?: string; colostrum_produced_2?: string; days_in_milk_2?: number;
  
  service_date_3?: string; service_method_3?: string; outcome_3?: string; bull_tag_semen_code_3?: string; bull_name_semen_source_3?: string; ai_technician_3?: string; steaming_date_3?: string; expected_calving_date_3?: string; actual_calving_date_3?: string; calving_time_3?: string; calving_outcome_3?: string; colostrum_produced_3?: string; days_in_milk_3?: number;
  
  service_date_4?: string; service_method_4?: string; outcome_4?: string; bull_tag_semen_code_4?: string; bull_name_semen_source_4?: string; ai_technician_4?: string; steaming_date_4?: string; expected_calving_date_4?: string; actual_calving_date_4?: string; calving_time_4?: string; calving_outcome_4?: string; colostrum_produced_4?: string; days_in_milk_4?: number;
  
  service_date_5?: string; service_method_5?: string; outcome_5?: string; bull_tag_semen_code_5?: string; bull_name_semen_source_5?: string; ai_technician_5?: string; steaming_date_5?: string; expected_calving_date_5?: string; actual_calving_date_5?: string; calving_time_5?: string; calving_outcome_5?: string; colostrum_produced_5?: string; days_in_milk_5?: number;
  
  service_date_6?: string; service_method_6?: string; outcome_6?: string; bull_tag_semen_code_6?: string; bull_name_semen_source_6?: string; ai_technician_6?: string; steaming_date_6?: string; expected_calving_date_6?: string; actual_calving_date_6?: string; calving_time_6?: string; calving_outcome_6?: string; colostrum_produced_6?: string; days_in_milk_6?: number;
  
  service_date_7?: string; service_method_7?: string; outcome_7?: string; bull_tag_semen_code_7?: string; bull_name_semen_source_7?: string; ai_technician_7?: string; steaming_date_7?: string; expected_calving_date_7?: string; actual_calving_date_7?: string; calving_time_7?: string; calving_outcome_7?: string; colostrum_produced_7?: string; days_in_milk_7?: number;
}

interface ImportResult {
  success: boolean
  imported: number
  skipped: number
  animals: any[]
  errors: string[]
  message?: string
}

export async function importAnimalsActionWithAuth(
  farmId: string,
  animals: ImportAnimal[]
): Promise<ImportResult> {
  try {
    console.log('🚀 Starting authenticated import for farm:', farmId)

    // Authentication logic (same as before)
    let user = null
    let supabase = null

    try {
      const cookieStore = await cookies()
      supabase = createServerActionClient({ cookies: () => Promise.resolve(cookieStore) })
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      
      if (authUser && !authError) {
        user = authUser
        console.log('✅ Authentication successful via server action client:', user.id)
      } else {
        console.log('⚠️ Server action auth failed:', authError?.message)
      }
    } catch (serverActionError) {
      console.log('⚠️ Server action client error:', serverActionError)
    }

    // Fallback authentication method
    if (!user) {
      console.log('🔄 Trying fallback authentication method...')
      
      try {
        const cookieStore = await cookies()
        const allCookies = cookieStore.getAll()
        
        const authCookies = allCookies.filter(cookie => 
          cookie.name.includes('auth-token') || 
          cookie.name.includes('supabase') ||
          cookie.name.includes('sb-')
        )
        
        let accessToken = null
        for (const cookie of authCookies) {
          try {
            if (cookie.value.startsWith('base64-')) {
              const decoded = Buffer.from(cookie.value.substring(7), 'base64').toString()
              const parsed = JSON.parse(decoded)
              if (parsed.access_token) {
                accessToken = parsed.access_token
                break
              }
            } else if (cookie.value.includes('access_token')) {
              const parsed = JSON.parse(cookie.value)
              if (parsed.access_token) {
                accessToken = parsed.access_token
                break
              }
            }
          } catch (parseError) {
            console.log(`⚠️ Could not parse cookie ${cookie.name}:`, parseError)
          }
        }
        
        if (accessToken && process.env.SUPABASE_SERVICE_ROLE_KEY) {
          const serviceSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
              auth: { autoRefreshToken: false, persistSession: false }
            }
          )
          
          const { data: { user: tokenUser }, error: tokenError } = await serviceSupabase.auth.getUser(accessToken)
          
          if (tokenUser && !tokenError) {
            user = tokenUser
            supabase = serviceSupabase
            console.log('✅ Token verification successful:', user.id)
          }
        }
      } catch (fallbackError) {
        console.log('❌ Fallback authentication error:', fallbackError)
      }
    }

    if (!user || !supabase) {
      return {
        success: false,
        imported: 0,
        skipped: 0,
        animals: [],
        errors: ['Authentication failed. Please log out and log back in.'],
        message: 'Authentication required'
      }
    }

    // Verify farm access
    const { data: farmAccess, error: farmError } = await supabase
      .from('user_roles')
      .select('role_type')
      .eq('farm_id', farmId)
      .eq('user_id', user.id)
      .single()

    if (farmError || !farmAccess) {
      console.error('❌ Farm access error:', farmError)
      return {
        success: false,
        imported: 0,
        skipped: 0,
        animals: [],
        errors: ['Farm not found or access denied'],
        message: 'Access denied'
      }
    }

    const canAddAnimals = ['farm_owner', 'farm_manager', 'worker'].includes(farmAccess.role_type)
    if (!canAddAnimals) {
      return {
        success: false,
        imported: 0,
        skipped: 0,
        animals: [],
        errors: ['Insufficient permissions to add animals'],
        message: 'Permission denied'
      }
    }

    console.log('✅ Permissions verified:', farmAccess.role_type)

    // CRITICAL: Do global topological sort BEFORE splitting into batches
    // This ensures cross-batch parent-child relationships work correctly
    function sortAnimalsByDependency(animals: ImportAnimal[]) {
      const tagToAnimal = new Map(animals.map(a => [a.tag_number, a]))
      const sorted: ImportAnimal[] = []
      const visited = new Set<string>()

      function visit(animal: ImportAnimal) {
        if (visited.has(animal.tag_number)) return
        visited.add(animal.tag_number)

        // Visit mother first if she's in this import
        if (animal.mother_dam_tag && tagToAnimal.has(animal.mother_dam_tag)) {
          visit(tagToAnimal.get(animal.mother_dam_tag)!)
        }
        // Visit father first if he's in this import
        if (animal.father_sire_semen_tag && tagToAnimal.has(animal.father_sire_semen_tag)) {
          visit(tagToAnimal.get(animal.father_sire_semen_tag)!)
        }

        sorted.push(animal)
      }

      animals.forEach(a => visit(a))
      return sorted
    }

    const globalSortedAnimals = sortAnimalsByDependency(animals)
    console.log(`📊 Global topological sort: ${globalSortedAnimals.length} animals`)

    // ═══════════════════════════════════════════════════════════════════════════════
    // CRITICAL FIX: Two-phase global processing to ensure calves exist before PASS 2
    // ═══════════════════════════════════════════════════════════════════════════════
    const batchSize = 10
    const results = {
      imported: 0,
      skipped: 0,
      animals: [] as any[],
      errors: [] as string[]
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // GLOBAL PASS 1: Insert ALL animals across ALL batches
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n🔄 STARTING GLOBAL PASS 1: Inserting all animals...')
    const allInsertedAnimals: Array<{
      raw: ImportAnimal, 
      record: any,
      shouldCreateReleaseRecord: boolean,
      releaseReason: 'deceased' | 'sold' | null
    }> = []
    let globalParentTagMap = new Map<string, string>()
    const globalOriginalTagToGenerated = new Map<string, string>()

    for (let i = 0; i < globalSortedAnimals.length; i += batchSize) {
      const batch = globalSortedAnimals.slice(i, i + batchSize)
      const pass1Result = await processBatchPass1(
        supabase, 
        farmId, 
        batch, 
        user.id, 
        globalSortedAnimals,
        globalParentTagMap,
        globalOriginalTagToGenerated
      )
      
      results.imported += pass1Result.imported
      results.skipped += pass1Result.skipped
      results.animals.push(...pass1Result.animals)
      results.errors.push(...pass1Result.errors)
      allInsertedAnimals.push(...pass1Result.insertedAnimals)
    }
    console.log(`✅ GLOBAL PASS 1 COMPLETE: ${results.imported} animals inserted, ${results.skipped} skipped`)
    console.log(`📊 parentTagMap now contains ${globalParentTagMap.size} animals for calf resolution`)

    // ─────────────────────────────────────────────────────────────────────────────
    // GLOBAL PASS 2: Create all related records (now all animals exist!)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n🔄 STARTING GLOBAL PASS 2: Creating related records...')
    const pass2Errors: string[] = []

    for (const entry of allInsertedAnimals) {
      await processSingleAnimalPass2(
        supabase,
        farmId,
        globalSortedAnimals,
        entry,
        user.id,
        globalParentTagMap,
        globalOriginalTagToGenerated,
        pass2Errors
      )
    }
    console.log(`✅ GLOBAL PASS 2 COMPLETE`)
    results.errors.push(...pass2Errors)

    revalidatePath(`/farms/${farmId}/animals`)

    console.log('🎉 Import completed:', {
      imported: results.imported,
      skipped: results.skipped
    })

    return {
      success: true,
      imported: results.imported,
      skipped: results.skipped,
      animals: results.animals,
      errors: results.errors,
      message: `Successfully imported ${results.imported} animals`
    }

  } catch (error) {
    console.error('💥 Server action error:', error)
    return {
      success: false,
      imported: 0,
      skipped: 0,
      animals: [],
      errors: [`Server error: ${error}`],
      message: 'Import failed due to server error'
    }
  }
}

async function processBatchPass1(
  supabase: any,
  farmId: string,
  animals: ImportAnimal[],
  userId: string,
  allAnimals: ImportAnimal[],
  parentTagMap: Map<string, string>,
  originalTagToGenerated: Map<string, string>
) {
  const results = {
    imported: 0,
    skipped: 0,
    animals: [] as any[],
    errors: [] as string[],
    insertedAnimals: [] as Array<{raw: ImportAnimal, record: any, shouldCreateReleaseRecord: boolean, releaseReason: 'deceased' | 'sold' | null}>
  }

  try {
    // Build local dependency graph for this batch
    function sortAnimalsByDependency(animals: ImportAnimal[]) {
      const tagToAnimal = new Map(animals.map(a => [a.tag_number, a]))
      const sorted: ImportAnimal[] = []
      const visited = new Set<string>()

      function visit(animal: ImportAnimal) {
        if (visited.has(animal.tag_number)) return
        visited.add(animal.tag_number)

        if (animal.mother_dam_tag && tagToAnimal.has(animal.mother_dam_tag)) {
          visit(tagToAnimal.get(animal.mother_dam_tag)!)
        }
        if (animal.father_sire_semen_tag && tagToAnimal.has(animal.father_sire_semen_tag)) {
          visit(tagToAnimal.get(animal.father_sire_semen_tag)!)
        }

        sorted.push(animal)
      }

      animals.forEach(a => visit(a))
      return sorted
    }

    const sortedAnimals = sortAnimalsByDependency(animals)

    // Fetch existing animals for this batch check
    const { data: existingAnimals } = await supabase
      .from('animals')
      .select('tag_number, id')
      .eq('farm_id', farmId)

    const existingTags = new Set(existingAnimals?.map((a: any) => a.tag_number) || [])

    console.log(`🔄 PASS 1 batch: Inserting ${sortedAnimals.length} animals...`)

    for (const animal of sortedAnimals) {
      try {
        console.log(`🐄 Inserting animal: ${animal.tag_number}`)

        if (existingTags.has(animal.tag_number)) {
          results.skipped++
          results.errors.push(`Tag ${animal.tag_number} already exists`)
          continue
        }

        const sanitizedAnimal = sanitizeAnimalDataForYourSchema(animal, parentTagMap)
        
        if (!sanitizedAnimal) {
          results.skipped++
          results.errors.push(`Invalid data for tag ${animal.tag_number}`)
          continue
        }

        // Handle special health_status values
        let animalStatus: 'active' | 'sold' | 'deceased' | 'quarantined' = 'active'
        const healthStatusNormalized = sanitizedAnimal.health_status?.toLowerCase().trim() || ''
        let shouldCreateReleaseRecord = false
        let releaseReason: 'deceased' | 'sold' | null = null
        
        if (healthStatusNormalized === 'deceased') {
          animalStatus = 'deceased'
          shouldCreateReleaseRecord = true
          releaseReason = 'deceased'
          sanitizedAnimal.health_status = null
        } else if (healthStatusNormalized === 'released') {
          animalStatus = 'sold'
          shouldCreateReleaseRecord = true
          releaseReason = 'sold'
          sanitizedAnimal.health_status = null
        } else if (healthStatusNormalized === 'quarantine' || healthStatusNormalized === 'quarantined') {
          animalStatus = 'quarantined'
          sanitizedAnimal.health_status = 'quarantined'
        }

        const { data: newAnimal, error: insertError } = await supabase
          .from('animals')
          .insert({
            farm_id: farmId,
            tag_number: sanitizedAnimal.tag_number,
            name: sanitizedAnimal.name || null,
            breed: sanitizedAnimal.breed || null,
            gender: sanitizedAnimal.gender,
            birth_date: sanitizedAnimal.birth_date || null,
            animal_source: sanitizedAnimal.animal_source,
            mother_id: sanitizedAnimal.mother_id || null,
            father_id: sanitizedAnimal.father_id || null,
            mother_name: sanitizedAnimal.mother_name || null,
            father_info: sanitizedAnimal.father_info || null,
            production_status: sanitizedAnimal.production_status || 'calf',
            health_status: sanitizedAnimal.health_status || null,
            notes: sanitizedAnimal.notes || null,
            status: animalStatus,
            created_by: userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (insertError) {
          results.skipped++
          results.errors.push(`Failed to insert ${animal.tag_number}: ${insertError.message}`)
          console.error(`❌ Insert failed for ${animal.tag_number}:`, insertError)
          continue
        }

        // Add to global parentTagMap
        parentTagMap.set(newAnimal.tag_number, newAnimal.id)
        existingTags.add(newAnimal.tag_number)
        
        // Track original→generated mapping
        const originalTag = String(animal.tag_number || '').trim()
        if (originalTag && originalTag !== newAnimal.tag_number) {
          originalTagToGenerated.set(originalTag, newAnimal.tag_number)
          parentTagMap.set(originalTag, newAnimal.id)
        }
        
        // Store for PASS 2
        results.insertedAnimals.push({ 
          raw: animal, 
          record: newAnimal,
          shouldCreateReleaseRecord,
          releaseReason
        } as any)
        results.animals.push(newAnimal)

        console.log(`✅ Inserted animal: ${animal.tag_number} (id: ${newAnimal.id})`)

      } catch (error) {
        results.skipped++
        results.errors.push(`Error inserting ${animal.tag_number}: ${error}`)
        console.error(`💥 Error inserting ${animal.tag_number}:`, error)
      }
    }

    results.imported = results.insertedAnimals.length

  } catch (batchError) {
    results.errors.push(`Batch PASS 1 failed: ${batchError}`)
    console.error('💥 Batch PASS 1 error:', batchError)
  }

  return results
}

async function processSingleAnimalPass2(
  supabase: any,
  farmId: string,
  allAnimals: ImportAnimal[],
  entry: any,
  userId: string,
  parentTagMap: Map<string, string>,
  originalTagToGenerated: Map<string, string>,
  errors: string[]
) {
  const { raw: animal, record: newAnimal, shouldCreateReleaseRecord, releaseReason } = entry

  try {
    console.log(`📝 Creating records for: ${animal.tag_number}`)

    // Create purchase record if purchased animal
    if (animal.animal_source === 'purchased_animal') {
      await supabase
        .from('animal_purchases')
        .insert({
          farm_id: farmId,
          animal_id: newAnimal.id,
          previous_farm_tag: animal.previous_farm_tag_number || null,
          dam_tag_at_origin: animal.mother_dam_tag || null,
          dam_name_at_origin: animal.mother_dam_name || null,
          sire_tag_or_semen_code: animal.father_sire_semen_tag || null,
          sire_name_or_semen_source: animal.father_sire_name_semen_source || null,
          farm_seller_name: animal.farm_seller_name || null,
          farm_seller_contact: animal.farm_seller_contact || null,
          purchase_date: animal.purchase_date || null,
          purchase_price: animal.purchase_price || null,
          created_at: new Date().toISOString()
        })
        .then(() => console.log(`✅ Purchase record created for ${animal.tag_number}`))
        .catch((e: any) => console.warn(`⚠️ Purchase record failed for ${animal.tag_number}:`, e.message))
    }

    // Create weight record
    if (animal.current_weight_kg && animal.weighing_date) {
      await supabase
        .from('animal_weight_records')
        .insert({
          farm_id: farmId,
          animal_id: newAnimal.id,
          weight_date: animal.weighing_date,
          weight_kg: Number(animal.current_weight_kg),
          weight_unit: 'kg',
          measurement_purpose: 'import - current weight at import time',
          created_at: new Date().toISOString()
        })
        .then(() => console.log(`✅ Weight record created for ${animal.tag_number}`))
        .catch((e: any) => console.warn(`⚠️ Weight record failed for ${animal.tag_number}:`, e.message))
    }

    // Create release record if needed
    if (shouldCreateReleaseRecord && releaseReason) {
      const deathCause = releaseReason === 'deceased' ? 'imported - cause unknown' : null
      
      await supabase
        .from('animal_release_records')
        .insert({
          farm_id: farmId,
          animal_id: newAnimal.id,
          release_date: new Date().toISOString().split('T')[0],
          release_reason: releaseReason,
          death_cause: deathCause,
          veterinarian_notes: null,
          notes: `Animal imported with release status: ${releaseReason}. Status set to ${newAnimal.status}.`,
          created_at: new Date().toISOString(),
          created_by: userId
        })
        .then(() => console.log(`✅ Release record created for ${animal.tag_number} (reason: ${releaseReason})`))
        .catch((e: any) => console.warn(`⚠️ Release record failed for ${animal.tag_number}:`, e.message))
    }

    // Create production cycles
    if (animal.service_date_1) {
      await createProductionCycles(
        supabase,
        farmId,
        newAnimal.id,
        animal,
        userId,
        parentTagMap,
        allAnimals,
        originalTagToGenerated
      ).catch(e => {
        console.warn(`⚠️ Production cycles failed for ${animal.tag_number}:`, e.message)
        errors.push(`Production cycles failed for ${animal.tag_number}: ${e.message}`)
      })
    }

    console.log(`✅ Records created for: ${animal.tag_number}`)

  } catch (error) {
    console.error(`💥 Error creating records for ${animal.tag_number}:`, error)
    errors.push(`Error creating records for ${animal.tag_number}: ${error}`)
  }
}

/**
 * Helper: Normalize dates for consistent string comparison
 * Handles Date objects, ISO strings, and date strings
 */
function normalizeDate(d: any): string {
  if (!d) return ''
  if (d instanceof Date) return d.toISOString().split('T')[0]
  return String(d).split('T')[0]  // Handles ISO and date strings
}

/**
 * Helper: Parse calving time from various formats
 * Handles Excel time-only values (Date with 1899-12-30 epoch), ISO strings, and time strings
 */
function parseCalvingTime(rawTime: any): string | null {
  if (!rawTime) return null

  try {
    // Case 1: Date object (possibly Excel time-only with 1899-12-30 epoch)
    if (rawTime instanceof Date) {
      const isoString = rawTime.toISOString()
      // Check if it's the Excel epoch date (1899-12-30)
      if (isoString.startsWith('1899-12-30')) {
        // Extract time portion: "15:57:16"
        return isoString.split('T')[1]?.split('.')[0] || null
      }
      // Normal date - extract time
      return isoString.split('T')[1]?.split('.')[0] || null
    }

    // Case 2: ISO datetime string
    const strValue = String(rawTime)
    if (strValue.includes('T')) {
      return strValue.split('T')[1]?.split('.')[0] || null
    }

    // Case 3: Already a time string (HH:MM:SS or HH:MM)
    if (strValue.match(/^\d{1,2}:\d{2}(:\d{2})?$/)) {
      return strValue
    }

    // Case 4: Date.toString() representation like "Sat Dec 30 1899 15:57:16 GMT+0227"
    const timeMatch = strValue.match(/(\d{1,2}):(\d{2}):(\d{2})/)
    if (timeMatch) {
      return `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}:${timeMatch[3]}`
    }

    return null
  } catch (e) {
    console.warn(`⚠️ Failed to parse calving time "${rawTime}":`, e)
    return null
  }
}

/**
 * Creates production cycle records (service → pregnancy → calving → lactation → calf)
 * Supports up to 7 cycles per animal
 * Now finds calves born in the same import via mother_dam_tag + date_of_birth matching
 */
async function createProductionCycles(
  supabase: any,
  farmId: string,
  animalId: string,
  animal: ImportAnimal,
  userId: string,
  parentTagMap: Map<string, string>,
  allAnimals: ImportAnimal[],
  originalTagToGenerated: Map<string, string>
) {
  try {
    // Process cycles 1-7
    // Track lactation records for post-processing
  const lactationData: Array<{
    cycleNum: number
    calvingRecord: any
    actualCalvingDate: string
    pregnancyRecord: any
  }> = []

  for (let cycleNum = 1; cycleNum <= 7; cycleNum++) {
      const serviceDate = animal[`service_date_${cycleNum}` as keyof ImportAnimal] as string
      const outcome = animal[`outcome_${cycleNum}` as keyof ImportAnimal] as string
      
      if (!serviceDate) continue  // Skip empty cycles

      try {
        console.log(`  📊 Processing production cycle ${cycleNum}...`)

        // TABLE 3: Create service_records
        const serviceMethodRaw = animal[`service_method_${cycleNum}` as keyof ImportAnimal] as string
        const technicianName = animal[`ai_technician_${cycleNum}` as keyof ImportAnimal] as string
        const bullTag = animal[`bull_tag_semen_code_${cycleNum}` as keyof ImportAnimal] as string || ''
        
        // Determine service_type from service_method field
        let serviceType: 'natural' | 'artificial_insemination' | 'embryo_transfer' = 'natural'
        
        if (serviceMethodRaw) {
          const method = String(serviceMethodRaw).toLowerCase().trim()
          if (method.includes('artificial') || method.includes('ai')) {
            serviceType = 'artificial_insemination'
          } else if (method.includes('embryo') || method.includes('transfer')) {
            serviceType = 'embryo_transfer'
          } else if (method.includes('natural') || method.includes('breeding')) {
            serviceType = 'natural'
          }
        } else {
          // Fallback: Check if AI technician or semen code provided
          const hasSemenCode = bullTag.includes('semen')
          const hasAiTechnician = !!technicianName
          
          if (hasAiTechnician || hasSemenCode) {
            serviceType = 'artificial_insemination'
          }
        }
        
        // For natural service, look up sire_id from bull tag in parentTagMap
        let sireId = null
        if (serviceType === 'natural' && bullTag && parentTagMap?.has(bullTag)) {
          sireId = parentTagMap.get(bullTag)
        }
        
        const { data: serviceRecord, error: serviceError } = await supabase
          .from('service_records')
          .insert({
            farm_id: farmId,
            animal_id: animalId,
            service_number: cycleNum,
            service_date: serviceDate,
            service_type: serviceType,
            sire_id: sireId,  // Set sire_id for natural service lookup
            bull_tag_or_semen_code: bullTag || null,
            bull_name_or_semen_source: animal[`bull_name_semen_source_${cycleNum}` as keyof ImportAnimal] || null,
            technician_name: technicianName || null,
            expected_calving_date: animal[`expected_calving_date_${cycleNum}` as keyof ImportAnimal] || null,
            outcome: outcome || 'pending',
            created_at: new Date().toISOString()
          })
          .select()
          .single()

        if (serviceError || !serviceRecord) {
          console.error(`❌ Service record cycle ${cycleNum}:`, serviceError || 'No data returned')
          continue
        }

        // TABLE 6: Create insemination event
        await supabase
          .from('breeding_events')
          .insert({
            farm_id: farmId,
            animal_id: animalId,
            event_type: 'insemination',
            event_date: serviceDate,
            service_record_id: serviceRecord.id,
            created_at: new Date().toISOString()
          })
          .then(() => {
            console.log(`✅ Insemination event created for cycle ${cycleNum}`)
          })
          .catch((e: any) => {
            console.warn(`⚠️ Insemination event cycle ${cycleNum}:`, e.message)
          })

        // If service failed, skip pregnancy/calving
        if (outcome === 'failed') {
          console.log(`  ⚠️ Cycle ${cycleNum} outcome: failed (skipping pregnancy/calving)`)
          continue
        }

        const actualCalvingDate = animal[`actual_calving_date_${cycleNum}` as keyof ImportAnimal] as string

        // TABLE 4: Create pregnancy_records (if successful)
        const gestationDays = calculateGestation(serviceDate, actualCalvingDate)
        
        // Determine pregnancy status: completed if actual calving date exists, otherwise confirmed
        let pregnancyStatus: 'confirmed' | 'completed' = 'confirmed'
        let confirmedDate: string | null = null
        let confirmationMethodValue: string | null = null
        
        if (actualCalvingDate) {
          pregnancyStatus = 'completed'
          confirmedDate = actualCalvingDate
          // confirmation_method not required for 'completed' status
          confirmationMethodValue = null
        } else if (outcome === 'success') {
          pregnancyStatus = 'confirmed'
          confirmedDate = new Date().toISOString().split('T')[0]  // Today's date for confirmation
          confirmationMethodValue = 'visual'  // Generic confirmation method for imported records
        }
        
        const steamingDate = animal[`steaming_date_${cycleNum}` as keyof ImportAnimal] as string
        const { data: pregnancyRecord, error: pregnancyError } = await supabase
          .from('pregnancy_records')
          .insert({
            farm_id: farmId,
            animal_id: animalId,
            service_record_id: serviceRecord.id,
            pregnancy_status: pregnancyStatus,
            confirmed_date: confirmedDate,
            confirmation_method: confirmationMethodValue,
            expected_calving_date: animal[`expected_calving_date_${cycleNum}` as keyof ImportAnimal] || null,
            gestation_length_days: gestationDays,
            steaming_date: steamingDate || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (pregnancyError || !pregnancyRecord) {
          console.error(`❌ Pregnancy record cycle ${cycleNum}:`, pregnancyError || 'No data returned')
          continue
        }

        // TABLE 5: Create calving_records
        // Extract calving difficulty from value (e.g., "easy - No issues..." → "easy")
        let calvingOutcomeRaw = (animal[`calving_outcome_${cycleNum}` as keyof ImportAnimal] || 'normal').toString().trim()
        let calvingDifficulty = calvingOutcomeRaw.split('-')[0].trim().toLowerCase()
        
        // Validate and map calving_difficulty values
        const validCalvingDifficulties = ['easy', 'normal', 'difficult', 'assisted', 'cesarean', 'aborted']
        if (!validCalvingDifficulties.includes(calvingDifficulty)) {
          calvingDifficulty = 'normal'  // Default if invalid value provided
        }
        
        const colostrumProduced = animal[`colostrum_produced_${cycleNum}` as keyof ImportAnimal] as string
        // Parse calving_time: handles Excel time-only values, ISO strings, and plain times
        const rawCalvingTime = animal[`calving_time_${cycleNum}` as keyof ImportAnimal] as any
        const calvingTimeFormatted = parseCalvingTime(rawCalvingTime)
        
        // ⚠️ SKIP: Only create calving record if actual_calving_date exists
        let calvingRecord = null
        if (actualCalvingDate && !isNaN(new Date(actualCalvingDate).getTime())) {
          const { data: calvingRecordData, error: calvingError } = await supabase
            .from('calving_records')
            .insert({
              farm_id: farmId,
              mother_id: animalId,
              pregnancy_record_id: pregnancyRecord.id,
              calving_date: actualCalvingDate,
              calving_time: calvingTimeFormatted,
              calving_difficulty: calvingDifficulty,
              assistance_required: ['assisted', 'cesarean'].includes(calvingDifficulty),
              calf_alive: calvingDifficulty !== 'aborted',
              colostrum_produced: colostrumProduced && !isNaN(parseFloat(colostrumProduced)) ? parseFloat(colostrumProduced) : null,
              created_at: new Date().toISOString()
            })
            .select()
            .single()

          if (calvingError || !calvingRecordData) {
            console.error(`❌ Calving record cycle ${cycleNum}:`, calvingError || 'No data returned')
            continue
          }
          
          calvingRecord = calvingRecordData
          console.log(`✅ Calving record created for cycle ${cycleNum}`)
        } else {
          console.log(`⏭️ Skipping calving record for cycle ${cycleNum}: No actual_calving_date provided`)
        }

        // Only process calf records if calving record was created
        if (!calvingRecord) {
          // Skip to lactation record creation below
        } else {
          // ─── Populate calf_records ─────────────────────────────────────────
          // Find calves in the import that were born from this calving event:
          // - mother_dam_tag matches this animal's tag
          // - date_of_birth matches actual_calving_date (normalized for Date/string comparison)
          // - animal_source is 'newborn_calf' (born on this farm)
          const normalizedCalvingDate = normalizeDate(actualCalvingDate)
          
          const calfAnimalsFromThisCalving = allAnimals.filter(a =>
            a.mother_dam_tag === animal.tag_number &&
            normalizeDate(a.date_of_birth) === normalizedCalvingDate &&
            a.animal_source === 'newborn_calf'
          )

          console.log(`  🔍 Found ${calfAnimalsFromThisCalving.length} calf(ves) from this calving event`)

          for (const calfAnimal of calfAnimalsFromThisCalving) {
            // Resolve calf's animal_id from parentTagMap
            // Handle original tags that were auto-generated: 'auto' or '' → generated tag
            let calfTag = calfAnimal.tag_number
            if (!calfTag || calfTag === 'auto') {
              calfTag = originalTagToGenerated.get(calfTag || 'auto') || calfTag
            }
            
            const calfAnimalId = calfTag ? parentTagMap.get(calfTag) : null

            if (!calfAnimalId) {
              console.warn(`  ⚠️ Could not resolve calf ${calfAnimal.tag_number} to animal_id`)
              continue
            }

            await supabase
              .from('calf_records')
              .insert({
                farm_id: farmId,
                calving_record_id: calvingRecord.id,
                animal_id: calfAnimalId,
                dam_id: animalId,
                birth_date: normalizedCalvingDate,
                gender: calfAnimal.gender || null,
                birth_weight: calfAnimal.birth_weight_kg
                  ? Number(calfAnimal.birth_weight_kg)
                  : null,
                breed: calfAnimal.breed || animal.breed || null,
                sire_tag: animal[`bull_tag_semen_code_${cycleNum}` as keyof ImportAnimal] as string || null,
                sire_name: animal[`bull_name_semen_source_${cycleNum}` as keyof ImportAnimal] as string || null,
                health_status: mapToCalfHealthStatus(calfAnimal.health_status),
                notes: calfAnimal.notes || null,
                created_at: new Date().toISOString()
              })
              .then(() => {
                console.log(`  ✅ Calf record created for ${calfAnimal.tag_number} from cycle ${cycleNum}`)
              })
              .catch((e: any) => {
                console.warn(`  ⚠️ Calf record failed for ${calfAnimal.tag_number}:`, e.message)
              })
          }

          // Note: If no calves found in import, do NOT create placeholder calf_records
          // because calf_records.gender is NOT NULL and we would have fabricated data
          if (calfAnimalsFromThisCalving.length === 0) {
            console.log(`  ℹ️ No calf in import for cycle ${cycleNum} — calf can be linked manually later`)
          }
        }

        // TABLE 8: Collect lactation_cycle_records data for post-processing
        // Only collect if actualCalvingDate is valid and calvingRecord exists
        if (actualCalvingDate && !isNaN(new Date(actualCalvingDate).getTime()) && calvingRecord) {
          lactationData.push({
            cycleNum,
            calvingRecord,
            actualCalvingDate,
            pregnancyRecord
          })
        } else {
          console.warn(`⚠️ Skipping lactation record for cycle ${cycleNum}: No valid calving date provided`)
        }

        // TABLE 6: Create pregnancy_check event
        const pregnancyCheckDate = new Date(serviceDate)
        pregnancyCheckDate.setDate(pregnancyCheckDate.getDate() + 60)  // ~60 days after service
        
        await supabase
          .from('breeding_events')
          .insert({
            farm_id: farmId,
            animal_id: animalId,
            event_type: 'pregnancy_check',
            event_date: pregnancyCheckDate.toISOString(),
            pregnancy_record_id: pregnancyRecord.id,
            created_at: new Date().toISOString()
          })
          .then(() => {
            console.log(`✅ Pregnancy check event created for cycle ${cycleNum}`)
          })
          .catch((e: any) => {
            console.warn(`⚠️ Pregnancy check event cycle ${cycleNum}:`, e.message)
          })

        // TABLE 6: Create calving event (only if actual calving date exists)
        if (actualCalvingDate && !isNaN(new Date(actualCalvingDate).getTime())) {
          await supabase
            .from('breeding_events')
            .insert({
              farm_id: farmId,
              animal_id: animalId,
              event_type: 'calving',
              event_date: new Date(actualCalvingDate).toISOString(),
              calving_record_id: calvingRecord.id,
              created_at: new Date().toISOString()
            })
            .then(() => {
              console.log(`✅ Calving event created for cycle ${cycleNum}`)
            })
            .catch((e: any) => {
              console.warn(`⚠️ Calving event cycle ${cycleNum}:`, e.message)
            })
        } else {
          console.warn(`⚠️ Skipping calving event for cycle ${cycleNum}: No valid calving date provided`)
        }

        console.log(`  ✅ Cycle ${cycleNum} completed`)

      } catch (cycleError) {
        console.warn(`⚠️ Cycle ${cycleNum} error:`, cycleError)
        continue  // Continue to next cycle
      }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // POST-PROCESS: Create lactation records with production-status-aware logic
    // ═════════════════════════════════════════════════════════════════════════
    if (lactationData.length > 0) {
      const latestCycleIndex = lactationData.length - 1
      
      for (let i = 0; i < lactationData.length; i++) {
        const { cycleNum, calvingRecord, actualCalvingDate, pregnancyRecord } = lactationData[i]
        const isLatestCycle = i === latestCycleIndex
        const nextCycleData = i < latestCycleIndex ? lactationData[i + 1] : null
        
        const expectedEndDate = new Date(actualCalvingDate)
        expectedEndDate.setDate(expectedEndDate.getDate() + 305)

        // Determine lactation status based on production_status and cycle position
        let lactationStatus: 'active' | 'completed' | 'inactive' | 'culling dry' = 'active'
        let actualEndDate: string | null = null
        let lactationNotes = 'System generated'
        let dryOffReason: 'voluntary' | 'disease' | 'pregnancy' | 'age' | 'other' | null = null

        if (animal.production_status === 'lactating') {
          // 🟢 Actively lactating cow:
          if (isLatestCycle) {
            // Current/latest cycle = active
            lactationStatus = 'active'
            actualEndDate = null
            dryOffReason = null
            lactationNotes = 'System generated - active lactation (current cycle)'
          } else {
            // Previous cycles = completed (past lactations)
            lactationStatus = 'completed'
            // End date = start of next cycle (when drying off began)
            actualEndDate = nextCycleData ? nextCycleData.actualCalvingDate : null
            dryOffReason = 'pregnancy'  // Previous cycle ended due to next pregnancy
            lactationNotes = 'System generated - previous lactation (completed)'
          }
        } else if (animal.production_status === 'steaming_dry_cows') {
          // 🟡 Steaming/drying off:
          lactationStatus = 'completed'
          // End date = steaming_date from NEXT cycle's pregnancy record if available, else from current
          if (nextCycleData?.pregnancyRecord?.steaming_date) {
            actualEndDate = nextCycleData.pregnancyRecord.steaming_date
            lactationNotes = 'System generated - completed, dried off per next cycle steaming date'
          } else {
            actualEndDate = pregnancyRecord.steaming_date || actualCalvingDate
            lactationNotes = 'System generated - completed, dried off per current steaming date'
          }
          dryOffReason = 'voluntary'  // Voluntary drying off for steaming phase
        } else if (animal.production_status === 'open_culling_dry_cows') {
          // 🔴 Open/culling dry:
          lactationStatus = 'culling dry'
          actualEndDate = new Date().toISOString().split('T')[0]
          lactationNotes = 'System generated - culling dry status'
          dryOffReason = 'age'  // Culled due to age or other reasons
        } else {
          // Default for other statuses (calf, heifer, bull, served, etc.): completed
          // These animals are not in active production, so lactation records are historical
          lactationStatus = 'completed'
          actualEndDate = new Date().toISOString().split('T')[0]
          lactationNotes = 'System generated - historical lactation (animal not in current production)'
          dryOffReason = 'other'  // Historical record for non-production animals
        }

        // Calculate days_in_milk explicitly
        // For inactive records: days_in_milk = actual_end_date - start_date
        // For active records: will be calculated by trigger as CURRENT_DATE - start_date
        let calculatedDaysInMilk: number | null = null
        if (lactationStatus !== 'active' && actualEndDate) {
          const startDateObj = new Date(actualCalvingDate)
          const endDateObj = new Date(actualEndDate)
          calculatedDaysInMilk = Math.floor((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24))
        }

        await supabase
          .from('lactation_cycle_records')
          .insert({
            farm_id: farmId,
            animal_id: animalId,
            calving_record_id: calvingRecord.id,
            lactation_number: cycleNum,
            start_date: actualCalvingDate,
            expected_end_date: expectedEndDate.toISOString().split('T')[0],
            actual_end_date: actualEndDate,
            status: lactationStatus,
            notes: lactationNotes,
            days_in_milk: calculatedDaysInMilk,
            dry_off_reason: dryOffReason,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .then(() => {
            const dimInfo = calculatedDaysInMilk !== null ? `, DIM=${calculatedDaysInMilk}` : ''
            console.log(`✅ Lactation record created: cycle=${cycleNum}, status=${lactationStatus}, end_date=${actualEndDate}${dimInfo}`)
          })
          .catch((e: any) => console.warn(`Lactation record cycle ${cycleNum}:`, e.message))
      }
    }

  } catch (error) {
    console.error('❌ Production cycles error:', error)
    throw error
  }
}

/**
 * Helper: Map animal health_status to calf health_status enum
 */
function mapToCalfHealthStatus(status?: string): string | null {
  const map: Record<string, string> = {
    'healthy': 'healthy',
    'sick': 'sick',
    'weak': 'weak',
    'deceased': 'deceased'
  }
  return status ? (map[status.toLowerCase()] ?? null) : null
}

/**
 * Helper: Calculate gestation length in days
 */
function calculateGestation(serviceDate: string, calvingDate: string): number {
  try {
    const service = new Date(serviceDate)
    const calving = new Date(calvingDate)
    const diffTime = calving.getTime() - service.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(240, Math.min(310, diffDays))  // Clamp between 240-310 days
  } catch (e) {
    return 280  // Default gestation
  }
}

function sanitizeAnimalDataForYourSchema(animal: ImportAnimal, parentTagMap: Map<string, string>) {
  try {
    // 🔴 CRITICAL: Gender is REQUIRED - reject if missing
    if (!animal.gender || !['male', 'female'].includes(animal.gender)) {
      console.error(`❌ Invalid gender for ${animal.tag_number}: "${animal.gender}" - must be male or female`)
      return null
    }

    // 🔴 CRITICAL: animal_source is REQUIRED - reject if missing or invalid (no silent defaults!)
    const validSources = ['newborn_calf', 'purchased_animal']
    const animalSource = animal.animal_source 
      ? String(animal.animal_source).trim().toLowerCase() 
      : null

    if (!animalSource || !validSources.includes(animalSource)) {
      console.error(`❌ Invalid animal_source for ${animal.tag_number}: "${animal.animal_source}" - must be newborn_calf or purchased_animal`)
      return null  // REJECT instead of defaulting
    }

    // Tag number handling: empty or "auto" → will be auto-generated
    let tagNumber = String(animal.tag_number || '').trim()
    if (!tagNumber || tagNumber.toLowerCase() === 'auto') {
      const now = new Date()
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
      const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
      tagNumber = `FARM-AUTO-${dateStr}-${randomNum}`
      console.log(`📝 Auto-generating tag: ${tagNumber}`)
    }

    const sanitized: any = {
      tag_number: tagNumber,
      gender: animal.gender,
      animal_source: animalSource
    }

    // Log for debugging
    console.log(`📊 Animal source for ${animal.tag_number}: raw="${animal.animal_source}" → sanitized="${sanitized.animal_source}"`)

    // Optional basic fields
    if (animal.name) sanitized.name = String(animal.name).trim()
    if (animal.breed) sanitized.breed = String(animal.breed).trim()
    if (animal.notes) sanitized.notes = String(animal.notes).trim()

    // Date fields - FIX: use birth_date (not date_of_birth) for schema
    if (animal.date_of_birth) {
      const birthDate = new Date(animal.date_of_birth)
      if (!isNaN(birthDate.getTime())) {
        sanitized.birth_date = birthDate.toISOString().split('T')[0]
      }
    }

    // Production status
    const validProductionStatuses = ['calf', 'heifer', 'bull', 'served', 'lactating', 'steaming_dry_cows', 'open_culling_dry_cows']
    if (animal.production_status && validProductionStatuses.includes(animal.production_status)) {
      sanitized.production_status = animal.production_status
    }

    // Health status
    if (animal.health_status) {
      sanitized.health_status = animal.health_status
    }

    // Parent information (LAYER 1 - Correctable)
    if (animal.mother_dam_tag && parentTagMap.has(animal.mother_dam_tag)) {
      sanitized.mother_id = parentTagMap.get(animal.mother_dam_tag)
    } else if (animal.mother_dam_name) {
      sanitized.mother_name = String(animal.mother_dam_name).trim()
    }
    
    if (animal.father_sire_semen_tag && parentTagMap.has(animal.father_sire_semen_tag)) {
      sanitized.father_id = parentTagMap.get(animal.father_sire_semen_tag)
    } else if (animal.father_sire_name_semen_source) {
      sanitized.father_info = String(animal.father_sire_name_semen_source).trim()
    }

    // Numeric fields
    if (animal.birth_weight_kg) {
      const weight = Number(animal.birth_weight_kg)
      if (!isNaN(weight) && weight > 0) {
        sanitized.birth_weight = weight
      }
    }

    console.log(`✅ Sanitized animal data for ${animal.tag_number}`)
    return sanitized
  } catch (error) {
    console.error('💥 Error sanitizing animal data:', error)
    return null
  }
}