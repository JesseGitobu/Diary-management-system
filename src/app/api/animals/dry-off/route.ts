// src/app/api/animals/dry-off/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  createDryOffRecord,
  getDryOffRecordsByAnimal,
  getCurrentLactationContext,
  closeLactationCycle,
  type CreateDryOffRecordInput,
} from '@/lib/database/dry-off'

// ─── POST: create a dry-off record ──────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }

    if (!['farm_owner', 'farm_manager', 'worker'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const {
      farm_id,
      animal_id,
      dry_off_date,
      dry_off_reason,
      last_milk_yield,
      lactation_number,
      days_in_milk,
      service_record_id,
      expected_calving_date,
      expected_dry_period_days,
      dry_cow_therapy,
      treatment_notes,
      notes,
      update_production_status,
    } = body

    // Validate farm ownership
    if (farm_id !== userRole.farm_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Required field validation
    if (!animal_id || !dry_off_date || !dry_off_reason) {
      return NextResponse.json(
        { error: 'animal_id, dry_off_date, and dry_off_reason are required' },
        { status: 400 }
      )
    }

    const validReasons = [
      'end_of_lactation', 'low_production', 'health_issue',
      'pregnancy', 'involuntary', 'other',
    ]
    if (!validReasons.includes(dry_off_reason)) {
      return NextResponse.json(
        { error: `Invalid dry_off_reason. Must be one of: ${validReasons.join(', ')}` },
        { status: 400 }
      )
    }

    // Pull current lactation context to enrich the record if caller didn't supply it
    const lactation = await getCurrentLactationContext(animal_id)

    // Create the dry-off record
    const input: CreateDryOffRecordInput = {
      farm_id,
      animal_id,
      dry_off_date,
      dry_off_reason,
      last_milk_yield: last_milk_yield ?? lactation?.last_milk_yield ?? null,
      lactation_number: lactation_number ?? lactation?.lactation_number ?? null,
      days_in_milk: days_in_milk ?? lactation?.days_in_milk ?? null,
      service_record_id: service_record_id ?? null,
      expected_calving_date: expected_calving_date ?? null,
      expected_dry_period_days: expected_dry_period_days ?? 60,
      dry_cow_therapy: dry_cow_therapy ?? false,
      treatment_notes: treatment_notes ?? null,
      notes: notes ?? null,
      recorded_by: user.id,
    }

    const result = await createDryOffRecord(input)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    // Close the active lactation cycle
    if (lactation?.id) {
      await closeLactationCycle(lactation.id, dry_off_date, dry_off_reason)
    }

    // Determine the target production status:
    //   pregnancy reason            → steaming_dry_cows (pregnant, preparing for calving)
    //   any reason + calving date   → steaming_dry_cows (has upcoming calving, treat as steaming)
    //   everything else             → open_culling_dry_cows (no pregnancy context)
    const targetProductionStatus =
      dry_off_reason === 'pregnancy' || !!expected_calving_date
        ? 'steaming_dry_cows'
        : 'open_culling_dry_cows'

    if (update_production_status !== false) {
      const supabase = await createServerSupabaseClient()
      const { error: statusError } = await (supabase as any)
        .from('animals')
        .update({ production_status: targetProductionStatus })
        .eq('id', animal_id)
        .eq('farm_id', farm_id)

      if (statusError) {
        console.warn('⚠️ [dry-off] Failed to update animal production_status:', statusError.message)
      }
    }

    return NextResponse.json({
      success: true,
      record: result.data,
      production_status: targetProductionStatus,
      message: 'Dry-off record created successfully',
    })
  } catch (error: any) {
    console.error('❌ Dry-off API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── GET: list dry-off records for an animal ─────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const animalId = searchParams.get('animal_id')

    if (!animalId) {
      return NextResponse.json({ error: 'animal_id is required' }, { status: 400 })
    }

    const records = await getDryOffRecordsByAnimal(animalId, userRole.farm_id)

    return NextResponse.json({ success: true, records })
  } catch (error: any) {
    console.error('❌ Dry-off GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
