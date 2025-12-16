// src/app/api/support/tickets/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getCurrentUser  } from '@/lib/supabase/server'
import { createSupportTicket } from '@/lib/database/support'

/**[ticketId]
 * GET /api/support/tickets
 * Fetch all support tickets for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch tickets' },
        { status: 500 }
      )
    }

    return NextResponse.json({ tickets: data }, { status: 200 })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/support/tickets
 * Create a new support ticket
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { subject, description, farm_id, priority = 'medium', tags } = body

    // Validate required fields
    if (!subject?.trim()) {
      return NextResponse.json(
        { error: 'Subject is required' },
        { status: 400 }
      )
    }

    if (!description?.trim()) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      )
    }

    if (!farm_id) {
      return NextResponse.json(
        { error: 'Farm ID is required' },
        { status: 400 }
      )
    }

    // Verify farm ownership
    const { data: farm, error: farmError } = await supabase
      .from('farms')
      .select('id')
      .eq('id', farm_id)
      .eq('user_id', user.id)
      .single()

    if (farmError || !farm) {
      return NextResponse.json(
        { error: 'Invalid farm' },
        { status: 403 }
      )
    }

    // Generate ticket number
    const year = new Date().getFullYear()
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(5, '0')
    const ticket_number = `TKT-${year}-${random}`

    // Create ticket
    const { data, error } = await (supabase
      .from('support_tickets') as any)
      .insert({
        ticket_number,
        user_id: user.id,
        farm_id,
        subject: subject.trim(),
        description: description.trim(),
        priority: priority || 'medium',
        status: 'open',
        tags: tags || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to create ticket' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        ticket: data,
        message: 'Support ticket created successfully'
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}