// app/api/farms/[farmId]/feed-management/animal-categories/[id]/assigned-animals/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
    
    const { id: categoryId } = await params
    const supabase = await createServerSupabaseClient()

    // Verify category exists
    const { data: category, error: categoryError } = await supabase
      .from('animal_categories')
      .select('id')
      .eq('id', categoryId)
      .eq('farm_id', userRole.farm_id)
      .single()

    if (categoryError || !category) {
      return NextResponse.json(
        { error: 'Category not found' }, 
        { status: 404 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')

    // Get animals assigned to this category
    const { data: assignments, error: assignmentError } = await supabase
      .from('animal_category_assignments')
      .select(`
        animal_id,
        animals (
          id,
          tag_number,
          name,
          gender,
          birth_date,
          breed,
          production_status,
          status
        )
      `)
      .eq('farm_id', userRole.farm_id)
      .eq('category_id', categoryId)
      .is('removed_at', null)
      .limit(limit)

    if (assignmentError) {
      console.error('Error fetching assigned animals:', assignmentError)
      return NextResponse.json(
        { error: 'Failed to fetch assigned animals' },
        { status: 500 }
      )
    }

    // Extract and enrich animal data
    const assignedAnimals = (assignments || []).map((assignment: any) => {
      const animal = assignment.animals
      const today = new Date()
      const birthDate = animal.birth_date ? new Date(animal.birth_date) : null
      const ageDays = birthDate 
        ? Math.floor((today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24))
        : null

      return {
        id: animal.id,
        tag_number: animal.tag_number,
        name: animal.name,
        gender: animal.gender,
        birth_date: animal.birth_date,
        breed: animal.breed,
        production_status: animal.production_status,
        status: animal.status,
        age_days: ageDays,
        days_in_milk: null,
        current_daily_production: null
      }
    })

    return NextResponse.json({ 
      success: true, 
      data: assignedAnimals
    })
    
  } catch (error) {
    console.error('Assigned animals GET API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
