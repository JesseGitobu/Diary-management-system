// app/api/farms/[farmId]/feed-management/animal-categories/[id]/matching-animals/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { 
  getMatchingAnimals,
  AnimalCategory 
} from '@/lib/database/feedManagementSettings'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id)
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }
    
    const { id: categoryId } = await params

    // Get the category details
    const supabase = await createServerSupabaseClient()
    const { data: category, error: categoryError } = await supabase
      .from('animal_categories')
      .select('*')
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
    const limit = parseInt(searchParams.get('limit') || '50')

    // Get matching animals
    const matchingAnimals = await getMatchingAnimals(
      userRole.farm_id, 
      category as AnimalCategory, 
      limit
    )
    
    return NextResponse.json({ 
      success: true, 
      data: {
        category: category,
        animals: matchingAnimals,
        total_count: matchingAnimals.length
      }
    })
    
  } catch (error) {
    console.error('Matching animals GET API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}