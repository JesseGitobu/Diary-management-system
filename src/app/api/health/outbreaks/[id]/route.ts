// Fixed API Routes for Individual Outbreaks - Remove updated_at references
// src/app/api/health/outbreaks/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'

// GET single outbreak
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
    
    const { data: outbreak, error } = await supabase
      .from('disease_outbreaks')
      .select('*')
      .eq('id', id)
      .eq('farm_id', userRole.farm_id)
      .single()
    
    if (error || !outbreak) {
      return NextResponse.json({ error: 'Outbreak not found' }, { status: 404 })
    }
    
    return NextResponse.json({ success: true, outbreak })
    
  } catch (error) {
    console.error('Outbreak GET API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT update outbreak
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
    
    if (!userRole?.farm_id || !['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    const { id } = await params
    const body = await request.json()
    const {
      outbreak_name,
      disease_type,
      severity_level,
      first_detected_date,
      description,
      symptoms,
      affected_animals,
      quarantine_required,
      quarantine_area,
      treatment_protocol,
      veterinarian,
      estimated_duration,
      preventive_measures,
      notes,
      status,
      resolved_date
    } = body
    
    // Validate required fields
    if (!outbreak_name || !disease_type || !first_detected_date || !description || !symptoms) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 })
    }
    
    if (!affected_animals || !Array.isArray(affected_animals) || affected_animals.length === 0) {
      return NextResponse.json({ 
        error: 'At least one affected animal must be selected' 
      }, { status: 400 })
    }
    
    const supabase = await createServerSupabaseClient()
    
    // First verify the outbreak exists and belongs to the farm
    const { data: existingOutbreak, error: fetchError } = await supabase
      .from('disease_outbreaks')
      .select('id, farm_id')
      .eq('id', id)
      .eq('farm_id', userRole.farm_id)
      .single()
    
    if (fetchError || !existingOutbreak) {
      return NextResponse.json({ error: 'Outbreak not found or access denied' }, { status: 404 })
    }
    
    // Update the outbreak record
    const { data: outbreak, error: updateError } = await supabase
      .from('disease_outbreaks')
      .update({
        outbreak_name,
        disease_type,
        severity_level,
        first_detected_date,
        description,
        symptoms,
        affected_animals,
        quarantine_required,
        quarantine_area,
        treatment_protocol,
        veterinarian,
        estimated_duration,
        preventive_measures,
        notes,
        status,
        resolved_date: status === 'resolved' ? (resolved_date || new Date().toISOString().split('T')[0]) : null,
        updated_at: new Date().toISOString() // This is OK - disease_outbreaks table has updated_at
      })
      .eq('id', id)
      .eq('farm_id', userRole.farm_id)
      .select()
      .single()
    
    if (updateError) {
      console.error('Error updating outbreak:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update outbreak record' 
      }, { status: 500 })
    }
    
    // Update related health records if needed (REMOVED updated_at field)
    if (affected_animals.length > 0) {
      // Update existing health records related to this outbreak
      const { error: healthRecordsError } = await supabase
        .from('animal_health_records')
        .update({
          description: `Disease outbreak: ${disease_type}`,
          symptoms,
          treatment: treatment_protocol || null,
          veterinarian: veterinarian || null,
          notes: `Part of outbreak: ${outbreak_name}. ${notes || ''}`.trim()
          // REMOVED: updated_at: new Date().toISOString() - column doesn't exist
        })
        .eq('outbreak_id', id)
      
      if (healthRecordsError) {
        console.error('Error updating health records:', healthRecordsError)
        // Don't fail the request, but log the error
      }
    }
    
    // Handle quarantine status changes
    if (quarantine_required && affected_animals.length > 0) {
      // Update animal statuses to quarantined
      const { error: quarantineError } = await supabase
        .from('animals')
        .update({ 
          status: 'quarantined',
          notes: `Quarantined due to ${disease_type} outbreak (updated ${new Date().toISOString().split('T')[0]})`
        })
        .in('id', affected_animals)
      
      if (quarantineError) {
        console.error('Error updating animal quarantine status:', quarantineError)
      }
    } else if (!quarantine_required) {
      // Remove quarantine status if no longer required
      const { error: removeQuarantineError } = await supabase
        .from('animals')
        .update({ 
          status: 'active',
          notes: `Quarantine lifted for ${disease_type} outbreak (${new Date().toISOString().split('T')[0]})`
        })
        .in('id', affected_animals)
        .eq('status', 'quarantined')
      
      if (removeQuarantineError) {
        console.error('Error removing quarantine status:', removeQuarantineError)
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      outbreak,
      message: 'Outbreak updated successfully'
    })
    
  } catch (error) {
    console.error('Outbreak PUT API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE outbreak
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
    
    if (!userRole?.farm_id || !['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    
    // First verify the outbreak exists and belongs to the farm
    const { data: existingOutbreak, error: fetchError } = await supabase
      .from('disease_outbreaks')
      .select('id, farm_id, affected_animals')
      .eq('id', id)
      .eq('farm_id', userRole.farm_id)
      .single()
    
    if (fetchError || !existingOutbreak) {
      return NextResponse.json({ error: 'Outbreak not found or access denied' }, { status: 404 })
    }
    
    // Delete related health records first (if they exist)
    const { error: healthRecordsError } = await supabase
      .from('animal_health_records')
      .delete()
      .eq('outbreak_id', id)
    
    if (healthRecordsError) {
      console.error('Error deleting related health records:', healthRecordsError)
      // Continue with outbreak deletion even if health records deletion fails
    }
    
    // Remove quarantine status from affected animals
    if (existingOutbreak.affected_animals && Array.isArray(existingOutbreak.affected_animals)) {
      const { error: removeQuarantineError } = await supabase
        .from('animals')
        .update({ 
          status: 'active',
          notes: `Quarantine lifted - outbreak record deleted (${new Date().toISOString().split('T')[0]})`
        })
        .in('id', existingOutbreak.affected_animals as string[])
        .eq('status', 'quarantined')
      
      if (removeQuarantineError) {
        console.error('Error removing quarantine status:', removeQuarantineError)
      }
    }
    
    // Delete the outbreak record
    const { error: deleteError } = await supabase
      .from('disease_outbreaks')
      .delete()
      .eq('id', id)
      .eq('farm_id', userRole.farm_id)
    
    if (deleteError) {
      console.error('Error deleting outbreak:', deleteError)
      return NextResponse.json({ 
        error: 'Failed to delete outbreak record' 
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Outbreak deleted successfully'
    })
    
  } catch (error) {
    console.error('Outbreak DELETE API error:', error)
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