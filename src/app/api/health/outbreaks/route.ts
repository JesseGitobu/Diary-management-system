// src/app/api/health/outbreaks/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'

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
    
    // Only farm owners and managers can report outbreaks
    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
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
      farm_id
    } = body
    
    // Verify user owns the farm
    if (farm_id !== userRole.farm_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
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
    
    // Create the outbreak record
    // Cast supabase to any to fix "Argument of type ... is not assignable to parameter of type 'never'"
    const { data: outbreak, error: outbreakError } = await (supabase as any)
      .from('disease_outbreaks')
      .insert({
        farm_id: userRole.farm_id,
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
        status: 'active'
      })
      .select()
      .single()
    
    if (outbreakError) {
      console.error('Error creating outbreak:', outbreakError)
      return NextResponse.json({ 
        error: 'Failed to create outbreak record' 
      }, { status: 500 })
    }
    
    // Create individual health records for each affected animal
    const healthRecords = affected_animals.map((animalId: string) => ({
      farm_id: userRole.farm_id,
      animal_id: animalId,
      record_type: 'illness',
      record_date: first_detected_date,
      description: `Disease outbreak: ${disease_type}`,
      symptoms,
      treatment: treatment_protocol || null,
      veterinarian: veterinarian || null,
      notes: `Part of outbreak: ${outbreak_name}. ${notes || ''}`.trim(),
      outbreak_id: outbreak.id
    }))
    
    // Insert health records
    // Cast supabase to any here as well
    const { error: healthRecordsError } = await (supabase as any)
      .from('animal_health_records')
      .insert(healthRecords)
    
    if (healthRecordsError) {
      console.error('Error creating health records:', healthRecordsError)
      // Don't fail the request, but log the error
    }
    
    // If quarantine is required, update animal statuses
    if (quarantine_required && affected_animals.length > 0) {
      // Cast supabase to any
      const { error: quarantineError } = await (supabase as any)
        .from('animals')
        .update({ 
          status: 'quarantined',
          notes: `Quarantined due to ${disease_type} outbreak on ${first_detected_date}`
        })
        .in('id', affected_animals)
      
      if (quarantineError) {
        console.error('Error updating animal quarantine status:', quarantineError)
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      outbreak,
      message: 'Disease outbreak reported successfully'
    })
    
  } catch (error) {
    console.error('Outbreak API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// GET endpoint to fetch outbreaks
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
    
    const supabase = await createServerSupabaseClient()
    
    const { data: outbreaks, error } = await supabase
      .from('disease_outbreaks')
      .select('*')
      .eq('farm_id', userRole.farm_id)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching outbreaks:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch outbreaks' 
      }, { status: 500 })
    }
    
    return NextResponse.json({ outbreaks })
    
  } catch (error) {
    console.error('Outbreak GET API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}