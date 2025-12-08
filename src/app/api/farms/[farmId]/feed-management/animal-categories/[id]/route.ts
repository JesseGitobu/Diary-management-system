// app/api/farms/[farmId]/feed-management/animal-categories/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { 
  updateAnimalCategory, 
  deleteAnimalCategory,
  AnimalCategory 
} from '@/lib/database/feedManagementSettings'

export async function PUT(
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
    
    // Check permissions
    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    const body = await request.json()
    const { id: categoryId } = await params
    
    // Validate required fields
    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: 'Category name is required' }, 
        { status: 400 }
      )
    }

    // Prepare update data
    const updateData: Partial<Omit<AnimalCategory, 'id' | 'farm_id' | 'created_at' | 'updated_at' | 'matching_animals_count'>> = {
      name: body.name.trim(),
      description: body.description || null,
      min_age_days: body.min_age_days || null,
      max_age_days: body.max_age_days || null,
      gender: body.gender || null,
      characteristics: body.characteristics || {},
      is_default: body.is_default || false
    }
    
    const result = await updateAnimalCategory(categoryId, userRole.farm_id, updateData)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: true, 
      data: result.data,
      message: 'Animal category updated successfully'
    })
    
  } catch (error) {
    console.error('Animal category PUT API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
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
    
    // Check permissions
    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    const { id: categoryId } = await params

    // Check if this is a default category (cannot be deleted)
    const supabase = await createServerSupabaseClient()
    const { data: categoryResult } = await supabase
      .from('animal_categories')
      .select('is_default')
      .eq('id', categoryId)
      .eq('farm_id', userRole.farm_id)
      .single()

    // Cast to any to fix "Property 'is_default' does not exist on type 'never'"
    const category = categoryResult as any

    if (category?.is_default) {
      return NextResponse.json(
        { error: 'Cannot delete default category' }, 
        { status: 400 }
      )
    }
    
    const result = await deleteAnimalCategory(categoryId, userRole.farm_id)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Animal category deleted successfully'
    })
    
  } catch (error) {
    console.error('Animal category DELETE API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}