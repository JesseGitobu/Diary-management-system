// app/api/farms/[farmId]/feed-management/animal-categories/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { 
  getAnimalCategories, 
  createAnimalCategory,
  AnimalCategory 
} from '@/lib/database/feedManagementSettings'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id) as any
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }
    
    const categories = await getAnimalCategories(userRole.farm_id)
    
    return NextResponse.json({ 
      success: true, 
      data: categories 
    })
    
  } catch (error) {
    console.error('Animal categories GET API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id) as any
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }
    
    // Check permissions
    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    const body = await request.json()
    
    // Validate required fields
    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: 'Category name is required' }, 
        { status: 400 }
      )
    }

    // Prepare category data
    const categoryData: Omit<AnimalCategory, 'id' | 'farm_id' | 'created_at' | 'updated_at' | 'matching_animals_count'> = {
      name: body.name.trim(),
      description: body.description || null,
      min_age_days: body.min_age_days || null,
      max_age_days: body.max_age_days || null,
      gender: body.gender || null,
      characteristics: body.characteristics || {},
      is_default: body.is_default || false,
      sort_order: body.sort_order || null
    }
    
    const result = await createAnimalCategory(userRole.farm_id, categoryData)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: true, 
      data: result.data,
      message: 'Animal category created successfully'
    })
    
  } catch (error) {
    console.error('Animal categories POST API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}