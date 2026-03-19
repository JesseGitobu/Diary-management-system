// app/api/farms/[farmId]/feed-management/animal-categories/[id]/matching-animals/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { 
  getAssignedAnimals,
  AnimalCategory 
} from '@/lib/database/feedManagementSettings'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ farmId: string; id: string }> }
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
    
    const { farmId, id: categoryId } = await params
    
    // Validate farm access - ensure farm_id from route matches user's farm_id
    if (farmId !== userRole.farm_id) {
      return NextResponse.json(
        { error: 'Unauthorized farm access' },
        { status: 403 }
      )
    }

    // Get the category details
    const supabase = await createServerSupabaseClient()
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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')

    // Get assigned animals for this farm and category from animal_category_assignments table
    const assignedAnimals = await getAssignedAnimals(
      farmId,
      categoryId, 
      limit
    )
    
    return NextResponse.json({ 
      success: true, 
      data: assignedAnimals
    })
    
  } catch (error) {
    console.error('Matching animals GET API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}