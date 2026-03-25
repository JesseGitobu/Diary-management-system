// src/lib/database/vaccination-settings.ts
// Database functions for farm vaccination diseases management
// Implements secure, validated operations with proper error handling

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/client'

export interface VaccinationDisease {
  id: string
  farm_id: string
  name: string
  scientific_name?: string
  vaccine_name: string
  age_at_first_vaccination_months: number
  vaccination_interval_months: number
  booster_required: boolean
  booster_interval_months?: number
  administered_via: 'intramuscular' | 'subcutaneous' | 'intranasal' | 'oral'
  cost_kes: number
  is_active: boolean
  notes?: string
  created_by?: string
  created_at?: string
  updated_at?: string
}

export interface VaccinationDiseaseInput {
  name: string
  scientific_name?: string
  vaccine_name: string
  age_at_first_vaccination_months: number
  vaccination_interval_months: number
  booster_required: boolean
  booster_interval_months?: number
  administered_via: 'intramuscular' | 'subcutaneous' | 'intranasal' | 'oral'
  cost_kes: number
  is_active?: boolean
  notes?: string
}

/**
 * Validate vaccination disease input data
 * Ensures data quality before database operations
 */
function validateVaccinationDiseaseInput(data: Partial<VaccinationDiseaseInput>): {
  valid: boolean
  error?: string
} {
  // Required fields
  if (!data.name?.trim()) {
    return { valid: false, error: 'Disease name is required and cannot be empty' }
  }

  if (!data.vaccine_name?.trim()) {
    return { valid: false, error: 'Vaccine name is required and cannot be empty' }
  }

  // Numeric validations
  if (typeof data.vaccination_interval_months !== 'number' || data.vaccination_interval_months <= 0) {
    return { valid: false, error: 'Vaccination interval must be a positive number' }
  }

  if (typeof data.age_at_first_vaccination_months !== 'number' || data.age_at_first_vaccination_months < 0) {
    return { valid: false, error: 'Age at first vaccination must be a non-negative number' }
  }

  if (typeof data.cost_kes !== 'number' || data.cost_kes < 0) {
    return { valid: false, error: 'Cost must be a non-negative number' }
  }

  // Booster validations
  if (data.booster_required === true) {
    if (typeof data.booster_interval_months !== 'number' || data.booster_interval_months <= 0) {
      return { valid: false, error: 'Booster interval must be specified and positive when boosters are required' }
    }
  }

  // Valid administration route
  const validRoutes = ['intramuscular', 'subcutaneous', 'intranasal', 'oral']
  if (!validRoutes.includes(data.administered_via || '')) {
    return { valid: false, error: 'Invalid vaccination route selected' }
  }

  return { valid: true }
}

/**
 * Get all vaccination diseases for a farm
 * Server-side function with RLS enforcement
 */
export async function getVaccinationDiseases(farmId: string) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('farm_vaccination_diseases')
      .select('*')
      .eq('farm_id', farmId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching vaccination diseases:', error)
      return {
        success: false,
        error: error.message,
        data: []
      }
    }

    return {
      success: true,
      data: data || []
    }
  } catch (error) {
    console.error('Exception in getVaccinationDiseases:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: []
    }
  }
}

/**
 * Get a single vaccination disease by ID
 * Includes validation that user has access to the disease
 */
export async function getVaccinationDiseaseById(farmId: string, diseaseId: string) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('farm_vaccination_diseases')
      .select('*')
      .eq('id', diseaseId)
      .eq('farm_id', farmId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: 'Vaccination disease not found',
          data: null
        }
      }
      console.error('Error fetching vaccination disease:', error)
      return {
        success: false,
        error: error.message,
        data: null
      }
    }

    return {
      success: true,
      data
    }
  } catch (error) {
    console.error('Exception in getVaccinationDiseaseById:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: null
    }
  }
}

/**
 * Create a new vaccination disease
 * Validates input and enforces RLS policies
 */
export async function createVaccinationDisease(
  farmId: string,
  diseaseData: VaccinationDiseaseInput,
  userId: string
) {
  try {
    // Validate input data
    const validation = validateVaccinationDiseaseInput(diseaseData)
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        data: null
      }
    }

    const supabase = await createServerSupabaseClient()

    const insertPayload = {
      farm_id: farmId,
      name: diseaseData.name.trim(),
      scientific_name: diseaseData.scientific_name?.trim() || null,
      vaccine_name: diseaseData.vaccine_name.trim(),
      age_at_first_vaccination_months: diseaseData.age_at_first_vaccination_months,
      vaccination_interval_months: diseaseData.vaccination_interval_months,
      booster_required: diseaseData.booster_required,
      booster_interval_months: diseaseData.booster_required ? diseaseData.booster_interval_months : null,
      administered_via: diseaseData.administered_via,
      cost_kes: diseaseData.cost_kes,
      is_active: diseaseData.is_active !== false,
      notes: diseaseData.notes?.trim() || null,
      created_by: userId
      // created_at and updated_at are handled by database defaults (DEFAULT NOW())
    }

    const { data, error } = await (supabase
      .from('farm_vaccination_diseases') as any)
      .insert([insertPayload])
      .select()
      .single()

    if (error) {
      console.error('Error creating vaccination disease:', error)
      // Handle specific error cases
      if (error.code === '42501') {
        return {
          success: false,
          error: 'You do not have permission to create vaccination diseases for this farm',
          data: null
        }
      }
      return {
        success: false,
        error: error.message,
        data: null
      }
    }

    return {
      success: true,
      message: 'Vaccination disease created successfully',
      data
    }
  } catch (error) {
    console.error('Exception in createVaccinationDisease:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: null
    }
  }
}

/**
 * Update an existing vaccination disease
 * Only allows updates by farm managers and owners
 */
export async function updateVaccinationDisease(
  farmId: string,
  diseaseId: string,
  diseaseData: Partial<VaccinationDiseaseInput>
) {
  try {
    // Validate input data (only validate fields that are being updated)
    if (Object.keys(diseaseData).length === 0) {
      return {
        success: false,
        error: 'No fields to update',
        data: null
      }
    }

    const validation = validateVaccinationDiseaseInput(diseaseData)
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        data: null
      }
    }

    const supabase = await createServerSupabaseClient()

    // Prepare update object with trimmed strings
    // Note: updated_at is handled by database trigger/default
    const updateData: any = {}

    if (diseaseData.name !== undefined) updateData.name = diseaseData.name.trim()
    if (diseaseData.scientific_name !== undefined) updateData.scientific_name = diseaseData.scientific_name?.trim() || null
    if (diseaseData.vaccine_name !== undefined) updateData.vaccine_name = diseaseData.vaccine_name.trim()
    if (diseaseData.age_at_first_vaccination_months !== undefined) updateData.age_at_first_vaccination_months = diseaseData.age_at_first_vaccination_months
    if (diseaseData.vaccination_interval_months !== undefined) updateData.vaccination_interval_months = diseaseData.vaccination_interval_months
    if (diseaseData.booster_required !== undefined) updateData.booster_required = diseaseData.booster_required
    if (diseaseData.booster_interval_months !== undefined) updateData.booster_interval_months = diseaseData.booster_required ? diseaseData.booster_interval_months : null
    if (diseaseData.administered_via !== undefined) updateData.administered_via = diseaseData.administered_via
    if (diseaseData.cost_kes !== undefined) updateData.cost_kes = diseaseData.cost_kes
    if (diseaseData.is_active !== undefined) updateData.is_active = diseaseData.is_active
    if (diseaseData.notes !== undefined) updateData.notes = diseaseData.notes?.trim() || null

    const { data, error } = await (supabase
      .from('farm_vaccination_diseases') as any)
      .update(updateData)
      .eq('id', diseaseId)
      .eq('farm_id', farmId)
      .select()
      .single()

    if (error) {
      console.error('Error updating vaccination disease:', error)
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: 'Vaccination disease not found or you do not have access',
          data: null
        }
      }
      return {
        success: false,
        error: error.message,
        data: null
      }
    }

    return {
      success: true,
      message: 'Vaccination disease updated successfully',
      data
    }
  } catch (error) {
    console.error('Exception in updateVaccinationDisease:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: null
    }
  }
}

/**
 * Delete a vaccination disease
 * Soft delete is handled by updating is_active flag
 * Hard delete requires farm_owner role
 */
export async function deleteVaccinationDisease(
  farmId: string,
  diseaseId: string,
  hardDelete: boolean = false
) {
  try {
    const supabase = await createServerSupabaseClient()

    if (hardDelete) {
      // Hard delete - only for farm owners
      const { error } = await supabase
        .from('farm_vaccination_diseases')
        .delete()
        .eq('id', diseaseId)
        .eq('farm_id', farmId)

      if (error) {
        console.error('Error deleting vaccination disease:', error)
        if (error.code === '42501') {
          return {
            success: false,
            error: 'You do not have permission to delete vaccination diseases'
          }
        }
        return {
          success: false,
          error: error.message
        }
      }
    } else {
      // Soft delete - deactivate the disease
      const { error } = await (supabase
        .from('farm_vaccination_diseases') as any)
        .update({
          is_active: false
          // updated_at is handled by database trigger
        })
        .eq('id', diseaseId)
        .eq('farm_id', farmId)

      if (error) {
        console.error('Error deactivating vaccination disease:', error)
        return {
          success: false,
          error: error.message
        }
      }
    }

    return {
      success: true,
      message: hardDelete ? 'Vaccination disease deleted permanently' : 'Vaccination disease deactivated'
    }
  } catch (error) {
    console.error('Exception in deleteVaccinationDisease:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Get vaccination statistics for a farm
 * Useful for dashboards and reporting
 */
export async function getVaccinationDiseaseStats(farmId: string) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data, error } = await (supabase
      .from('farm_vaccination_diseases') as any)
      .select('*')
      .eq('farm_id', farmId)

    if (error) {
      console.error('Error fetching vaccination stats:', error)
      return {
        success: false,
        error: error.message,
        stats: null
      }
    }

    const diseases = (data || []) as Array<{ is_active: boolean; booster_required: boolean; administered_via: string }>
    const stats = {
      total_diseases: diseases.length,
      active_diseases: diseases.filter(d => d.is_active).length,
      inactive_diseases: diseases.filter(d => !d.is_active).length,
      diseases_with_boosters: diseases.filter(d => d.booster_required).length,
      by_administration_route: {
        intramuscular: diseases.filter(d => d.administered_via === 'intramuscular').length,
        subcutaneous: diseases.filter(d => d.administered_via === 'subcutaneous').length,
        intranasal: diseases.filter(d => d.administered_via === 'intranasal').length,
        oral: diseases.filter(d => d.administered_via === 'oral').length
      }
    }

    return {
      success: true,
      stats
    }
  } catch (error) {
    console.error('Exception in getVaccinationDiseaseStats:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stats: null
    }
  }
}

/**
 * Bulk update vaccination diseases status
 * Useful for batch operations
 */
export async function bulkUpdateVaccinationDiseaseStatus(
  farmId: string,
  diseaseIds: string[],
  isActive: boolean
) {
  try {
    if (diseaseIds.length === 0) {
      return {
        success: false,
        error: 'No disease IDs provided'
      }
    }

    const supabase = await createServerSupabaseClient()

    const { error } = await (supabase
      .from('farm_vaccination_diseases') as any)
      .update({
        is_active: isActive
        // updated_at is handled by database trigger
      })
      .eq('farm_id', farmId)
      .in('id', diseaseIds)

    if (error) {
      console.error('Error bulk updating vaccination diseases:', error)
      return {
        success: false,
        error: error.message
      }
    }

    return {
      success: true,
      message: `${diseaseIds.length} vaccination disease(s) updated`
    }
  } catch (error) {
    console.error('Exception in bulkUpdateVaccinationDiseaseStatus:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
