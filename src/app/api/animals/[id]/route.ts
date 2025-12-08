// src/app/api/animals/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, createServerSupabaseClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { updateAnimal, getAnimalById, getAnimalByTagNumber } from '@/lib/database/animals'

// GET single animal
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
    
    const { id: animalId } = await params
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
    
    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    const body = await request.json()
    const { id: animalId } = await params
    
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
    
    // 🆕 GET CURRENT ANIMAL DATA BEFORE UPDATE
    // Cast to 'any' to fix "Property 'weight' does not exist on type 'never'"
    const currentAnimal = await getAnimalById(animalId) as any
    
    if (!currentAnimal) {
      return NextResponse.json({ error: 'Animal not found' }, { status: 404 })
    }
    
    const oldWeight = currentAnimal.weight
    const newWeight = body.weight
    
    console.log('🔍 [API] Weight change:', {
      animalId,
      oldWeight,
      newWeight,
      changed: oldWeight !== newWeight
    })
    
    // Update the animal
    const result = await updateAnimal(animalId, userRole.farm_id, body)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    // 🆕 IF WEIGHT WAS UPDATED, CREATE WEIGHT RECORD AND RESOLVE REQUIREMENT
    if (newWeight !== undefined && newWeight !== null && newWeight !== oldWeight) {
      console.log('⚖️ [API] Weight was updated, creating weight record...')
      
      const supabase = await createServerSupabaseClient()
      
      // Create weight record
      // Cast supabase to 'any' to avoid type strictness on insert
      const { data: weightRecord, error: weightError } = await (supabase as any)
        .from('animal_weight_records')
        .insert({
          animal_id: animalId,
          farm_id: userRole.farm_id,
          weight_kg: newWeight,
          measurement_date: new Date().toISOString().split('T')[0],
          measurement_type: 'routine',
          notes: 'Weight updated via edit form',
          is_required: true,
          recorded_by: user.id
        })
        .select()
        .single()
      
      if (weightError) {
        console.error('⚠️ [API] Failed to create weight record:', weightError)
      } else {
        console.log('✅ [API] Weight record created:', weightRecord.id)
        
        // Resolve any pending weight requirements
        // Cast supabase to 'any' here as well
        const { data: resolvedReqs, error: resolveError } = await (supabase as any)
          .from('animals_requiring_weight_update')
          .update({
            is_resolved: true,
            resolved_at: new Date().toISOString(),
            weight_record_id: weightRecord.id
          })
          .eq('animal_id', animalId)
          .eq('farm_id', userRole.farm_id)
          .eq('is_resolved', false)
          .select()
        
        if (resolveError) {
          console.error('⚠️ [API] Failed to resolve weight requirements:', resolveError)
        } else {
          console.log('✅ [API] Resolved', resolvedReqs?.length || 0, 'weight requirement(s)')
        }
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      animal: result.data,
      message: 'Animal updated successfully'
    })
    
  } catch (error) {
    console.error('❌ [API] Update animal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE animal (soft delete - sets status to inactive)
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
    
    // Only farm owners can delete animals
    if (userRole.role_type !== 'farm_owner') {
      return NextResponse.json({ error: 'Only farm owners can delete animals' }, { status: 403 })
    }
    
    const { id: animalId } = await params
    
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