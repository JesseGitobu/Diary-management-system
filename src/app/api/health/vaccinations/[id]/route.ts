// API Routes for Individual Vaccinations - Edit and Delete
// src/app/api/health/vaccinations/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'

// GET single vaccination
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
    
    const { data: vaccination, error } = await supabase
      .from('vaccinations')
      .select(`
        *,
        vaccination_animals (
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
    
    if (error || !vaccination) {
      return NextResponse.json({ error: 'Vaccination not found' }, { status: 404 })
    }

    // Extract selected animal IDs for the response
    const selectedAnimals = vaccination.vaccination_animals?.map((va: any) => va.animal_id) || []
    
    return NextResponse.json({ 
      success: true, 
      vaccination: { 
        ...vaccination, 
        selected_animals: selectedAnimals 
      } 
    })
    
  } catch (error) {
    console.error('Vaccination GET API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT update vaccination
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
      vaccine_name,
      vaccine_type,
      manufacturer,
      batch_number,
      vaccination_date,
      next_due_date,
      route_of_administration,
      dosage,
      vaccination_site,
      selected_animals,
      veterinarian,
      cost_per_dose,
      total_cost,
      side_effects,
      notes,
      create_reminder
    } = body
    
    // Validate required fields
    if (!vaccine_name?.trim()) {
      return NextResponse.json({ error: 'Vaccine name is required' }, { status: 400 })
    }
    
    if (!vaccination_date) {
      return NextResponse.json({ error: 'Vaccination date is required' }, { status: 400 })
    }
    
    if (!dosage?.trim()) {
      return NextResponse.json({ error: 'Dosage is required' }, { status: 400 })
    }
    
    if (!selected_animals || selected_animals.length === 0) {
      return NextResponse.json({ error: 'At least one animal must be selected' }, { status: 400 })
    }
    
    // Validate date formats
    if (isNaN(Date.parse(vaccination_date))) {
      return NextResponse.json({ error: 'Invalid vaccination date format' }, { status: 400 })
    }
    
    if (next_due_date && next_due_date.trim() && isNaN(Date.parse(next_due_date))) {
      return NextResponse.json({ error: 'Invalid next due date format' }, { status: 400 })
    }
    
    const supabase = await createServerSupabaseClient()
    
    // First verify the vaccination exists and belongs to the farm
    const { data: existingVaccination, error: fetchError } = await supabase
      .from('vaccinations')
      .select('id, farm_id')
      .eq('id', id)
      .eq('farm_id', userRole.farm_id)
      .single()
    
    if (fetchError || !existingVaccination) {
      return NextResponse.json({ error: 'Vaccination not found or access denied' }, { status: 404 })
    }
    
    // Update the vaccination record
    const { data: vaccination, error: updateError } = await supabase
      .from('vaccinations')
      .update({
        vaccine_name: vaccine_name.trim(),
        vaccine_type,
        manufacturer: manufacturer?.trim() || null,
        batch_number: batch_number?.trim() || null,
        vaccination_date,
        next_due_date: next_due_date?.trim() || null,
        route_of_administration,
        dosage: dosage.trim(),
        vaccination_site: vaccination_site?.trim() || null,
        veterinarian: veterinarian?.trim() || null,
        cost_per_dose: cost_per_dose || null,
        total_cost: total_cost || null,
        side_effects: side_effects?.trim() || null,
        notes: notes?.trim() || null,
        create_reminder: create_reminder ?? true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('farm_id', userRole.farm_id)
      .select()
      .single()
    
    if (updateError) {
      console.error('Error updating vaccination:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update vaccination record' 
      }, { status: 500 })
    }
    
    // Update animal associations
    if (selected_animals && selected_animals.length > 0) {
      // Delete existing associations
      await supabase
        .from('vaccination_animals')
        .delete()
        .eq('vaccination_id', id)
      
      // Create new associations
      const animalAssociations = selected_animals.map((animalId: string) => ({
        vaccination_id: id,
        animal_id: animalId
      }))
      
      const { error: animalsError } = await supabase
        .from('vaccination_animals')
        .insert(animalAssociations)
      
      if (animalsError) {
        console.error('Error updating animal associations:', animalsError)
        // Don't fail the request, but log the error
      }
    }
    
    // Update related health records if needed
    const { error: healthRecordsError } = await supabase
      .from('animal_health_records')
      .update({
        description: `Vaccination: ${vaccine_name}`,
        treatment: `${dosage} via ${route_of_administration}${vaccination_site ? ` at ${vaccination_site}` : ''}`,
        veterinarian: veterinarian || null,
        cost: cost_per_dose || null,
        notes: [
          notes,
          batch_number ? `Batch: ${batch_number}` : null,
          manufacturer ? `Manufacturer: ${manufacturer}` : null,
          side_effects ? `Side effects: ${side_effects}` : null
        ].filter(Boolean).join('\n') || null
      })
      .eq('record_type', 'vaccination')
      .eq('record_date', vaccination_date)
      .in('animal_id', selected_animals)
    
    if (healthRecordsError) {
      console.error('Error updating related health records:', healthRecordsError)
      // Don't fail the request, but log the error
    }
    
    return NextResponse.json({ 
      success: true, 
      vaccination: { ...vaccination, selected_animals },
      message: 'Vaccination updated successfully'
    })
    
  } catch (error) {
    console.error('Vaccination PUT API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE vaccination
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
    
    // First verify the vaccination exists and belongs to the farm
    const { data: existingVaccination, error: fetchError } = await supabase
      .from('vaccinations')
      .select(`
        id, 
        farm_id, 
        vaccination_date, 
        vaccine_name,
        vaccination_animals (
          animal_id
        )
      `)
      .eq('id', id)
      .eq('farm_id', userRole.farm_id)
      .single()
    
    if (fetchError || !existingVaccination) {
      return NextResponse.json({ error: 'Vaccination not found or access denied' }, { status: 404 })
    }
    
    // Get affected animal IDs
    const affectedAnimalIds = existingVaccination.vaccination_animals?.map((va: any) => va.animal_id) || []
    
    // Delete related health records first
    if (affectedAnimalIds.length > 0) {
      const { error: healthRecordsError } = await supabase
        .from('animal_health_records')
        .delete()
        .eq('record_type', 'vaccination')
        .eq('record_date', existingVaccination.vaccination_date)
        .in('animal_id', affectedAnimalIds)
        .ilike('description', `%${existingVaccination.vaccine_name}%`)
      
      if (healthRecordsError) {
        console.error('Error deleting related health records:', healthRecordsError)
        // Continue with vaccination deletion even if health records deletion fails
      }
    }
    
    // Delete animal associations (this should be handled by CASCADE, but being explicit)
    await supabase
      .from('vaccination_animals')
      .delete()
      .eq('vaccination_id', id)
    
    // Delete the vaccination record
    const { error: deleteError } = await supabase
      .from('vaccinations')
      .delete()
      .eq('id', id)
      .eq('farm_id', userRole.farm_id)
    
    if (deleteError) {
      console.error('Error deleting vaccination:', deleteError)
      return NextResponse.json({ 
        error: 'Failed to delete vaccination record' 
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Vaccination deleted successfully'
    })
    
  } catch (error) {
    console.error('Vaccination DELETE API error:', error)
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