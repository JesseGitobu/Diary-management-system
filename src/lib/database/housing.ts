// lib/database/housing.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { HousingBuilding, HousingUnit, HousingPen } from '@/types/housing'

export interface CreateBuildingInput {
  farm_id: string
  name: string
  type: string
  total_capacity: number
  location?: string
  year_built?: number
  status: 'active' | 'inactive' | 'maintenance'
  notes?: string
}

export async function getBuildings(farmId: string): Promise<{ success: true; data: HousingBuilding[] } | { success: false; error: string }> {
  const supabase = await createServerSupabaseClient()

  try {
    const { data: buildings, error } = await (supabase as any)
      .from('housing_buildings')
      .select('*')
      .eq('farm_id', farmId)
      .order('name')

    if (error) throw error

    return { success: true, data: buildings as HousingBuilding[] }
  } catch (error) {
    console.error('Error in getBuildings:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch buildings',
    }
  }
}

export async function createBuilding(data: CreateBuildingInput): Promise<{ success: true; data: HousingBuilding } | { success: false; error: string }> {
  const supabase = await createServerSupabaseClient()

  try {
    const { data: newBuilding, error } = await (supabase as any)
      .from('housing_buildings')
      .insert({
        farm_id: data.farm_id,
        name: data.name,
        type: data.type,
        total_capacity: data.total_capacity,
        location: data.location,
        year_built: data.year_built,
        status: data.status,
        notes: data.notes,
        current_occupancy: 0,
        units_count: 0,
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, data: newBuilding as HousingBuilding }
  } catch (error) {
    console.error('Error in createBuilding:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create building',
    }
  }
}

export async function getUnits(farmId: string): Promise<{ success: true; data: HousingUnit[] } | { success: false; error: string }> {
  const supabase = await createServerSupabaseClient()

  try {
    const { data: units, error } = await (supabase as any)
      .from('housing_units')
      .select('*')
      .eq('farm_id', farmId)
      .order('name')

    if (error) throw error

    return { success: true, data: units as HousingUnit[] }
  } catch (error) {
    console.error('Error in getUnits:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch units',
    }
  }
}

export interface CreateUnitInput {
  farm_id: string
  building_id: string
  name: string
  unit_type: string
  total_capacity: number
  environmental_conditions: any
}

export async function createHousingUnit(data: CreateUnitInput) {
  const supabase = await createServerSupabaseClient()

  try {
    const { data: newUnit, error } = await (supabase as any)
      .from('housing_units')
      .insert({
        farm_id: data.farm_id,
        building_id: data.building_id,
        name: data.name,
        unit_type: data.unit_type,
        total_capacity: data.total_capacity,
        environmental_conditions: data.environmental_conditions,
        current_occupancy: 0,
        pens_count: 0,
        status: 'active'
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, data: newUnit }
  } catch (error) {
    console.error('Error in createHousingUnit:', error)
    return { success: false, error: 'Failed to create housing unit' }
  }
}
export async function getPens(farmId: string): Promise<{ success: true; data: HousingPen[] } | { success: false; error: string }> {
  const supabase = await createServerSupabaseClient()

  try {
    const { data: pens, error } = await (supabase as any)
      .from('housing_pens')
      .select('*')
      .eq('farm_id', farmId)
      .order('pen_number')

    if (error) throw error

    return { success: true, data: pens as HousingPen[] }
  } catch (error) {
    console.error('Error in getPens:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch pens',
    }
  }
}

export interface CreatePenInput {
  farm_id: string
  building_id: string
  unit_id: string
  pen_number: string
  special_type: string
  capacity: number
  dimensions: {
    length_meters: number
    width_meters: number
    height_meters: number
    area_sqm: number
  }
  conditions: any
}

export async function createHousingPen(data: CreatePenInput) {
  const supabase = await createServerSupabaseClient()

  try {
    const { data: newPen, error } = await (supabase as any)
      .from('housing_pens')
      .insert({
        farm_id: data.farm_id,
        building_id: data.building_id,
        unit_id: data.unit_id,
        pen_number: data.pen_number,
        special_type: data.special_type,
        capacity: data.capacity,
        dimensions: data.dimensions,
        conditions: data.conditions,
        current_occupancy: 0,
        status: 'active'
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, data: newPen }
  } catch (error) {
    console.error('Error in createHousingPen:', error)
    return { success: false, error: 'Failed to create pen record' }
  }
}

// lib/database/housing.ts (Append to file)

export interface BulkAssignmentInput {
  farm_id: string
  pen_id: string
  animal_ids: string[]
  reason?: string
  notes?: string
}

export async function assignAnimalsToHousing(data: BulkAssignmentInput) {
  const supabase = await createServerSupabaseClient()

  try {
    const assignmentRows = data.animal_ids.map(animalId => ({
      farm_id: data.farm_id,
      pen_id: data.pen_id,
      animal_id: animalId,
      reason: data.reason,
      notes: data.notes,
      status: 'assigned'
    }))

    const { data: assignments, error } = await supabase
      .from('housing_assignments')
      .insert(assignmentRows)
      .select()

    if (error) throw error

    return { success: true, data: assignments }
  } catch (error) {
    console.error('Error in assignAnimalsToHousing:', error)
    return { success: false, error: 'Failed to record housing assignments' }
  }
}

export async function getHousingAssignments(farmId: string, penId?: string) {
  const supabase = await createServerSupabaseClient()

  try {
    let query = supabase
      .from('housing_assignments')
      .select(`
        *,
        animals:animal_id (
          id,
          tag_number,
          name,
          production_status,
          breed
        ),
        pens:pen_id (
          pen_number
        )
      `)
      .eq('farm_id', farmId)
      .eq('status', 'assigned') // Only get current assignments
      .order('assigned_at', { ascending: false })

    if (penId) {
      query = query.eq('pen_id', penId)
    }

    const { data, error } = await query

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error in getHousingAssignments:', error)
    return { success: false, error: 'Failed to fetch assignments' }
  }
}