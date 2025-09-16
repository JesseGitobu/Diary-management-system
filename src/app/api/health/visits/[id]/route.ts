// API Routes for Individual Veterinary Visits - Edit and Delete
// src/app/api/health/visits/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'

// GET single veterinary visit
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
    
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    
    const { data: visit, error } = await supabase
      .from('veterinary_visits')
      .select(`
        *,
        visit_animals (
          animal_id,
          animals (
            id,
            name,
            tag_number,
            breed
          )
        )
      `)
      .eq('id', id)
      .eq('farm_id', userRole.farm_id)
      .single()
    
    if (error || !visit) {
      return NextResponse.json({ error: 'Veterinary visit not found' }, { status: 404 })
    }

    // Extract selected animal IDs for the response
    const animalsInvolved = visit.visit_animals?.map((va: any) => va.animal_id) || []
    
    return NextResponse.json({ 
      success: true, 
      visit: { 
        ...visit, 
        animals_involved: animalsInvolved 
      } 
    })
    
  } catch (error) {
    console.error('Veterinary visit GET API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT update veterinary visit
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id)
    
    if (!userRole?.farm_id || !['farm_owner', 'farm_manager', 'worker'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    const { id } = await params
    const body = await request.json()
    const {
      visit_type,
      visit_purpose,
      scheduled_datetime,
      duration_hours,
      veterinarian_name,
      veterinarian_clinic,
      veterinarian_phone,
      veterinarian_email,
      priority_level,
      location_details,
      special_instructions,
      estimated_cost,
      status,
      preparation_notes,
      follow_up_required,
      follow_up_date,
      send_reminder,
      reminder_days_before,
      animals_involved
    } = body
    
    // Validate required fields
    if (!visit_type?.trim()) {
      return NextResponse.json({ error: 'Visit type is required' }, { status: 400 })
    }
    
    if (!visit_purpose?.trim()) {
      return NextResponse.json({ error: 'Visit purpose is required' }, { status: 400 })
    }
    
    if (!scheduled_datetime) {
      return NextResponse.json({ error: 'Scheduled date/time is required' }, { status: 400 })
    }
    
    if (!veterinarian_name?.trim()) {
      return NextResponse.json({ error: 'Veterinarian name is required' }, { status: 400 })
    }
    
    // Validate date format
    if (isNaN(Date.parse(scheduled_datetime))) {
      return NextResponse.json({ error: 'Invalid scheduled date/time format' }, { status: 400 })
    }
    
    if (follow_up_date && follow_up_date.trim() && isNaN(Date.parse(follow_up_date))) {
      return NextResponse.json({ error: 'Invalid follow-up date format' }, { status: 400 })
    }
    
    const supabase = await createServerSupabaseClient()
    
    // First verify the visit exists and belongs to the farm
    const { data: existingVisit, error: fetchError } = await supabase
      .from('veterinary_visits')
      .select('id, farm_id')
      .eq('id', id)
      .eq('farm_id', userRole.farm_id)
      .single()
    
    if (fetchError || !existingVisit) {
      return NextResponse.json({ error: 'Veterinary visit not found or access denied' }, { status: 404 })
    }
    
    // Update the visit record
    const { data: visit, error: updateError } = await supabase
      .from('veterinary_visits')
      .update({
        visit_type: visit_type.trim(),
        visit_purpose: visit_purpose.trim(),
        scheduled_datetime,
        duration_hours: duration_hours || 2.0,
        veterinarian_name: veterinarian_name.trim(),
        veterinarian_clinic: veterinarian_clinic?.trim() || null,
        veterinarian_phone: veterinarian_phone?.trim() || null,
        veterinarian_email: veterinarian_email?.trim() || null,
        priority_level: priority_level || 'medium',
        location_details: location_details?.trim() || null,
        special_instructions: special_instructions?.trim() || null,
        estimated_cost: estimated_cost || null,
        status: status || 'scheduled',
        preparation_notes: preparation_notes?.trim() || null,
        follow_up_required: follow_up_required || false,
        follow_up_date: follow_up_date?.trim() || null,
        send_reminder: send_reminder ?? true,
        reminder_days_before: reminder_days_before || 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('farm_id', userRole.farm_id)
      .select()
      .single()
    
    if (updateError) {
      console.error('Error updating veterinary visit:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update veterinary visit record' 
      }, { status: 500 })
    }
    
    // Update animal associations if provided
    if (animals_involved && Array.isArray(animals_involved)) {
      // Delete existing associations
      await supabase
        .from('visit_animals')
        .delete()
        .eq('visit_id', id)
      
      // Create new associations if any animals are specified
      if (animals_involved.length > 0) {
        const animalAssociations = animals_involved.map((animalId: string) => ({
          visit_id: id,
          animal_id: animalId
        }))
        
        const { error: animalsError } = await supabase
          .from('visit_animals')
          .insert(animalAssociations)
        
        if (animalsError) {
          console.error('Error updating animal associations:', animalsError)
          // Don't fail the request, but log the error
        }
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      visit: { ...visit, animals_involved: animals_involved || [] },
      message: 'Veterinary visit updated successfully'
    })
    
  } catch (error) {
    console.error('Veterinary visit PUT API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE veterinary visit
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id)
    
    if (!userRole?.farm_id || !['farm_owner', 'farm_manager', 'worker'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    
    // First verify the visit exists and belongs to the farm
    const { data: existingVisit, error: fetchError } = await supabase
      .from('veterinary_visits')
      .select(`
        id, 
        farm_id, 
        visit_purpose,
        scheduled_datetime,
        visit_animals (
          animal_id
        )
      `)
      .eq('id', id)
      .eq('farm_id', userRole.farm_id)
      .single()
    
    if (fetchError || !existingVisit) {
      return NextResponse.json({ error: 'Veterinary visit not found or access denied' }, { status: 404 })
    }
    
    // Delete animal associations (this should be handled by CASCADE, but being explicit)
    await supabase
      .from('visit_animals')
      .delete()
      .eq('visit_id', id)
    
    // Delete the visit record
    const { error: deleteError } = await supabase
      .from('veterinary_visits')
      .delete()
      .eq('id', id)
      .eq('farm_id', userRole.farm_id)
    
    if (deleteError) {
      console.error('Error deleting veterinary visit:', deleteError)
      return NextResponse.json({ 
        error: 'Failed to delete veterinary visit record' 
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Veterinary visit deleted successfully'
    })
    
  } catch (error) {
    console.error('Veterinary visit DELETE API error:', error)
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