// API endpoint: /api/farms/[farmId]/animal-categories/[categoryId]/assignments
// Purpose: Manage animal assignments for categories with auto-sync and manual modes

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getMatchingAnimals } from '@/lib/database/feedManagementSettings'

// GET: Fetch assignment data for a category (current, suggested, and to-remove animals)
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ farmId: string; categoryId: string }> }
) {
  try {
    const params = await props.params
    const { farmId, categoryId } = params
    const supabase = await createServerSupabaseClient()

    // Verify user has access to this farm
    const { data: userFarm } = await supabase
      .from('user_roles')
      .select('id')
      .eq('farm_id', farmId)
      .single()

    if (!userFarm) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
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
    // This allows users to manually add any animal regardless of characteristics
    const allAnimalsByProductionStatus: any[] = []
    
    // Support both single production_status and multiple production_statuses
    const targetStatuses = typedCategory.production_statuses && typedCategory.production_statuses.length > 0
      ? typedCategory.production_statuses
      : typedCategory.production_status 
        ? [typedCategory.production_status]
        : []
    
    if (targetStatuses.length > 0) {
      // Query base animal data for all target production statuses
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
        // Get lactation data for enrichment
        const animalIds = (baseAnimals as any[]).map(a => a.id)
        const { data: lactationData } = await supabase
          .from('lactation_cycle_records')
          .select('animal_id, days_in_milk, current_daily_production, current_average_production')
          .in('animal_id', animalIds)
          .is('actual_end_date', null) // Get active lactation records

        const lactationMap = new Map()
        ;(lactationData as any[] || []).forEach(rec => {
          if (!lactationMap.has(rec.animal_id)) {
            lactationMap.set(rec.animal_id, rec)
          }
        })

        // Enrich animals with lactation data and calculated fields
        const today = new Date()
        const enrichedAnimals = (baseAnimals as any[]).map(animal => {
          const lactRec = lactationMap.get(animal.id)
          return {
            ...animal,
            status: animal.status || 'active',
            days_in_milk: lactRec?.days_in_milk || null,
            current_daily_production: lactRec?.current_daily_production || lactRec?.current_average_production || null,
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

    // Determine animals that don't match anymore (assigned but not in matching list)
    const matchingAnimalIds = matchingAnimals.map(a => a.id)
    const assignedButNotMatching = (assignedAnimals as any[] || [])
      .filter(a => !matchingAnimalIds.includes(a.animal_id))
      .map(a => a.animals)
      .filter(a => a) // Remove null entries

    return NextResponse.json({
      success: true,
      data: {
        category: typedCategory,
        assignedAnimals: assignedAnimals || [],
        matchingAnimals: matchingAnimals || [],
        allAnimalsByProductionStatus: allAnimalsByProductionStatus || [],
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

    // Verify user has access to this farm
    const { data: userFarm } = await supabase
      .from('user_roles')
      .select('id')
      .eq('farm_id', farmId)
      .single()

    if (!userFarm) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check if assignment already exists
    const { data: existingAssignment } = await supabase
      .from('animal_category_assignments')
      .select('id')
      .eq('animal_id', animal_id)
      .eq('category_id', categoryId)
      .is('removed_at', null)
      .single()

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'Animal already assigned to this category' },
        { status: 409 }
      )
    }

    // Check if there's a soft-deleted assignment that can be reactivated
    const { data: softDeletedAssignment } = await (supabase
      .from('animal_category_assignments') as any)
      .select('id')
      .eq('animal_id', animal_id)
      .eq('category_id', categoryId)
      .not('removed_at', 'is', null)
      .single()

    let result
    if (softDeletedAssignment) {
      // Reactivate soft-deleted assignment
      console.log('🔄 Reactivating soft-deleted assignment:', { animal_id, categoryId })
      const { data, error } = await (supabase
        .from('animal_category_assignments') as any)
        .update({
          removed_at: null,
          assignment_method,
          assigned_at: new Date().toISOString(),
          notes
        })
        .eq('id', softDeletedAssignment.id)
        .select()
        .single()

      if (error) {
        console.error('❌ Error reactivating assignment:', error)
        throw error
      }
      result = data
    } else {
      // Create new assignment
      console.log('✅ Creating new assignment:', { animal_id, categoryId, farmId })
      const { data, error } = await (supabase
        .from('animal_category_assignments') as any)
        .insert({
          farm_id: farmId,
          animal_id,
          category_id: categoryId,
          assignment_method,
          notes
        })
        .select()
        .single()

      if (error) {
        console.error('❌ Error creating assignment:', error)
        throw error
      }
      result = data
    }

    return NextResponse.json({
      success: true,
      data: result
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

    // Verify user has access to this farm
    const { data: userFarm } = await supabase
      .from('user_roles')
      .select('id')
      .eq('farm_id', farmId)
      .single()

    if (!userFarm) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
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
