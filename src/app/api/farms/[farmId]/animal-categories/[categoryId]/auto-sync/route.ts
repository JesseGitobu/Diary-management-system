// API endpoint: /api/farms/[farmId]/animal-categories/[categoryId]/auto-sync
// Purpose: Automatically sync animals to categories based on characteristics

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getMatchingAnimals } from '@/lib/database/feedManagementSettings'

export async function POST(
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

    // Get all animals that match the characteristics
    const matchingAnimals = await getMatchingAnimals(farmId, category, 1000)
    const matchingAnimalIds = matchingAnimals.map(a => a.id)

    // Get currently assigned animals
    const { data: currentAssignments } = await (supabase
      .from('animal_category_assignments') as any)
      .select('animal_id')
      .eq('farm_id', farmId)
      .eq('category_id', categoryId)
      .is('removed_at', null)

    const currentAnimalIds = (currentAssignments || []).map((a: any) => a.animal_id)

    // Determine animals to add (match but not assigned)
    const animalIdsToAdd = matchingAnimalIds.filter((id: string) => !currentAnimalIds.includes(id))

    // Determine animals to remove (assigned but don't match)
    const animalIdsToRemove = currentAnimalIds.filter((id: string) => !matchingAnimalIds.includes(id))

    // Transaction: add new assignments and remove non-matching ones
    const { data: addedAssignments, error: addError } = await (supabase
      .from('animal_category_assignments') as any)
      .insert(
        animalIdsToAdd.map((animalId: string) => ({
          farm_id: farmId,
          animal_id: animalId,
          category_id: categoryId,
          assignment_method: 'auto',
          notes: 'Automatically synced based on category characteristics'
        }))
      )
      .select()

    if (addError && animalIdsToAdd.length > 0) {
      console.error('Error adding assignments:', addError)
      return NextResponse.json(
        { error: 'Failed to add assignments' },
        { status: 500 }
      )
    }

    // Remove assignments that no longer match
    const { error: removeError } = await (supabase
      .from('animal_category_assignments') as any)
      .update({
        removed_at: new Date().toISOString(),
        notes: 'Automatically removed - animal no longer matches category characteristics'
      })
      .eq('farm_id', farmId)
      .eq('category_id', categoryId)
      .in('animal_id', animalIdsToRemove)
      .is('removed_at', null)

    if (removeError && animalIdsToRemove.length > 0) {
      console.error('Error removing assignments:', removeError)
      return NextResponse.json(
        { error: 'Failed to remove assignments' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        category,
        added: animalIdsToAdd.length,
        removed: animalIdsToRemove.length,
        total: matchingAnimalIds.length,
        summary: {
          animalIdsAdded: animalIdsToAdd,
          animalIdsRemoved: animalIdsToRemove
        }
      }
    })
  } catch (error) {
    console.error('Error auto-syncing assignments:', error)
    return NextResponse.json(
      { error: 'Failed to auto-sync assignments' },
      { status: 500 }
    )
  }
}
