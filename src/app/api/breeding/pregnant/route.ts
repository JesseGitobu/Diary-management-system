// src/app/api/breeding/pregnant/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { differenceInDays } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id)
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }
    
    const supabase = await createServerSupabaseClient()
    
    // Get farmId from query params
    const { searchParams } = new URL(request.url)
    const farmId = searchParams.get('farmId')
    
    if (!farmId) {
      return NextResponse.json(
        { success: false, error: 'Farm ID is required' },
        { status: 400 }
      )
    }

    console.log('📋 [PREGNANT-ANIMALS] Fetching for farm:', farmId)

    // Get all pregnancy records with confirmed status and no calving date
    const { data: pregnancyRecords, error } = await supabase
      .from('pregnancy_records')
      .select(`
        id,
        animal_id,
        breeding_record_id,
        expected_calving_date,
        pregnancy_status,
        breeding_records!pregnancy_records_breeding_record_id_fkey (
          breeding_date,
          breeding_type
        ),
        animals!pregnancy_records_animal_id_fkey (
          id,
          tag_number,
          name
        )
      `)
      .eq('farm_id', farmId)
      .eq('pregnancy_status', 'confirmed')
      .is('actual_calving_date', null)
      .order('expected_calving_date', { ascending: true })

    if (error) {
      console.error('❌ [PREGNANT-ANIMALS] Error:', error)
      throw error
    }

    console.log('✅ [PREGNANT-ANIMALS] Found records:', pregnancyRecords?.length || 0)

    // Transform data for the component
    const today = new Date()
    
    const pregnantAnimals = pregnancyRecords?.map(record => {
      const breedingDate = record.breeding_records?.breeding_date
      const expectedDueDate = record.expected_calving_date
      
      // Calculate days pregnant
      const daysPregnant = breedingDate 
        ? differenceInDays(today, new Date(breedingDate))
        : 0
      
      // Calculate days until due
      const daysUntilDue = expectedDueDate
        ? differenceInDays(new Date(expectedDueDate), today)
        : 999
      
      // Determine status
      let status: 'normal' | 'overdue' | 'due_soon' = 'normal'
      if (daysUntilDue < 0) {
        status = 'overdue'
      } else if (daysUntilDue <= 7) {
        status = 'due_soon'
      }
      
      return {
        id: record.id,
        animal_id: record.animal_id,
        tag_number: record.animals?.tag_number || 'Unknown',
        name: record.animals?.name,
        estimated_due_date: expectedDueDate || '',
        days_pregnant: daysPregnant,
        conception_date: breedingDate || '',
        status,
        pregnancy_status: record.pregnancy_status
      }
    }) || []

    return NextResponse.json({
      success: true,
      pregnantAnimals
    })

  } catch (error: any) {
    console.error('❌ [PREGNANT-ANIMALS] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch pregnant animals' },
      { status: 500 }
    )
  }
}