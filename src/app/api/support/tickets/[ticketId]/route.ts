// src/app/api/support/tickets/[ticketId]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getCurrentUser  } from '@/lib/supabase/server'

// 1. UPDATE INTERFACE: params must be a Promise
interface RouteParams {
  params: Promise<{
    ticketId: string
  }>
}

/**
 * GET /api/support/tickets/[ticketId]
 * Fetch a specific ticket with all messages
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getCurrentUser()
        
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. AWAIT PARAMS: You must await the promise
    const { ticketId } = await params

    // Fetch ticket (verify ownership)
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .eq('user_id', user.id)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Fetch messages (exclude internal messages)
    const { data: messages, error: messagesError } = await supabase
      .from('support_ticket_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .eq('is_internal', false)
      .order('created_at', { ascending: true })

    if (messagesError) {
      console.error('Error fetching messages:', messagesError)
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        ticket,
        messages: messages || []
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/support/tickets/[ticketId]
 * Update ticket status
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 3. AWAIT PARAMS HERE AS WELL
    const { ticketId } = await params
    
    const body = await request.json()
    const { status } = body

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      )
    }

    // Verify ticket ownership
    const { data: ticket, error: verifyError } = await (supabase
      .from('support_tickets') as any)
      .select('user_id')
      .eq('id', ticketId)
      .single()

    if (verifyError || ticket.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Update status
    const { data, error } = await (supabase
      .from('support_tickets') as any)
      .update({
        status,
        updated_at: new Date().toISOString(),
        resolved_at: status === 'resolved' ? new Date().toISOString() : null,
      })
      .eq('id', ticketId)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to update ticket' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        ticket: data,
        message: 'Ticket updated successfully'
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}