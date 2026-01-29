// src/app/api/breeding-events/route.ts
// Updated to use unified service

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { recordCalvingUnified } from '@/lib/database/breeding-sync'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { addDays, parseISO } from 'date-fns'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id) {
      return NextResponse.json(
        { error: 'No farm associated with user' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { eventData, createCalf } = body

    console.log('📝 Processing breeding event:', eventData.event_type)

    // Validate farm ownership
    if (eventData.farm_id !== userRole.farm_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = await createServerSupabaseClient()

    // Fetch farm breeding settings to get default gestation period
    const { data: breedingSettings } = await supabase
      .from('farm_breeding_settings')
      .select('default_gestation')
      .eq('farm_id', eventData.farm_id)
      .single()

    const defaultGestationDays = (breedingSettings as any)?.default_gestation || 280 // Default 280 days if not set

    // Handle different event types
    if (eventData.event_type === 'calving') {
      // Find the breeding record for this animal
      const { data: breedingRecordResult } = await supabase
        .from('breeding_records')
        .select('id')
        .eq('animal_id', eventData.animal_id)
        .eq('farm_id', eventData.farm_id)
        .order('breeding_date', { ascending: false })
        .limit(1)
        .single()

      // Cast to any to fix "Property 'id' does not exist on type 'never'"
      const breedingRecord = breedingRecordResult as any

      if (!breedingRecord) {
        return NextResponse.json(
          { error: 'No breeding record found for this animal' },
          { status: 400 }
        )
      }

      // Record calving using unified service
      const result = await recordCalvingUnified(
        breedingRecord.id,
        eventData.animal_id,
        eventData.farm_id,
        {
          calving_date: eventData.event_date,
          calving_outcome: eventData.calving_outcome,
          calf_gender: eventData.calf_gender,
          calf_weight: eventData.calf_weight,
          calf_tag: eventData.calf_tag_number,
          calf_health: eventData.calf_health_status,
          notes: eventData.notes,
          create_calf: createCalf
        },
        user.id,
        true
      )

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        event: result,
        calf: result.calf,
        message: 'Calving recorded successfully'
      })
    }

    // For other events (heat detection, insemination, pregnancy check)
    // Create standalone event
    // Auto-calculate estimated_due_date for insemination events
    let eventToInsert = { ...eventData, created_by: user.id }
    
    // For insemination events, calculate estimated due date based on gestation period
    if (eventData.event_type === 'insemination') {
      try {
        const eventDateTime = parseISO(eventData.event_date)
        const estimatedDueDate = addDays(eventDateTime, defaultGestationDays)
        // Format as date only (YYYY-MM-DD)
        eventToInsert.estimated_due_date = estimatedDueDate.toISOString().split('T')[0]
        console.log(`✓ Calculated estimated due date: ${eventToInsert.estimated_due_date} (${defaultGestationDays} days from ${eventData.event_date})`)
      } catch (err) {
        console.error('Error calculating estimated due date:', err)
        // Continue without due date if calculation fails
      }
    }
    
    // Cast supabase to any to prevent insertion type errors
    const { data: event, error } = await (supabase as any)
      .from('breeding_events')
      .insert(eventToInsert)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      event,
      message: 'Breeding event recorded successfully'
    })

  } catch (error: any) {
    console.error('Breeding events API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id) {
      return NextResponse.json(
        { error: 'No farm associated with user' },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)
    const animalId = searchParams.get('animal_id')

    const supabase = await createServerSupabaseClient()

    let query = supabase
      .from('breeding_events')
      .select(`
        *,
        animals (
          tag_number,
          name
        )
      `)
      .eq('farm_id', userRole.farm_id)
      .order('event_date', { ascending: false })

    if (animalId) {
      query = query.eq('animal_id', animalId)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({
      success: true,
      events: data
    })

  } catch (error: any) {
    console.error('Error fetching breeding events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch breeding events' },
      { status: 500 }
    )
  }
}