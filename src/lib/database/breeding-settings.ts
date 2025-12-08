// lib/database/breeding-settings.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'

export interface BreedingSettings {
    // General Breeding Cycle
    minimumBreedingAgeMonths: number
    defaultCycleInterval: number
    autoCreateNextEvent: boolean
    alertType: string[]

    // Heat Detection
    detectionMethod: 'manual' | 'sensor'
    responsibleUser: 'worker' | 'manager' | 'vet'
    missedHeatAlert: number
    reminderFrequency: 'daily' | 'every_2_days' | 'weekly'

    // Insemination
    breedingMethod: 'ai' | 'natural' | 'et'
    defaultAITechnician?: string
    semenProvider?: string
    costPerAI?: number
    defaultBull?: string
    autoSchedulePregnancyCheck: boolean
    pregnancyCheckDays: number

    // Pregnancy Check
    entryMethod: 'vet_only' | 'manual'
    diagnosisInterval: number
    autoCreateHeatOnFailed: boolean
    heatRetryDays: number

    // Calving
    defaultGestation: number
    daysPregnantAtDryoff: number
    autoRegisterCalf: boolean
    calfIdFormat: 'farm_year_number' | 'dam_number' | 'sequential'
    autoCreateDryOff: boolean
    autoCreateLactation: boolean
    postpartumBreedingDelayDays: number

    // Smart Alerts
    smartAlerts: {
        heatReminders: boolean
        breedingReminders: boolean
        pregnancyCheckReminders: boolean
        calvingReminders: boolean
    }
}

export async function getBreedingSettings(farmId: string): Promise<BreedingSettings | null> {
  try {
    const supabase = await createServerSupabaseClient()

      const { data, error } = await (supabase
        .from('farm_breeding_settings') as any)
      .select('*')
      .eq('farm_id', farmId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return getDefaultBreedingSettings()
      }
      throw error
    }

    // Transform snake_case from database to camelCase for TypeScript
    return {
      defaultCycleInterval: data.default_cycle_interval,
      autoCreateNextEvent: data.auto_create_next_event,
      alertType: data.alert_type,
      minimumBreedingAgeMonths: data.minimum_breeding_age_months,
      
      detectionMethod: data.detection_method as 'manual' | 'sensor',
      responsibleUser: data.responsible_user as 'worker' | 'manager' | 'vet',
      missedHeatAlert: data.missed_heat_alert,
      reminderFrequency: data.reminder_frequency as 'daily' | 'every_2_days' | 'weekly',
      
      breedingMethod: data.breeding_method as 'ai' | 'natural' | 'et',
      defaultAITechnician: data.default_ai_technician ?? undefined,
      semenProvider: data.semen_provider ?? undefined,
      costPerAI: data.cost_per_ai ?? undefined,
      defaultBull: data.default_bull ?? undefined,
      autoSchedulePregnancyCheck: data.auto_schedule_pregnancy_check,
      pregnancyCheckDays: data.pregnancy_check_days,
      
      entryMethod: data.entry_method as 'manual' | 'vet_only',
      diagnosisInterval: data.diagnosis_interval,
      autoCreateHeatOnFailed: data.auto_create_heat_on_failed,
      heatRetryDays: data.heat_retry_days,
      
      defaultGestation: data.default_gestation,
      daysPregnantAtDryoff: data.days_pregnant_at_dryoff,
      autoRegisterCalf: data.auto_register_calf,
      calfIdFormat: data.calf_id_format as 'farm_year_number' | 'dam_number' | 'sequential',
      autoCreateDryOff: data.auto_create_dry_off,
      autoCreateLactation: data.auto_create_lactation,
      postpartumBreedingDelayDays: data.postpartum_breeding_delay_days,
      
      smartAlerts: data.smart_alerts as { heatReminders: boolean; breedingReminders: boolean; pregnancyCheckReminders: boolean; calvingReminders: boolean; } || getDefaultBreedingSettings().smartAlerts
    }
  } catch (error) {
    console.error('Error fetching breeding settings:', error)
    return getDefaultBreedingSettings()
  }
}

export function getDefaultBreedingSettings(): BreedingSettings {
    return {
        // General Breeding Cycle
        minimumBreedingAgeMonths: 15,
        defaultCycleInterval: 21,
        autoCreateNextEvent: true,
        alertType: ['app', 'sms'],

        // Heat Detection
        detectionMethod: 'manual',
        responsibleUser: 'worker',
        missedHeatAlert: 25,
        reminderFrequency: 'daily',

        // Insemination
        breedingMethod: 'ai',
        defaultAITechnician: '',
        semenProvider: '',
        costPerAI: 500,
        defaultBull: '',
        autoSchedulePregnancyCheck: true,
        pregnancyCheckDays: 45,

        // Pregnancy Check
        entryMethod: 'vet_only',
        diagnosisInterval: 45,
        autoCreateHeatOnFailed: true,
        heatRetryDays: 21,

        // Calving
        defaultGestation: 280,
        daysPregnantAtDryoff: 220,
        autoRegisterCalf: true,
        calfIdFormat: 'farm_year_number',
        autoCreateDryOff: true,
        autoCreateLactation: true,
        postpartumBreedingDelayDays: 60,

        // Smart Alerts
        smartAlerts: {
            heatReminders: true,
            breedingReminders: true,
            pregnancyCheckReminders: true,
            calvingReminders: true
        }
    }
}

export async function updateBreedingSettings(
    farmId: string,
    settings: BreedingSettings
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createServerSupabaseClient()

        const dbSettings = {
      farm_id: farmId,
      
      // Breeding Cycle
      default_cycle_interval: settings.defaultCycleInterval,
      auto_create_next_event: settings.autoCreateNextEvent,
      alert_type: settings.alertType,
      minimum_breeding_age_months: settings.minimumBreedingAgeMonths,
      
      // Heat Detection
      detection_method: settings.detectionMethod,
      responsible_user: settings.responsibleUser,
      missed_heat_alert: settings.missedHeatAlert,
      reminder_frequency: settings.reminderFrequency,
      
      // Insemination
      breeding_method: settings.breedingMethod,
      default_ai_technician: settings.defaultAITechnician,
      semen_provider: settings.semenProvider,
      cost_per_ai: settings.costPerAI,
      default_bull: settings.defaultBull,
      auto_schedule_pregnancy_check: settings.autoSchedulePregnancyCheck,
      pregnancy_check_days: settings.pregnancyCheckDays,
      
      // Pregnancy Check
      entry_method: settings.entryMethod,
      diagnosis_interval: settings.diagnosisInterval,
      auto_create_heat_on_failed: settings.autoCreateHeatOnFailed,
      heat_retry_days: settings.heatRetryDays,
      
      // Calving
      default_gestation: settings.defaultGestation,
      days_pregnant_at_dryoff: settings.daysPregnantAtDryoff,
      auto_register_calf: settings.autoRegisterCalf,
      calf_id_format: settings.calfIdFormat,
      auto_create_dry_off: settings.autoCreateDryOff,
      auto_create_lactation: settings.autoCreateLactation,
      postpartum_breeding_delay_days: settings.postpartumBreedingDelayDays,
      
      // Smart Alerts
      smart_alerts: settings.smartAlerts,
      
      updated_at: new Date().toISOString()
    }

        const { error } = await (supabase
            .from('farm_breeding_settings') as any)
            .upsert(dbSettings, { onConflict: 'farm_id' })

        if (error) throw error

        return { success: true }
    } catch (error) {
        console.error('Error updating breeding settings:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update settings'
        }
    }
}