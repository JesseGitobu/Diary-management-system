// src/app/api/farms/[farmId]/animals/[id]/consumption-records/[recordId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ farmId: string; id: string; recordId: string }> }
) {
  try {
    console.log('=== Update Consumption Observations API Called ===')
    
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Await the params first
    const { farmId, id: animalId, recordId } = await params
    console.log('Extracted IDs:', { farmId, animalId, recordId })
    
    // Add validation to ensure the IDs are valid UUIDs
    if (!farmId || !animalId || !recordId) {
      console.log('ERROR: Missing required parameters')
      return NextResponse.json({ 
        error: 'Missing farmId, animalId, or recordId',
        received: { farmId, animalId, recordId }
      }, { status: 400 })
    }
    
    // Basic UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(farmId) || !uuidRegex.test(animalId) || !uuidRegex.test(recordId)) {
      return NextResponse.json({ error: 'Invalid UUID format' }, { status: 400 })
    }
    
    const userRole = await getUserRole(user.id)
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }

    // Verify farm access
    if (userRole.farm_id !== farmId) {
      return NextResponse.json({ error: 'Access denied to this farm' }, { status: 403 })
    }

    // Check if user can edit records
    const canEdit = ['farm_owner', 'farm_manager', 'worker'].includes(userRole.role_type)
    if (!canEdit) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { appetite_score, approximate_waste_kg, observational_notes } = body

    // Validate appetite score if provided
    if (appetite_score !== null && appetite_score !== undefined) {
      const score = Number(appetite_score)
      if (isNaN(score) || score < 1 || score > 5) {
        return NextResponse.json({ 
          error: 'Appetite score must be between 1 and 5' 
        }, { status: 400 })
      }
    }

    // Validate waste amount if provided
    if (approximate_waste_kg !== null && approximate_waste_kg !== undefined) {
      const waste = Number(approximate_waste_kg)
      if (isNaN(waste) || waste < 0) {
        return NextResponse.json({ 
          error: 'Approximate waste must be 0 or greater' 
        }, { status: 400 })
      }
    }

    const supabase = await createServerSupabaseClient()

    // Verify the consumption record exists and belongs to the correct farm and animal
    const { data: existingRecord, error: fetchError } = await supabase
      .from('feed_consumption')
      .select(`
        id,
        farm_id,
        feed_consumption_animals!inner (
          animal_id
        )
      `)
      .eq('id', recordId)
      .eq('farm_id', farmId)
      .eq('feed_consumption_animals.animal_id', animalId)
      .single()

    if (fetchError || !existingRecord) {
      return NextResponse.json({ 
        error: 'Consumption record not found or access denied' 
      }, { status: 404 })
    }

    // Update the consumption record with observations
    const { data: updatedRecord, error: updateError } = await supabase
      .from('feed_consumption')
      .update({
        appetite_score: appetite_score !== undefined ? appetite_score : undefined,
        approximate_waste_kg: approximate_waste_kg !== undefined ? approximate_waste_kg : undefined,
        observational_notes: observational_notes !== undefined ? observational_notes : undefined,
        updated_at: new Date().toISOString()
      })
      .eq('id', recordId)
      .eq('farm_id', farmId)
      .select()
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ 
        error: `Failed to update observations: ${updateError.message}` 
      }, { status: 400 })
    }

    console.log('Successfully updated consumption observations')

    return NextResponse.json({ 
      success: true,
      data: updatedRecord
    })
    
  } catch (error) {
    console.error('Update consumption observations API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}