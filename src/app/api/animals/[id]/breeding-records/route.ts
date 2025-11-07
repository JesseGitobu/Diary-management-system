
// src/app/api/animals/[id]/breeding-records/route.ts
// Updated to use unified breeding service

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { 
  getUnifiedBreedingHistory,
  createUnifiedBreedingRecord 
} from '@/lib/database/breeding-sync'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: animalId } = await params

    console.log('📋 Fetching unified breeding history for:', animalId)

    // Get unified data from both tables
    const history = await getUnifiedBreedingHistory(animalId, true)

    // Transform for frontend compatibility
    const transformedRecords = history.breedingRecords.map(record => {
      const pregnancy = history.pregnancyRecords.find(
        p => p.breeding_record_id === record.id
      )

      return {
        id: record.id,
        animal_id: record.animal_id,
        breeding_date: record.breeding_date,
        breeding_method: record.breeding_type,
        sire_tag: record.sire_name,
        sire_breed: record.sire_breed,
        expected_calving_date: pregnancy?.expected_calving_date,
        actual_calving_date: pregnancy?.actual_calving_date,
        pregnancy_confirmed: pregnancy?.pregnancy_status === 'confirmed',
        pregnancy_check_date: pregnancy?.confirmed_date,
        pregnancy_status: mapPregnancyStatus(pregnancy?.pregnancy_status),
        gestation_period: pregnancy?.gestation_length || 280,
        breeding_notes: record.notes,
        veterinarian: record.technician_name,
        breeding_cost: record.cost,
        created_at: record.created_at,
        updated_at: record.updated_at,
        auto_generated: record.auto_generated
      }
    })

    return NextResponse.json({
      success: true,
      breedingRecords: transformedRecords,
      events: history.events,
      pregnancyRecords: history.pregnancyRecords
    })

  } catch (error: any) {
    console.error('❌ Error fetching breeding history:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id)
    if (!userRole?.farm_id) {
      return NextResponse.json(
        { error: 'No farm associated with user' },
        { status: 400 }
      )
    }

    const { id: animalId } = await params
    const body = await request.json()

    console.log('📝 Creating unified breeding record')

    // Validate animal belongs to farm
    const { createServerSupabaseClient } = await import('@/lib/supabase/server')
    const supabase = await createServerSupabaseClient()
    
    const { data: animal } = await supabase
      .from('animals')
      .select('id, farm_id')
      .eq('id', animalId)
      .eq('farm_id', userRole.farm_id)
      .single()

    if (!animal) {
      return NextResponse.json(
        { error: 'Animal not found or access denied' },
        { status: 404 }
      )
    }

    // Create unified breeding record (creates in both tables)
    const result = await createUnifiedBreedingRecord(
      {
        animal_id: animalId,
        farm_id: userRole.farm_id,
        breeding_date: body.breeding_date,
        breeding_method: body.breeding_method,
        sire_tag: body.sire_tag,
        sire_breed: body.sire_breed,
        veterinarian: body.veterinarian,
        breeding_cost: body.breeding_cost,
        breeding_notes: body.breeding_notes,
        pregnancy_status: 'pending',
        auto_generated: body.auto_generated || false
      },
      user.id,
      true
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    // Update animal status to 'served'
    await supabase
      .from('animals')
      .update({
        production_status: 'served',
        updated_at: new Date().toISOString()
      })
      .eq('id', animalId)

    return NextResponse.json({
      success: true,
      breedingRecord: result.data,
      message: 'Breeding record created successfully'
    })

  } catch (error: any) {
    console.error('❌ Error creating breeding record:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

function mapPregnancyStatus(dbStatus: string | undefined): string {
  if (!dbStatus) return 'pending'
  switch (dbStatus) {
    case 'suspected': return 'pending'
    case 'confirmed': return 'confirmed'
    case 'false': return 'negative'
    case 'aborted': return 'aborted'
    case 'completed': return 'completed'
    default: return 'pending'
  }
}