// src/app/api/admin/support/create/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const adminSupabase = createAdminClient()
    const { data: adminUser } = await adminSupabase
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .single()
    
    if (!adminUser) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    
    const body = await request.json()
    const { subject, description, priority, userId, farmId } = body
    
    if (!subject || !description) {
      return NextResponse.json({ error: 'Subject and description required' }, { status: 400 })
    }
    
    // Generate ticket number
    const ticketNumber = `TK-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    
    // Create ticket
    const { data: ticket, error } = await adminSupabase
      .from('support_tickets')
      .insert({
        ticket_number: ticketNumber,
        subject,
        description,
        priority: priority || 'medium',
        status: 'open',
        user_id: userId || null,
        farm_id: farmId || null,
        assigned_to: user.id
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating ticket:', error)
      return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 })
    }
    
    // Log the action
    try {
      await adminSupabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'create_ticket',
        resource_type: 'support_ticket',
        resource_id: ticket.id,
        new_values: { ticket_number: ticketNumber, status: 'open' }
      })
    } catch (auditError) {
      console.warn('Could not log action:', auditError)
    }
    
    return NextResponse.json({ success: true, ticket })
    
  } catch (error) {
    console.error('Create ticket API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}