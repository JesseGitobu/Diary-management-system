//api/animals/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { updateAnimal, getAnimalById, getAnimalByTagNumber } from '@/lib/database/animals'

// GET single animal
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    
    const animalId = params.id
    const animal = await getAnimalById(animalId)
    
    if (!animal) {
      return NextResponse.json({ error: 'Animal not found' }, { status: 404 })
    }
    
    return NextResponse.json({ 
      success: true, 
      animal 
    })
    
  } catch (error) {
    console.error('Get animal API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// UPDATE animal
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    
    // Only farm owners and managers can edit animals
    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    const body = await request.json()
    const animalId = params.id
    
    // Validate required fields
    if (!body.tag_number || !body.breed || !body.gender) {
      return NextResponse.json({ 
        error: 'Missing required fields: tag_number, breed, gender' 
      }, { status: 400 })
    }
    
    // Check for duplicate tag number (excluding current animal)
    const existingAnimal = await getAnimalByTagNumber(body.tag_number, userRole.farm_id, animalId)
    if (existingAnimal) {
      return NextResponse.json({ 
        error: 'An animal with this tag number already exists' 
      }, { status: 400 })
    }
    
    const result = await updateAnimal(animalId, userRole.farm_id, body)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: true, 
      animal: result.data,
      message: 'Animal updated successfully'
    })
    
  } catch (error) {
    console.error('Update animal API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE animal (soft delete - sets status to inactive)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    
    // Only farm owners can delete animals
    if (userRole.role_type !== 'farm_owner') {
      return NextResponse.json({ error: 'Only farm owners can delete animals' }, { status: 403 })
    }
    
    const animalId = params.id
    
    const result = await updateAnimal(animalId, userRole.farm_id, { 
      status: 'inactive',
      updated_at: new Date().toISOString()
    })
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Animal deleted successfully'
    })
    
  } catch (error) {
    console.error('Delete animal API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

