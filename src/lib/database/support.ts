// src/lib/database/support.ts

import { createClient } from '@/lib/supabase/client'

export interface SupportTicket {
  id: string
  ticket_number: string
  user_id: string
  farm_id: string
  subject: string
  description: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assigned_to: string | null
  tags: string[] | null
  created_at: string
  updated_at: string
  resolved_at: string | null
}

export interface SupportTicketMessage {
  id: string
  ticket_id: string
  sender_id: string
  message: string
  is_internal: boolean
  attachments: Record<string, any> | null
  created_at: string
}

export interface SupportTicketWithMessages {
  ticket: SupportTicket
  messages: SupportTicketMessage[]
}

/**
 * Generate a unique ticket number (e.g., TKT-2024-001)
 */
function generateTicketNumber(): string {
  const year = new Date().getFullYear()
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(5, '0')
  return `TKT-${year}-${random}`
}

/**
 * Create a new support ticket
 */
export async function createSupportTicket(
  subject: string,
  description: string,
  farmId: string,
  priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium',
  tags?: string[]
): Promise<SupportTicket> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const ticket_number = generateTicketNumber()

  const { data, error } = await (supabase
    .from('support_tickets') as any)
    .insert({
      ticket_number,
      user_id: user.id,
      farm_id: farmId,
      subject,
      description,
      priority,
      status: 'open',
      tags: tags || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating support ticket:', error)
    throw new Error(error.message)
  }

  return data as SupportTicket
}

/**
 * Get all support tickets for the current user
 */
export async function getUserSupportTickets(): Promise<SupportTicket[]> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching support tickets:', error)
    throw new Error(error.message)
  }

  return data as SupportTicket[]
}

/**
 * Get a single support ticket with all messages
 */
export async function getSupportTicketWithMessages(
  ticketId: string
): Promise<SupportTicketWithMessages> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // Fetch ticket and verify ownership
  const { data: ticket, error: ticketError } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('id', ticketId)
    .eq('user_id', user.id)
    .single()

  if (ticketError) {
    console.error('Error fetching ticket:', ticketError)
    throw new Error('Support ticket not found')
  }

  // Fetch messages
  const { data: messages, error: messagesError } = await supabase
    .from('support_ticket_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .eq('is_internal', false) // Users only see non-internal messages
    .order('created_at', { ascending: true })

  if (messagesError) {
    console.error('Error fetching messages:', messagesError)
    throw new Error('Failed to fetch messages')
  }

  return {
    ticket: ticket as SupportTicket,
    messages: (messages || []) as SupportTicketMessage[],
  }
}

/**
 * Add a message to a support ticket
 */
export async function addSupportTicketMessage(
  ticketId: string,
  message: string,
  attachments?: Record<string, any>
): Promise<SupportTicketMessage> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // Verify user owns the ticket
  const { data: ticket, error: verifyError } = await (supabase
    .from('support_tickets') as any)
    .select('user_id')
    .eq('id', ticketId)
    .single()

  if (verifyError || ticket.user_id !== user.id) {
    throw new Error('Unauthorized: You do not own this ticket')
  }

  // Add message
  const { data, error } = await (supabase
    .from('support_ticket_messages') as any)
    .insert({
      ticket_id: ticketId,
      sender_id: user.id,
      message,
      is_internal: false,
      attachments: attachments || null,
      created_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding message:', error)
    throw new Error(error.message)
  }

  // Update ticket's updated_at timestamp
  await (supabase
    .from('support_tickets') as any)
    .update({ updated_at: new Date().toISOString() })
    .eq('id', ticketId)

  return data as SupportTicketMessage
}

/**
 * Update ticket status (user can only set to certain statuses)
 */
export async function updateSupportTicketStatus(
  ticketId: string,
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
): Promise<SupportTicket> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await (supabase
    .from('support_tickets') as any)
    .update({
      status,
      updated_at: new Date().toISOString(),
      resolved_at: status === 'resolved' ? new Date().toISOString() : null,
    })
    .eq('id', ticketId)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('Error updating ticket status:', error)
    throw new Error(error.message)
  }

  return data as SupportTicket
}

/**
 * Get ticket by ticket number
 */
export async function getSupportTicketByNumber(
  ticketNumber: string
): Promise<SupportTicket> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('ticket_number', ticketNumber)
    .eq('user_id', user.id)
    .single()

  if (error) {
    console.error('Error fetching ticket:', error)
    throw new Error('Ticket not found')
  }

  return data as SupportTicket
}
