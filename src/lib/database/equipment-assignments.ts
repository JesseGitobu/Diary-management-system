import { createServerSupabaseClient } from '@/lib/supabase/server'

export type EquipmentAssignmentRole = "driver" | "technician" | "farm_worker" | "supervisor";

export interface EquipmentAssignment {
  id: string
  equipment_id: string
  staff_id: string
  farm_id: string
  role: EquipmentAssignmentRole
  certification_required: string | null
  date_out: string
  expected_return: string | null
  actual_return: string | null
  assigned_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CreateAssignmentInput {
  equipment_id: string
  staff_id: string
  farm_id: string
  role: EquipmentAssignmentRole
  certification_required?: string | null
  date_out: string
  expected_return?: string | null
  assigned_by?: string | null
  notes?: string | null
}

export async function createEquipmentAssignment(
  data: CreateAssignmentInput
): Promise<{ assignment: EquipmentAssignment | null; error: string | null }> {
  const supabase = await createServerSupabaseClient()

  try {
    console.log('🔧 [DB] Creating equipment assignment:', {
      equipment_id: data.equipment_id,
      staff_id: data.staff_id,
      farm_id: data.farm_id,
    })

    const { data: assignmentData, error } = await supabase
      .from('equipment_assignments')
      .insert([
        {
          equipment_id: data.equipment_id,
          staff_id: data.staff_id,
          farm_id: data.farm_id,
          role: data.role,
          certification_required: data.certification_required || null,
          date_out: data.date_out,
          expected_return: data.expected_return || null,
          assigned_by: data.assigned_by || null,
          notes: data.notes || null,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('❌ [DB] Error creating assignment:', error)
      return { assignment: null, error: error.message }
    }

    console.log('✅ [DB] Equipment assignment created:', assignmentData?.id)
    return { assignment: (assignmentData as EquipmentAssignment) || null, error: null }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ [DB] Exception creating assignment:', message)
    return { assignment: null, error: message }
  }
}

export async function getEquipmentAssignments(
  farmId: string,
  filters?: { equipment_id?: string; staff_id?: string; active_only?: boolean }
): Promise<EquipmentAssignment[]> {
  const supabase = await createServerSupabaseClient()

  try {
    let query = supabase
      .from('equipment_assignments')
      .select('*')
      .eq('farm_id', farmId)

    if (filters?.equipment_id) {
      query = query.eq('equipment_id', filters.equipment_id)
    }

    if (filters?.staff_id) {
      query = query.eq('staff_id', filters.staff_id)
    }

    if (filters?.active_only) {
      query = query.is('actual_return', null)
    }

    query = query.order('date_out', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('❌ [DB] Error fetching assignments:', error)
      return []
    }

    return (data as EquipmentAssignment[]) || []
  } catch (error) {
    console.error('❌ [DB] Exception fetching assignments:', error)
    return []
  }
}

export async function getAssignmentById(id: string): Promise<EquipmentAssignment | null> {
  const supabase = await createServerSupabaseClient()

  try {
    const { data, error } = await supabase
      .from('equipment_assignments')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('❌ [DB] Error fetching assignment:', error)
      return null
    }

    return (data as EquipmentAssignment) || null
  } catch (error) {
    console.error('❌ [DB] Exception fetching assignment:', error)
    return null
  }
}

export async function returnEquipment(
  assignmentId: string,
  actualReturnDate?: string
): Promise<{ assignment: EquipmentAssignment | null; error: string | null }> {
  const supabase = await createServerSupabaseClient()

  try {
    const { data: assignmentData, error } = await supabase
      .from('equipment_assignments')
      .update({
        actual_return: actualReturnDate || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', assignmentId)
      .select()
      .single()

    if (error) {
      console.error('❌ [DB] Error returning equipment:', error)
      return { assignment: null, error: error.message }
    }

    console.log('✅ [DB] Equipment returned:', assignmentId)
    return { assignment: (assignmentData as EquipmentAssignment) || null, error: null }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ [DB] Exception returning equipment:', message)
    return { assignment: null, error: message }
  }
}
