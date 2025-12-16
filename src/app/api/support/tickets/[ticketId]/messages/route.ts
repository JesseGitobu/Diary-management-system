// src/app/api/support/tickets/[ticketId]/messages/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getCurrentUser  } from '@/lib/supabase/server'

// 1. UPDATE INTERFACE: params must be a Promise
interface RouteParams {
  params: Promise<{
    ticketId: string
  }>
}

/**
 * GET /api/support/tickets/[ticketId]/messages
 * Fetch all messages for a ticket
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

    // 2. AWAIT PARAMS: You must await the promise before accessing properties
    const { ticketId } = await params

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

    // Fetch messages
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
      { messages: messages || [] },
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
 * POST /api/support/tickets/[ticketId]/messages
 * Add a new message to a ticket
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 3. AWAIT PARAMS HERE TOO
    const { ticketId } = await params
    
    const body = await request.json()
    const { message, attachments } = body

    if (!message?.trim()) {
      return NextResponse.json(
        { error: 'Message cannot be empty' },
        { status: 400 }
      )
    }

    // Verify ticket ownership and that it's not closed
    const { data: ticket, error: verifyError } = await (supabase
      .from('support_tickets') as any)
      .select('user_id, status')
      .eq('id', ticketId)
      .single()

    if (verifyError || ticket.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    if (ticket.status === 'closed') {
      return NextResponse.json(
        { error: 'Cannot add messages to closed tickets' },
        { status: 400 }
      )
    }

    // Add message
    const { data, error } = await (supabase
      .from('support_ticket_messages') as any)
      .insert({
        ticket_id: ticketId,
        sender_id: user.id,
        message: message.trim(),
        is_internal: false,
        attachments: attachments || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to add message' },
        { status: 500 }
      )
    }

    // Update ticket's updated_at timestamp
    await (supabase
      .from('support_tickets') as any)
      .update({ updated_at: new Date().toISOString() })
      .eq('id', ticketId)

    return NextResponse.json(
      { 
        message: data,
        status: 'Message added successfully'
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