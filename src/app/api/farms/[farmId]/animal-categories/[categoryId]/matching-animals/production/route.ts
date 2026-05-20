// api/farms/[farmId]/animal-categories/[categoryId]/matching-animals/Production/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ farmId: string; categoryId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }

    const { farmId, categoryId } = await params

    if (farmId !== userRole.farm_id) {
      return NextResponse.json({ error: 'Unauthorized farm access' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    
    // Accept an optional record_date; fall back to today
    const recordDate = searchParams.get('record_date') 
      || new Date().toISOString().split('T')[0]

    const supabase = await createServerSupabaseClient()

    // Confirm category exists and belongs to this farm
    const { data: category, error: categoryError } = await supabase
      .from('animal_categories')
      .select('id')
      .eq('id', categoryId)
      .eq('farm_id', farmId)
      .single()

    if (categoryError || !category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Fetch animals that were assigned to this category ON the record_date
    // An animal was in this category on record_date if:
    //   transfer_date <= record_date
    //   AND (removed_at IS NULL OR DATE(removed_at) > record_date)
    const { data: assignments, error: assignmentError } = await (supabase as any)
      .from('animal_category_assignments')
      .select(`
        animal_id,
        transfer_date,
        removed_at,
        animals!inner (
          id,
          tag_number,
          name,
          gender,
          birth_date,
          production_status,
          status
        )
      `)
      .eq('farm_id', farmId)
      .eq('category_id', categoryId)
      .eq('animals.status', 'active')
      .lte('transfer_date', recordDate)           // joined on or before record_date
      .or(`removed_at.is.null,removed_at.gt.${recordDate}T23:59:59Z`) // still there on that day
      .order('animals(tag_number)', { ascending: true })
      .limit(limit)

    if (assignmentError) {
      console.error('Error fetching point-in-time assignments:', assignmentError)
      return NextResponse.json({ error: 'Failed to fetch animals' }, { status: 500 })
    }

    // Enrich with lactation data
    const animalIds = (assignments || []).map((a: any) => a.animal_id)

    let lactationMap = new Map<string, any>()
    if (animalIds.length > 0) {
      const { data: lactationData } = await supabase
        .from('lactation_cycle_records')
        .select('animal_id, days_in_milk, current_average_production, peak_yield_litres')
        .in('animal_id', animalIds)
        .order('created_at', { ascending: false })

      ;(lactationData || []).forEach((rec: any) => {
        if (!lactationMap.has(rec.animal_id)) lactationMap.set(rec.animal_id, rec)
      })
    }

    const today = new Date()
    const result = (assignments || []).map((assignment: any) => {
      const animal = assignment.animals
      const lactRec = lactationMap.get(assignment.animal_id)
      return {
        id: animal.id,
        tag_number: animal.tag_number,
        name: animal.name || null,
        gender: animal.gender || null,
        birth_date: animal.birth_date || null,
        production_status: animal.production_status || null,
        status: animal.status || 'active',
        days_in_milk: lactRec?.days_in_milk || null,
        current_daily_production: lactRec?.current_average_production || lactRec?.peak_yield_litres || null,
        current_average_production: lactRec?.current_average_production || null,
        age_days: animal.birth_date
          ? Math.floor((today.getTime() - new Date(animal.birth_date).getTime()) / (1000 * 60 * 60 * 24))
          : null
      }
    })

    return NextResponse.json({ success: true, data: result })

  } catch (error) {
    console.error('Matching animals GET API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}