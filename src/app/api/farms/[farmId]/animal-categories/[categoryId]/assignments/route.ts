// API endpoint: /api/farms/[farmId]/animal-categories/[categoryId]/assignments
// Purpose: Manage animal assignments for categories with auto-sync and manual modes

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getMatchingAnimals } from '@/lib/database/feedManagementSettings'

// GET: Fetch assignment data for a category (current, suggested, and to-remove animals)
export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ farmId: string; categoryId: string }> }
) {
  try {
    const params = await props.params
    const { farmId, categoryId } = params
    const supabase = await createServerSupabaseClient()

    // Get the current user's ID
    // const { data: { user } } = await supabase.auth.getUser()
    // if (!user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    // // Verify current user has access to this farm (filter by user_id to avoid
    // // .single() failing when there are multiple team members for the same farm)
    // const { data: userFarm } = await supabase
    //   .from('user_roles')
    //   .select('id')
    //   .eq('farm_id', farmId)
    //   .eq('user_id', user.id)
    //   .maybeSingle()

    // if (!userFarm) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    // }

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 })
    }

    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user', success: false }, { status: 400 })
    }

    // Get the category with its characteristics
    const { data: category, error: categoryError } = await supabase
      .from('animal_categories')
      .select('*')
      .eq('id', categoryId)
      .eq('farm_id', farmId)
      .single()

    if (categoryError || !category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    const typedCategory = category as any

    // Get currently assigned animals with full details
    const { data: assignedAnimals } = await supabase
      .from('animal_category_assignments')
      .select(`
        id,
        animal_id,
        assignment_method,
        assigned_at,
        animal:animals (
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
      .is('removed_at', null)

    console.log('📋 Category:', {
      id: typedCategory.id,
      name: typedCategory.name,
      production_status: typedCategory.production_status
    })

    // Get all matching animals based on characteristics (for auto-sync mode)
    const matchingAnimals = await getMatchingAnimals(farmId, typedCategory, 1000)

    // Get ALL animals with matching production status(es) (for manual mode)
    const allAnimalsByProductionStatus: any[] = []

    const targetStatuses = typedCategory.production_statuses && typedCategory.production_statuses.length > 0
      ? typedCategory.production_statuses
      : typedCategory.production_status
        ? [typedCategory.production_status]
        : []

    if (targetStatuses.length > 0) {
      const { data: baseAnimals, error: animalsError } = await supabase
        .from('animals')
        .select('id, tag_number, name, gender, birth_date, production_status, status')
        .eq('farm_id', farmId)
        .in('production_status', targetStatuses)
        .eq('status', 'active')
        .order('tag_number', { ascending: true })

      console.log('🐄 baseAnimals query:', {
        production_statuses: targetStatuses,
        count: baseAnimals?.length || 0,
        error: animalsError?.message
      })

      if (baseAnimals && baseAnimals.length > 0) {
        const animalIds = (baseAnimals as any[]).map(a => a.id)
        const { data: lactationData } = await supabase
          .from('lactation_cycle_records')
          .select('animal_id, days_in_milk, current_average_production')
          .in('animal_id', animalIds)
          .is('actual_end_date', null)

        const lactationMap = new Map()
        ;(lactationData as any[] || []).forEach(rec => {
          if (!lactationMap.has(rec.animal_id)) lactationMap.set(rec.animal_id, rec)
        })

        const today = new Date()
        const enrichedAnimals = (baseAnimals as any[]).map(animal => {
          const lactRec = lactationMap.get(animal.id)
          return {
            ...animal,
            status: animal.status || 'active',
            days_in_milk: lactRec?.days_in_milk || null,
            current_daily_production: lactRec?.current_average_production || null,
            age_days: animal.birth_date
              ? Math.floor((today.getTime() - new Date(animal.birth_date).getTime()) / (1000 * 60 * 60 * 24))
              : null
          }
        })

        console.log('✅ enrichedAnimals:', enrichedAnimals.length)
        allAnimalsByProductionStatus.push(...enrichedAnimals)
      }
    } else {
      console.log('⚠️ No production_status or production_statuses defined for category')
    }

    // Fetch active assignments in OTHER categories so we can flag animals already placed
    const allCandidateIds = [
      ...new Set([
        ...matchingAnimals.map(a => a.id),
        ...allAnimalsByProductionStatus.map(a => a.id)
      ])
    ]

    const assignedElsewhereMap = new Map<string, { category_id: string; category_name: string }>()
    if (allCandidateIds.length > 0) {
      const { data: otherAssignments } = await (supabase as any)
        .from('animal_category_assignments')
        .select('animal_id, category_id, animal_categories(name)')
        .in('animal_id', allCandidateIds)
        .neq('category_id', categoryId)
        .is('removed_at', null)

      for (const row of (otherAssignments || [])) {
        assignedElsewhereMap.set(row.animal_id, {
          category_id: row.category_id,
          category_name: row.animal_categories?.name ?? 'Unknown category'
        })
      }
    }

    const attachCurrentCategory = (animal: any) => ({
      ...animal,
      current_category: assignedElsewhereMap.get(animal.id) ?? null
    })

    // Determine animals that don't match anymore (assigned but not in matching list)
    const matchingAnimalIds = matchingAnimals.map(a => a.id)
    const assignedButNotMatching = (assignedAnimals as any[] || [])
      .filter(a => !matchingAnimalIds.includes(a.animal_id))
      .map(a => a.animals)
      .filter(a => a)

    return NextResponse.json({
      success: true,
      data: {
        category: typedCategory,
        assignedAnimals: assignedAnimals || [],
        matchingAnimals: matchingAnimals.map(attachCurrentCategory),
        allAnimalsByProductionStatus: allAnimalsByProductionStatus.map(attachCurrentCategory),
        animalsToRemove: assignedButNotMatching || []
      },
      debug: {
        assignedCount: assignedAnimals?.length || 0,
        matchingCount: matchingAnimals?.length || 0,
        productionStatusCount: allAnimalsByProductionStatus?.length || 0,
        removeCount: assignedButNotMatching?.length || 0
      }
    })
  } catch (error) {
    console.error('Error fetching assignments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch assignments' },
      { status: 500 }
    )
  }
}

// POST: Add animal to category (manual assignment)
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ farmId: string; categoryId: string }> }
) {
  try {
    const params = await props.params
    const { farmId, categoryId } = params
    const supabase = await createServerSupabaseClient()
    const body = await request.json()
    const { animal_id, assignment_method = 'manual', notes } = body

    // Authenticate user
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 })
    }

    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user', success: false }, { status: 400 })
    }

    // Check if animal is already actively assigned to ANY category
    const { data: existingAnyAssignment } = await (supabase as any)
      .from('animal_category_assignments')
      .select('id, category_id, animal_categories(name)')
      .eq('animal_id', animal_id)
      .is('removed_at', null)
      .maybeSingle()

    if (existingAnyAssignment) {
      const isSameCategory = existingAnyAssignment.category_id === categoryId
      if (isSameCategory) {
        return NextResponse.json(
          { error: 'Animal already assigned to this category' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        {
          error: 'Animal is already assigned to another category. Use the transfer endpoint to move it.',
          current_category_id: existingAnyAssignment.category_id,
          current_category_name: existingAnyAssignment.animal_categories?.name ?? 'Unknown category'
        },
        { status: 409 }
      )
    }

    // Always create a NEW assignment record (don't reuse soft-deleted ones)
    // This ensures complete audit trail with transfer_date for each assignment
    // Double-check this specific category (prevent race conditions)
    const { data: categoryCheckAssignment } = await (supabase as any)
      .from('animal_category_assignments')
      .select('id')
      .eq('animal_id', animal_id)
      .eq('category_id', categoryId)
      .is('removed_at', null)
      .maybeSingle()

    if (categoryCheckAssignment) {
      return NextResponse.json(
        { error: 'Animal is already assigned to this category' },
        { status: 409 }
      )
    }

    console.log('✅ Creating new assignment:', { animal_id, categoryId, farmId })
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await (supabase
      .from('animal_category_assignments') as any)
      .insert({
        farm_id: farmId,
        animal_id,
        category_id: categoryId,
        assignment_method,
        transfer_date: today,
        notes
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Error creating assignment:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      data
    })
  } catch (error) {
    console.error('Error adding assignment:', error)
    return NextResponse.json(
      { error: 'Failed to add assignment' },
      { status: 500 }
    )
  }
}

// DELETE: Remove animal from category (soft delete using removed_at)
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ farmId: string; categoryId: string }> }
) {
  try {
    const params = await props.params
    const { farmId, categoryId } = params
    const supabase = await createServerSupabaseClient()
    const body = await request.json()
    const { animal_id, notes } = body

    console.log('🔍 DELETE assignments - Debug:', { farmId, categoryId, animal_id })

    // Authenticate user
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 })
    }

    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user', success: false }, { status: 400 })
    }

    // Soft delete the assignment
    console.log('🗑️ Soft-deleting assignment:', { animal_id, categoryId })
    const { data, error } = await (supabase
      .from('animal_category_assignments') as any)
      .update({
        removed_at: new Date().toISOString(),
        notes
      })
      .eq('animal_id', animal_id)
      .eq('category_id', categoryId)
      .is('removed_at', null)
      .select()
      .single()

    if (error) {
      console.error('❌ Error deleting assignment:', error)
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      )
    }

    console.log('✅ Assignment soft-deleted')
    return NextResponse.json({
      success: true,
      data
    })
  } catch (error) {
    console.error('Error removing assignment:', error)
    return NextResponse.json(
      { error: 'Failed to remove assignment' },
      { status: 500 }
    )
  }
}
