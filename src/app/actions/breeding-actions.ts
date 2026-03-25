'use server'

// ✅ Server Action for calving operations - uses authenticated Supabase client with proper RLS
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { 
  mapHealthStatus, 
  mapDifficulty, 
  mapCalvingHealthStatus,
  type CalvingEvent
} from '@/lib/database/breeding'

export async function processCalvingAction(calvingEvent: CalvingEvent, farmId: string) {
  // ✅ Use authenticated Supabase client - RLS policies will be applied based on user's farm access
  const supabase = await createServerSupabaseClient()
  
  if (!calvingEvent.calf_tag_number) {
    return { success: false, error: 'Calf tag number is required' }
  }

  try {
    // 1. GET LATEST CONFIRMED PREGNANCY FROM PREGNANCY_RECORDS TABLE
    const { data: pregnancyData, error: pregError } = await (supabase
      .from('pregnancy_records') as any)
      .select('id, pregnancy_status, expected_calving_date')
      .eq('animal_id', calvingEvent.animal_id)
      .in('pregnancy_status', ['confirmed', 'completed'])
      .order('created_at', { ascending: false })
      .limit(1)

    if (pregError) {
      console.error('❌ Error fetching pregnancy record:', pregError)
      return { 
        success: false, 
        error: 'Cannot record calving: Error fetching pregnancy record.' 
      }
    }

    const pregnancyRecord = Array.isArray(pregnancyData) && pregnancyData.length > 0 
      ? pregnancyData[0] 
      : null

    if (!pregnancyRecord) {
      console.error('❌ No confirmed pregnancy found for mother:', calvingEvent.animal_id)
      return { 
        success: false, 
        error: 'Cannot record calving: No confirmed pregnancy found for this animal. Please create a pregnancy check and confirm it first.' 
      }
    }

    console.log('🐄 processCalving: Found confirmed pregnancy record:', pregnancyRecord)

    // 2. CHECK IF CALF TAG ALREADY EXISTS
    console.log('🐄 processCalving: Checking if tag number already exists:', calvingEvent.calf_tag_number)
    const { data: existingCalf, error: checkError } = await (supabase.from('animals') as any)
      .select('id, tag_number, name')
      .eq('tag_number', calvingEvent.calf_tag_number)
      .eq('farm_id', farmId)
      .limit(1)

    if (!checkError && existingCalf && (existingCalf as any[]).length > 0) {
      console.error('🐄 processCalving: Calf tag already exists:', calvingEvent.calf_tag_number)
      return {
        success: false,
        error: `Calf tag "${calvingEvent.calf_tag_number}" already exists in the system. Please use a different tag number or increment the tag counter in Animal Tagging Settings.`
      }
    }

    // 3. CREATE CALF IN 'ANIMALS' TABLE
    const newCalfData = {
      farm_id: farmId,
      tag_number: calvingEvent.calf_tag_number,
      name: calvingEvent.calf_name || `Calf ${calvingEvent.calf_tag_number}`,
      breed: calvingEvent.calf_breed,
      gender: calvingEvent.calf_gender || 'female',
      birth_date: calvingEvent.event_date,
      status: 'active',
      animal_source: 'newborn_calf', 
      mother_id: calvingEvent.animal_id,
      production_status: 'calf',
      health_status: mapHealthStatus(calvingEvent.calf_health_status),
      notes: `Generated via Calving Process`
    }

    const { data: newCalf, error: calfError } = await (supabase.from('animals') as any)
      .insert(newCalfData)
      .select()
      .single()

    if (calfError) {
      console.error('Supabase Error creating calf:', JSON.stringify(calfError, null, 2))
      throw new Error(`Failed to create calf: ${calfError.message}`)
    }

    // 4. GET PREGNANCY RECORD ID
    let pregnancyRecordId = null
    try {
      console.log('🐄 processCalving: Looking for pregnancy_record for animal:', calvingEvent.animal_id)
      
      const { data: pregnancyRecordData, error: pregRecError } = await (supabase
        .from('pregnancy_records') as any)
        .select('id')
        .eq('animal_id', calvingEvent.animal_id)
        .eq('pregnancy_status', 'confirmed')
        .order('created_at', { ascending: false })
        .limit(1)

      if (!pregRecError && pregnancyRecordData && (pregnancyRecordData as any[]).length > 0) {
        pregnancyRecordId = (pregnancyRecordData as any[])[0].id
        console.log('🐄 processCalving: Found existing pregnancy_record_id:', pregnancyRecordId)
      } else {
        console.log('🐄 processCalving: No confirmed pregnancy record found')
        throw new Error('Cannot create calving record: No confirmed pregnancy record found. Please record a positive pregnancy check first.')
      }
    } catch (error) {
      console.error('❌ processCalving: Error getting pregnancy record ID:', error)
      throw error
    }

    if (!pregnancyRecordId) {
      throw new Error('Failed to obtain pregnancy_record_id for calving record')
    }

    // 4B. CREATE CALVING RECORD
    let calvingTime = null
    if (calvingEvent.event_date && calvingEvent.event_date.includes('T')) {
      const timePart = calvingEvent.event_date.split('T')[1]
      if (timePart) {
        calvingTime = timePart.split('.')[0]
      }
    }

    const calvingDate = calvingEvent.event_date.split('T')[0]

    let sireInfo = null
    if (calvingEvent.calf_father_info) {
      sireInfo = calvingEvent.calf_father_info
      console.log('🐄 processCalving: Using sire info from calving event:', sireInfo)
    }

    // Create calving record (required table)
    let calvingRecord = null
    const calvingRecordData = {
      pregnancy_record_id: pregnancyRecordId,
      mother_id: calvingEvent.animal_id,
      farm_id: farmId,
      calving_date: calvingDate,
      calving_time: calvingTime,
      calving_difficulty: mapDifficulty(calvingEvent.calving_outcome),
      assistance_required: ['assisted', 'difficult', 'caesarean'].includes(calvingEvent.calving_outcome),
      calf_alive: calvingEvent.calf_health_status !== 'deceased',
      notes: calvingEvent.notes
    }

    try {
      const { data: calvingRecordResult, error: calvingError } = await (supabase.from('calving_records') as any)
        .insert(calvingRecordData)
        .select()
        .single()

      if (!calvingError && calvingRecordResult) {
        calvingRecord = calvingRecordResult
        console.log('🐄 processCalving: Created calving record with ID:', calvingRecord.id)
      } else if (calvingError) {
        console.error('❌ processCalving: Failed to create calving record:', calvingError.message)
        throw new Error(`Failed to create calving record: ${calvingError.message}`)
      }
    } catch (error) {
      console.error('❌ processCalving: Error creating calving record:', error)
      throw error
    }

    // 5. CREATE CALF RECORD (Detail table) - OPTIONAL
    if (calvingRecord) {
      const calfRecordData = {
        calving_record_id: calvingRecord.id,
        animal_id: newCalf.id,
        farm_id: farmId,
        dam_id: calvingEvent.animal_id,
        birth_date: calvingDate,
        gender: calvingEvent.calf_gender,
        birth_weight: calvingEvent.calf_weight,
        health_status: mapHealthStatus(calvingEvent.calf_health_status),
        sire_info: sireInfo,
        notes: 'Auto-generated from calving event'
      }

      const { error: calfRecError } = await (supabase.from('calf_records') as any)
        .insert(calfRecordData)

      if (calfRecError) {
        console.warn('⚠️ processCalving: Could not create calf record detail (optional):', calfRecError.message)
      } else {
        console.log('🐄 processCalving: Created calf record detail')
      }
    } else {
      console.log('🐄 processCalving: Skipping calf record detail (calving_records not available)')
    }

    // 6. UPDATE MOTHER & CLOSE PREGNANCY
    // ✅ FIX: Only update production_status (expected_calving_date doesn't exist in animals table)
    const { error: animalUpdateError } = await (supabase.from('animals') as any)
      .update({
        production_status: 'lactating'
      })
      .eq('id', calvingEvent.animal_id)
    
    if (animalUpdateError) {
      console.warn('⚠️ processCalving: Warning updating mother production status:', animalUpdateError.message)
    } else {
      console.log('🐄 processCalving: Updated mother production_status to lactating')
    }

    // Update pregnancy record status to completed (calving_date stored only in calving_records)
    const { data: updateResult, error: pregnancyUpdateError } = await (supabase.from('pregnancy_records') as any)
      .update({
        pregnancy_status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', pregnancyRecordId)
      .select()
    
    if (pregnancyUpdateError) {
      console.error('❌ processCalving: Failed to update pregnancy record status:', pregnancyUpdateError.message)
      // Check if this is an RLS policy issue
      if ((pregnancyUpdateError as any).code === 'PGRST204' || pregnancyUpdateError.message.includes('policy')) {
        console.error('⚠️ RLS POLICY ISSUE - check pregnancy_records table policies')
      }
    } else {
      console.log('✅ processCalving: Updated pregnancy record status to completed')
    }

    // 7. CREATE BREEDING EVENT (For Timeline History)
    // ✅ FIX: Only store valid columns - calf details go in calf_records, not breeding_events
    const breedingEventData = {
      farm_id: farmId,
      animal_id: calvingEvent.animal_id,
      event_type: 'calving',
      event_date: calvingEvent.event_date,
      calving_record_id: calvingRecord?.id, // Link to calving record details
      notes: calvingEvent.notes || 'Recorded via Calving Process',
      created_by: calvingEvent.created_by
    }

    const { error: breedingEventError } = await (supabase.from('breeding_events') as any)
      .insert(breedingEventData)

    if (breedingEventError) {
      console.error('Warning: Failed to create breeding_event history entry:', breedingEventError)
    }

    return { success: true, data: newCalf }

  } catch (error: any) {
    console.error('❌ Error processing calving:', error)
    return {
      success: false,
      error: error.message || 'Failed to process calving event'
    }
  }
}
