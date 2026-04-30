import { createServerSupabaseClient } from '@/lib/supabase/server'

export interface CalfSettingsInput {
  // Growth & Weight
  birthWeightGlobal: number
  birthWeightStandards: Record<string, number>   // { holstein: 45, jersey: 30, ... }
  expectedDailyGain: number
  weightMeasurementFrequency: string
  customMeasurementDays: number

  // Colostrum Management
  colostrumFirstFeedingHours: number
  colostrumQuantityPercent: number
  colostrumFeedingFrequency: number
  colostrumDurationDays: number
  colostrumQuantityPerFeeding: number
  enableColostrumQualityTracking: boolean

  // Milk Feeding
  milkQuantityPerDay: number
  milkFeedingFrequency: number
  milkAdjustmentPeriod: string
  customMilkAdjustmentDays: number
  enableTaperingBeforeWeaning: boolean
  taperingDaysBeforeWeaning: number

  // Starter / Dry Feed
  starterFeedStartAge: number
  starterFeedInitialQuantity: number
  starterFeedTargetBeforeWeaning: number
  enableGradualIntroduction: boolean

  // Weaning
  weaningAge: number
  weaningType: string
  weaningMinWeight: number
  weaningMinStarterIntake: number
  weaningDaysAtStarterIntake: number
  enableSmartWeaningLogic: boolean

  // Alerts
  enableWeightAlerts: boolean
  weightDeviationThreshold: number
  enableMilkingAlerts: boolean
  enableHealthAlerts: boolean
  enableMissedMeasurementAlerts: boolean

  // Protocol
  selectedProtocol: string

  // Child table arrays
  vaccinations: Array<{ name: string; ageInDays: number; frequency: string }>
  deworming: Array<{ name: string; ageInDays: number; frequency: string }>
  vitaminSupplements: Array<{ name: string; ageInDays: number; frequency: string; until: string }>
  milkAdjustmentSchedule: Array<{
    periodNum: number
    startDay: number
    endDay: number
    dailyMilk: number
    feedingsPerDay: number
  }>
}

export async function getCalfManagementSettings(farmId: string) {
  const supabase = await createServerSupabaseClient()

  const { data: main, error } = await (supabase as any)
    .from('calf_management_settings')
    .select('*')
    .eq('farm_id', farmId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No settings yet — return null so the UI uses defaults
      return null
    }
    console.error('[CalfSettingsDB] Error fetching main settings:', error)
    throw new Error(error.message)
  }

  const settingsId = main.id

  // Fetch child tables in parallel
  const [vaccRes, dewormRes, vitRes, milkRes] = await Promise.all([
    (supabase as any)
      .from('calf_vaccinations')
      .select('*')
      .eq('settings_id', settingsId)
      .order('age_in_days'),
    (supabase as any)
      .from('calf_deworming')
      .select('*')
      .eq('settings_id', settingsId)
      .order('age_in_days'),
    (supabase as any)
      .from('calf_vitamin_supplements')
      .select('*')
      .eq('settings_id', settingsId)
      .order('age_in_days'),
    (supabase as any)
      .from('calf_milk_adjustment_schedule')
      .select('*')
      .eq('settings_id', settingsId)
      .order('period_num'),
  ])

  return {
    // Main row
    birthWeightGlobal: main.birth_weight_global,
    birthWeightStandards: main.birth_weight_standards ?? {},
    expectedDailyGain: main.expected_daily_gain,
    weightMeasurementFrequency: main.weight_measurement_frequency,
    customMeasurementDays: main.custom_measurement_days,
    colostrumFirstFeedingHours: main.colostrum_first_feeding_hours,
    colostrumQuantityPercent: main.colostrum_quantity_percent,
    colostrumFeedingFrequency: main.colostrum_feeding_frequency,
    colostrumDurationDays: main.colostrum_duration_days,
    colostrumQuantityPerFeeding: main.colostrum_quantity_per_feeding,
    enableColostrumQualityTracking: main.enable_colostrum_quality_tracking,
    milkQuantityPerDay: main.milk_quantity_per_day,
    milkFeedingFrequency: main.milk_feeding_frequency,
    milkAdjustmentPeriod: main.milk_adjustment_period,
    customMilkAdjustmentDays: main.custom_milk_adjustment_days,
    enableTaperingBeforeWeaning: main.enable_tapering_before_weaning,
    taperingDaysBeforeWeaning: main.tapering_days_before_weaning,
    starterFeedStartAge: main.starter_feed_start_age,
    starterFeedInitialQuantity: main.starter_feed_initial_quantity,
    starterFeedTargetBeforeWeaning: main.starter_feed_target_before_weaning,
    enableGradualIntroduction: main.enable_gradual_introduction,
    weaningAge: main.weaning_age,
    weaningType: main.weaning_type,
    weaningMinWeight: main.weaning_min_weight,
    weaningMinStarterIntake: main.weaning_min_starter_intake,
    weaningDaysAtStarterIntake: main.weaning_days_at_starter_intake,
    enableSmartWeaningLogic: main.enable_smart_weaning_logic,
    enableWeightAlerts: main.enable_weight_alerts,
    weightDeviationThreshold: main.weight_deviation_threshold,
    enableMilkingAlerts: main.enable_milking_alerts,
    enableHealthAlerts: main.enable_health_alerts,
    enableMissedMeasurementAlerts: main.enable_missed_measurement_alerts,
    selectedProtocol: main.selected_protocol,

    // Child tables — mapped to camelCase for the UI
    vaccinations: (vaccRes.data ?? []).map((r: any) => ({
      name: r.name,
      ageInDays: r.age_in_days,
      frequency: r.frequency,
    })),
    deworming: (dewormRes.data ?? []).map((r: any) => ({
      name: r.name,
      ageInDays: r.age_in_days,
      frequency: r.frequency,
    })),
    vitaminSupplements: (vitRes.data ?? []).map((r: any) => ({
      name: r.name,
      ageInDays: r.age_in_days,
      frequency: r.frequency,
      until: r.until_stage,
    })),
    milkAdjustmentSchedule: (milkRes.data ?? []).map((r: any) => ({
      periodNum: r.period_num,
      startDay: r.start_day,
      endDay: r.end_day,
      dailyMilk: r.daily_milk,
      feedingsPerDay: r.feedings_per_day,
    })),
  }
}

export async function saveCalfManagementSettings(
  farmId: string,
  input: CalfSettingsInput,
  _userId: string
) {
  const supabase = await createServerSupabaseClient()

  // 1. Upsert the main settings row (farm_id has a UNIQUE constraint)
  const { data: main, error: mainErr } = await (supabase as any)
    .from('calf_management_settings')
    .upsert(
      {
        farm_id: farmId,
        birth_weight_global: input.birthWeightGlobal,
        birth_weight_standards: input.birthWeightStandards,
        expected_daily_gain: input.expectedDailyGain,
        weight_measurement_frequency: input.weightMeasurementFrequency,
        custom_measurement_days: input.customMeasurementDays,
        colostrum_first_feeding_hours: input.colostrumFirstFeedingHours,
        colostrum_quantity_percent: input.colostrumQuantityPercent,
        colostrum_feeding_frequency: input.colostrumFeedingFrequency,
        colostrum_duration_days: input.colostrumDurationDays,
        colostrum_quantity_per_feeding: input.colostrumQuantityPerFeeding,
        enable_colostrum_quality_tracking: input.enableColostrumQualityTracking,
        milk_quantity_per_day: input.milkQuantityPerDay,
        milk_feeding_frequency: input.milkFeedingFrequency,
        milk_adjustment_period: input.milkAdjustmentPeriod,
        custom_milk_adjustment_days: input.customMilkAdjustmentDays,
        enable_tapering_before_weaning: input.enableTaperingBeforeWeaning,
        tapering_days_before_weaning: input.taperingDaysBeforeWeaning,
        starter_feed_start_age: input.starterFeedStartAge,
        starter_feed_initial_quantity: input.starterFeedInitialQuantity,
        starter_feed_target_before_weaning: input.starterFeedTargetBeforeWeaning,
        enable_gradual_introduction: input.enableGradualIntroduction,
        weaning_age: input.weaningAge,
        weaning_type: input.weaningType,
        weaning_min_weight: input.weaningMinWeight,
        weaning_min_starter_intake: input.weaningMinStarterIntake,
        weaning_days_at_starter_intake: input.weaningDaysAtStarterIntake,
        enable_smart_weaning_logic: input.enableSmartWeaningLogic,
        enable_weight_alerts: input.enableWeightAlerts,
        weight_deviation_threshold: input.weightDeviationThreshold,
        enable_milking_alerts: input.enableMilkingAlerts,
        enable_health_alerts: input.enableHealthAlerts,
        enable_missed_measurement_alerts: input.enableMissedMeasurementAlerts,
        selected_protocol: input.selectedProtocol,
      },
      { onConflict: 'farm_id' }
    )
    .select('id')
    .single()

  if (mainErr || !main) {
    console.error('[CalfSettingsDB] Error upserting main settings:', mainErr)
    return { success: false, error: mainErr?.message ?? 'Failed to save settings' }
  }

  const settingsId: string = main.id

  // 2. Replace child tables — delete all then re-insert
  const deleteResults = await Promise.all([
    (supabase as any).from('calf_vaccinations').delete().eq('settings_id', settingsId),
    (supabase as any).from('calf_deworming').delete().eq('settings_id', settingsId),
    (supabase as any).from('calf_vitamin_supplements').delete().eq('settings_id', settingsId),
    (supabase as any).from('calf_milk_adjustment_schedule').delete().eq('settings_id', settingsId),
  ])

  const deleteError = deleteResults.find(r => r.error)?.error
  if (deleteError) {
    console.error('[CalfSettingsDB] Error deleting child rows:', deleteError)
    return { success: false, error: deleteError.message }
  }

  // 3. Insert new child rows (only if arrays are non-empty)
  const insertErrors: string[] = []

  if (input.vaccinations.length > 0) {
    const { error } = await (supabase as any).from('calf_vaccinations').insert(
      input.vaccinations.map(v => ({
        settings_id: settingsId,
        name: v.name,
        age_in_days: v.ageInDays,
        frequency: v.frequency,
      }))
    )
    if (error) insertErrors.push(`vaccinations: ${error.message}`)
  }

  if (input.deworming.length > 0) {
    const { error } = await (supabase as any).from('calf_deworming').insert(
      input.deworming.map(d => ({
        settings_id: settingsId,
        name: d.name,
        age_in_days: d.ageInDays,
        frequency: d.frequency,
      }))
    )
    if (error) insertErrors.push(`deworming: ${error.message}`)
  }

  if (input.vitaminSupplements.length > 0) {
    const { error } = await (supabase as any).from('calf_vitamin_supplements').insert(
      input.vitaminSupplements.map(s => ({
        settings_id: settingsId,
        name: s.name,
        age_in_days: s.ageInDays,
        frequency: s.frequency,
        until_stage: s.until,
      }))
    )
    if (error) insertErrors.push(`vitamin_supplements: ${error.message}`)
  }

  if (input.milkAdjustmentSchedule.length > 0) {
    const { error } = await (supabase as any).from('calf_milk_adjustment_schedule').insert(
      input.milkAdjustmentSchedule.map(p => ({
        settings_id: settingsId,
        period_num: p.periodNum,
        start_day: p.startDay,
        end_day: p.endDay,
        daily_milk: p.dailyMilk,
        feedings_per_day: p.feedingsPerDay,
      }))
    )
    if (error) insertErrors.push(`milk_adjustment_schedule: ${error.message}`)
  }

  if (insertErrors.length > 0) {
    console.error('[CalfSettingsDB] Child insert errors:', insertErrors)
    return { success: false, error: insertErrors.join('; ') }
  }

  console.log('[CalfSettingsDB] Settings saved for farm:', farmId, 'settingsId:', settingsId)
  return { success: true, settingsId }
}
