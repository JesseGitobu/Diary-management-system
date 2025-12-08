// Individual Protocol API Route for edit and delete operations
// src/app/api/health/protocols/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'

// GET single protocol
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
    
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    
    const { data: protocol, error } = await supabase
      .from('health_protocols')
      .select('*')
      .eq('id', id)
      .eq('farm_id', userRole.farm_id)
      .single()
    
    if (error || !protocol) {
      return NextResponse.json({ error: 'Protocol not found' }, { status: 404 })
    }
    
    return NextResponse.json({ success: true, protocol })
    
  } catch (error) {
    console.error('Protocol GET API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT update protocol
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
    
    if (!userRole?.farm_id || !['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    const body = await request.json()
    const { 
      protocol_name,
      protocol_type,
      description,
      frequency_type,
      frequency_value,
      start_date,
      end_date,
      target_animals,
      animal_groups,
      individual_animals,
      veterinarian,
      estimated_cost,
      notes,
      auto_create_records,
      is_active
    } = body
    
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    
    // First verify the protocol belongs to the user's farm
    const { data: existingProtocolResult, error: fetchError } = await supabase
      .from('health_protocols')
      .select('id, farm_id')
      .eq('id', id)
      .single()
    
    // Cast to any to fix "Property 'farm_id' does not exist on type 'never'"
    const existingProtocol = existingProtocolResult as any

    if (fetchError || !existingProtocol) {
      return NextResponse.json({ error: 'Protocol not found' }, { status: 404 })
    }
    
    if (existingProtocol.farm_id !== userRole.farm_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    // Clean and validate the update data
    const cleanedUpdates = {
      protocol_name: protocol_name?.trim(),
      protocol_type,
      description: description?.trim(),
      frequency_type,
      frequency_value,
      start_date: start_date || null,
      end_date: end_date && end_date.trim() !== '' ? end_date : null,
      target_animals,
      animal_groups: animal_groups || null,
      individual_animals: individual_animals || null,
      veterinarian: veterinarian && veterinarian.trim() !== '' ? veterinarian : null,
      estimated_cost: estimated_cost || null,
      notes: notes && notes.trim() !== '' ? notes : null,
      auto_create_records: auto_create_records ?? true,
      is_active: is_active ?? true,
      updated_at: new Date().toISOString()
    }
    
    // Additional validation
    if (cleanedUpdates.protocol_name && cleanedUpdates.protocol_name.length < 2) {
      return NextResponse.json({ error: 'Protocol name must be at least 2 characters' }, { status: 400 })
    }
    
    if (cleanedUpdates.description && cleanedUpdates.description.length < 5) {
      return NextResponse.json({ error: 'Description must be at least 5 characters' }, { status: 400 })
    }
    
    // Validate date formats
    if (cleanedUpdates.start_date && isNaN(Date.parse(cleanedUpdates.start_date))) {
      return NextResponse.json({ error: 'Invalid start date format' }, { status: 400 })
    }
    
    if (cleanedUpdates.end_date && isNaN(Date.parse(cleanedUpdates.end_date))) {
      return NextResponse.json({ error: 'Invalid end date format' }, { status: 400 })
    }
    
    // Validate end date is after start date
    if (cleanedUpdates.end_date && cleanedUpdates.start_date) {
      const startDate = new Date(cleanedUpdates.start_date)
      const endDate = new Date(cleanedUpdates.end_date)
      
      if (endDate <= startDate) {
        return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 })
      }
    }
    
    // Validate individual animals if selected
    if (cleanedUpdates.target_animals === 'individual' && cleanedUpdates.individual_animals?.length) {
      const { data: animals, error: animalError } = await supabase
        .from('animals')
        .select('id')
        .eq('farm_id', userRole.farm_id)
        .in('id', cleanedUpdates.individual_animals)
      
      if (animalError) {
        console.error('Error validating animals:', animalError)
        return NextResponse.json({ error: 'Error validating selected animals' }, { status: 500 })
      }
      
      if (animals.length !== cleanedUpdates.individual_animals.length) {
        return NextResponse.json({ error: 'Some selected animals do not belong to your farm' }, { status: 400 })
      }
    }
    
    // Update the protocol
    // Cast supabase to any to fix "Argument of type ... is not assignable to parameter of type 'never'"
    const { data, error } = await (supabase as any)
      .from('health_protocols')
      .update(cleanedUpdates)
      .eq('id', id)
      .eq('farm_id', userRole.farm_id)
      .select('*')
      .single()
    
    if (error) {
      console.error('Database update error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: true, 
      protocol: data,
      message: 'Protocol updated successfully'
    })
    
  } catch (error) {
    console.error('Protocol PUT API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE protocol
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
    
    if (!userRole?.farm_id || !['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    
    // First verify the protocol belongs to the user's farm
    const { data: existingProtocolResult, error: fetchError } = await supabase
      .from('health_protocols')
      .select('id, farm_id')
      .eq('id', id)
      .single()
    
    // Cast to any here as well
    const existingProtocol = existingProtocolResult as any

    if (fetchError || !existingProtocol) {
      return NextResponse.json({ error: 'Protocol not found' }, { status: 404 })
    }
    
    if (existingProtocol.farm_id !== userRole.farm_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    // Soft delete - mark as inactive instead of hard delete
    // Cast supabase to any to avoid type errors on partial updates
    const { error } = await (supabase as any)
      .from('health_protocols')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('farm_id', userRole.farm_id)
    
    if (error) {
      console.error('Database delete error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Protocol deleted successfully'
    })
    
  } catch (error) {
    console.error('Protocol DELETE API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Alternative update method (same as PUT for this case)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return PUT(request, { params })
}