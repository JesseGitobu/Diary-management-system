// /api/animal-categories/[farmId]

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ farmId: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { farmId } = await params
    const supabase = await createServerSupabaseClient()

    // Fetch all animal categories for the farm
    const { data: categories, error: categoriesError } = await supabase
      .from('animal_categories')
      .select('id, name, description, is_active, sort_order, gender, production_status')
      .eq('farm_id', farmId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (categoriesError) {
      return NextResponse.json({ 
        categories: [], 
        animalCategoryMap: {}
      })
    }

    // If no categories exist, return empty map
    if (!categories || categories.length === 0) {
      return NextResponse.json({
        categories: [],
        animalCategoryMap: {}
      })
    }

    // Fetch all category assignments only if we have categories
    const categoryIds = (categories as any[]).map((c: any) => c.id)
    
    const { data: assignments, error: assignmentsError } = await supabase
      .from('animal_category_assignments')
      .select('animal_id, category_id')
      .in('category_id', categoryIds)
      .is('removed_at', null)

    if (assignmentsError) {
      return NextResponse.json({ 
        categories, 
        animalCategoryMap: {}
      })
    }

    // Build map of category_id -> animal_ids
    const animalCategoryMap: Record<string, string[]> = {}
    
    if (categories) {
      categories.forEach((category: any) => {
        animalCategoryMap[category.id] = []
      })
    }

    if (assignments) {
      assignments.forEach((assignment: any) => {
        if (!animalCategoryMap[assignment.category_id]) {
          animalCategoryMap[assignment.category_id] = []
        }
        animalCategoryMap[assignment.category_id].push(assignment.animal_id)
      })
    }

    return NextResponse.json({
      categories: categories || [],
      animalCategoryMap
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch categories'
    
    return NextResponse.json(
      { 
        error: errorMessage,
        categories: [],
        animalCategoryMap: {}
      },
      { status: 500 }
    )
  }
}
