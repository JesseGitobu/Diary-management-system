// API endpoint: /api/farms/[farmId]/animal-categories/[categoryId]/transfer
// Purpose: Atomically move an animal from its current category into this one.
//
// POST body: { animal_id, notes? }
//   - Soft-deletes the animal's existing active assignment (any category).
//   - Creates a new manual assignment in [categoryId].

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ farmId: string; categoryId: string }> }
) {
  try {
    const params = await props.params
    const { farmId, categoryId } = params
    const supabase = await createServerSupabaseClient()
    const body = await request.json()
    const { animal_id, notes } = body

    if (!animal_id) {
      return NextResponse.json({ error: 'animal_id is required' }, { status: 400 })
    }

    // Auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: userFarm } = await supabase
      .from('user_roles')
      .select('id')
      .eq('farm_id', farmId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!userFarm) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Verify target category belongs to this farm
    const { data: targetCategory } = await supabase
      .from('animal_categories')
      .select('id, name')
      .eq('id', categoryId)
      .eq('farm_id', farmId)
      .maybeSingle()

    if (!targetCategory) {
      return NextResponse.json({ error: 'Target category not found' }, { status: 404 })
    }

    // Find the animal's current active assignment (any category)
    const { data: currentAssignment } = await (supabase as any)
      .from('animal_category_assignments')
      .select('id, category_id, animal_categories(name)')
      .eq('animal_id', animal_id)
      .eq('farm_id', farmId)
      .is('removed_at', null)
      .maybeSingle()

    if (currentAssignment?.category_id === categoryId) {
      return NextResponse.json(
        { error: 'Animal is already in the target category' },
        { status: 409 }
      )
    }

    const now = new Date().toISOString()

    // 1. Soft-delete the existing assignment (if any)
    if (currentAssignment) {
      const { error: removeError } = await (supabase as any)
        .from('animal_category_assignments')
        .update({
          removed_at: now,
          notes: notes
            ? `Transferred to ${(targetCategory as any).name}: ${notes}`
            : `Transferred to ${(targetCategory as any).name}`
        })
        .eq('id', currentAssignment.id)

      if (removeError) {
        console.error('Transfer: failed to remove old assignment:', removeError)
        return NextResponse.json({ error: 'Failed to remove current assignment' }, { status: 500 })
      }
    }

    // 2. Reactivate a prior soft-deleted assignment for the target category, or create new
    const { data: priorAssignment } = await (supabase as any)
      .from('animal_category_assignments')
      .select('id')
      .eq('animal_id', animal_id)
      .eq('category_id', categoryId)
      .not('removed_at', 'is', null)
      .maybeSingle()

    let result
    if (priorAssignment) {
      const { data, error } = await (supabase as any)
        .from('animal_category_assignments')
        .update({
          removed_at: null,
          assignment_method: 'manual',
          assigned_at: now,
          notes: notes || `Transferred from ${currentAssignment?.animal_categories?.name ?? 'previous category'}`
        })
        .eq('id', priorAssignment.id)
        .select()
        .single()

      if (error) throw error
      result = data
    } else {
      const { data, error } = await (supabase as any)
        .from('animal_category_assignments')
        .insert({
          farm_id: farmId,
          animal_id,
          category_id: categoryId,
          assignment_method: 'manual',
          assigned_at: now,
          notes: notes || `Transferred from ${currentAssignment?.animal_categories?.name ?? 'previous category'}`
        })
        .select()
        .single()

      if (error) throw error
      result = data
    }

    return NextResponse.json({
      success: true,
      data: result,
      from_category: currentAssignment
        ? {
            id: currentAssignment.category_id,
            name: currentAssignment.animal_categories?.name ?? 'Unknown'
          }
        : null,
      to_category: { id: categoryId, name: (targetCategory as any).name }
    })
  } catch (error) {
    console.error('Transfer error:', error)
    return NextResponse.json({ error: 'Failed to transfer animal' }, { status: 500 })
  }
}
