// src/lib/database/storage.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'

// Columns callers are allowed to write — guards against accidental
// mass-assignment of id, farm_id, created_at, updated_at, etc.
const WRITABLE_COLUMNS = [
  'name',
  'storage_type',
  'status',
  'location',
  'building',
  'floor_level',
  'capacity',
  'capacity_unit',
  'temperature_controlled',
  'min_temperature',
  'max_temperature',
  'humidity_controlled',
  'min_humidity',
  'max_humidity',
  'restricted_access',
  'requires_authorization',
  'categories',
  'description',
  'notes',
  'created_by',
  'updated_by',
] as const

type WritableColumn = typeof WRITABLE_COLUMNS[number]

function sanitizePayload(data: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(data).filter(([key]) =>
      WRITABLE_COLUMNS.includes(key as WritableColumn)
    )
  )
}

// ── GET active storage locations ─────────────────────────────────────────────

export async function getStorageLocations(farmId: string) {
  const supabase = await createServerSupabaseClient()
  const db = supabase as any

  const { data, error } = await db
    .from('storage_locations')
    .select('*')
    .eq('farm_id', farmId)
    .neq('status', 'inactive')
    .order('name')

  if (error) {
    console.error('Error fetching storage locations:', error)
    return []
  }

  return (data as any[]) || []
}

// ── GET all storage locations (including inactive) ───────────────────────────

export async function getAllStorageLocations(farmId: string) {
  const supabase = await createServerSupabaseClient()
  const db = supabase as any

  const { data, error } = await db
    .from('storage_locations')
    .select('*')
    .eq('farm_id', farmId)
    .order('name')

  if (error) {
    console.error('Error fetching all storage locations:', error)
    return []
  }

  return (data as any[]) || []
}

// ── GET single storage location ───────────────────────────────────────────────

export async function getStorageLocation(id: string, farmId: string) {
  const supabase = await createServerSupabaseClient()
  const db = supabase as any

  const { data, error } = await db
    .from('storage_locations')
    .select('*')
    .eq('id', id)
    .eq('farm_id', farmId)
    .single()

  if (error) {
    console.error('Error fetching storage location:', error)
    return null
  }

  return data
}

// ── CREATE storage location ───────────────────────────────────────────────────

export async function createStorageLocation(
  farmId: string,
  locationData: Record<string, any>,
  createdByUserId?: string,
) {
  const supabase = await createServerSupabaseClient()
  const db = supabase as any

  if (!locationData.name?.trim()) {
    return { success: false as const, error: 'Storage location name is required.' }
  }

  const payload = sanitizePayload(locationData)

  const { data, error } = await db
    .from('storage_locations')
    .insert({
      ...payload,
      farm_id:    farmId,
      status:     payload.status ?? 'active',
      created_by: createdByUserId ?? null,
      updated_by: createdByUserId ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating storage location:', error)
    return { success: false as const, error: error.message }
  }

  return { success: true as const, data }
}

// ── UPDATE storage location ───────────────────────────────────────────────────

export async function updateStorageLocation(
  id: string,
  farmId: string,
  locationData: Record<string, any>,
  updatedByUserId?: string,
) {
  const supabase = await createServerSupabaseClient()
  const db = supabase as any

  const payload = sanitizePayload(locationData)

  const { data, error } = await db
    .from('storage_locations')
    .update({
      ...payload,
      updated_by: updatedByUserId ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('farm_id', farmId)
    .select()
    .single()

  if (error) {
    console.error('Error updating storage location:', error)
    return { success: false as const, error: error.message }
  }

  return { success: true as const, data }
}

// ── DELETE (soft-delete) storage location ─────────────────────────────────────

export async function deleteStorageLocation(
  id: string,
  farmId: string,
  deletedByUserId?: string,
) {
  const supabase = await createServerSupabaseClient()
  const db = supabase as any

  const { error } = await db
    .from('storage_locations')
    .update({
      status:     'inactive',
      updated_by: deletedByUserId ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('farm_id', farmId)

  if (error) {
    console.error('Error soft-deleting storage location:', error)
    return { success: false as const, error: error.message }
  }

  return { success: true as const }
}

// ── GET storage stats ─────────────────────────────────────────────────────────

export async function getStorageStats(farmId: string) {
  const supabase = await createServerSupabaseClient()
  const db = supabase as any

  try {
    const { data } = await db
      .from('storage_locations')
      .select('storage_type, status, capacity, capacity_unit')
      .eq('farm_id', farmId)

    const rows = (data as any[]) ?? []

    const active      = rows.filter(r => r.status === 'active').length
    const maintenance = rows.filter(r => r.status === 'maintenance').length
    const total       = rows.length

    const byType = rows.reduce((acc: Record<string, number>, r) => {
      const t = r.storage_type || 'other'
      acc[t] = (acc[t] || 0) + 1
      return acc
    }, {})

    return { total, active, maintenance, byType }
  } catch (err) {
    console.error('Error getting storage stats:', err)
    return { total: 0, active: 0, maintenance: 0, byType: {} }
  }
}
