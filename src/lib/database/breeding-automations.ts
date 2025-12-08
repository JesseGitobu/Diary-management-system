import { createServerSupabaseClient } from '@/lib/supabase/server'
import { BreedingSettings } from './breeding-settings'

// Auto-update production status after breeding
export async function handlePostBreedingAutomation(
  animalId: string,
  farmId: string,
  breedingDate: string,
  settings: BreedingSettings
) {
  const supabase = await createServerSupabaseClient()

  // Get current animal
  const { data: animal } = await supabase
    .from('animals')
    .select('*')
    .eq('id', animalId)
    .single()

  if (!animal) return

  // Update production status to 'served'
  // FIXED: Cast to any to bypass 'never' type on update
  await (supabase
    .from('animals') as any)
    .update({
      production_status: 'served',
      service_date: breedingDate,
      updated_at: new Date().toISOString()
    })
    .eq('id', animalId)

  // Auto-schedule pregnancy check if enabled
  if (settings.autoSchedulePregnancyCheck) {
    const checkDate = new Date(breedingDate)
    checkDate.setDate(checkDate.getDate() + settings.pregnancyCheckDays)

    // FIXED: Cast to any to bypass 'never' type on insert
    await (supabase
      .from('breeding_calendar') as any)
      .insert({
        farm_id: farmId,
        animal_id: animalId,
        event_type: 'pregnancy_check',
        scheduled_date: checkDate.toISOString().split('T')[0],
        status: 'scheduled',
        notes: `Auto-scheduled ${settings.pregnancyCheckDays} days after breeding`
      })
  }
}

// Auto-update after confirmed pregnancy
export async function handlePostPregnancyConfirmationAutomation(
  animalId: string,
  farmId: string,
  confirmationDate: string,
  expectedCalvingDate: string,
  settings: BreedingSettings
) {
  const supabase = await createServerSupabaseClient()

  // Update production status remains 'served' until calving
  // FIXED: Cast to any
  await (supabase
    .from('animals') as any)
    .update({
      expected_calving_date: expectedCalvingDate,
      updated_at: new Date().toISOString()
    })
    .eq('id', animalId)

  // Schedule dry-off if enabled
  if (settings.autoCreateDryOff) {
    const dryOffDate = new Date(expectedCalvingDate)
    dryOffDate.setDate(
      dryOffDate.getDate() - (settings.defaultGestation - settings.daysPregnantAtDryoff)
    )

    // FIXED: Cast to any
    await (supabase
      .from('breeding_calendar') as any)
      .insert({
        farm_id: farmId,
        animal_id: animalId,
        event_type: 'dry_off_scheduled',
        scheduled_date: dryOffDate.toISOString().split('T')[0],
        status: 'scheduled',
        notes: `Auto-scheduled dry-off ${settings.defaultGestation - settings.daysPregnantAtDryoff} days before calving`
      })
  }

  // Schedule calving reminder
  // FIXED: Cast to any
  await (supabase
    .from('breeding_calendar') as any)
    .insert({
      farm_id: farmId,
      animal_id: animalId,
      event_type: 'calving_expected',
      scheduled_date: expectedCalvingDate,
      status: 'scheduled',
      notes: 'Expected calving date'
    })
}

// Auto-update after calving
export async function handlePostCalvingAutomation(
  animalId: string,
  farmId: string,
  calvingDate: string,
  settings: BreedingSettings
) {
  const supabase = await createServerSupabaseClient()

  // Update production status to 'lactating'
  // FIXED: Cast to any
  await (supabase
    .from('animals') as any)
    .update({
      production_status: 'lactating',
      service_date: null,
      expected_calving_date: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', animalId)

  // Calculate next eligible breeding date
  const nextBreedingDate = new Date(calvingDate)
  nextBreedingDate.setDate(nextBreedingDate.getDate() + settings.postpartumBreedingDelayDays)

  // Schedule breeding reminder
  // FIXED: Cast to any
  await (supabase
    .from('breeding_calendar') as any)
    .insert({
      farm_id: farmId,
      animal_id: animalId,
      event_type: 'breeding_eligible',
      scheduled_date: nextBreedingDate.toISOString().split('T')[0],
      status: 'scheduled',
      notes: `Eligible for breeding after ${settings.postpartumBreedingDelayDays}-day postpartum delay`
    })
}