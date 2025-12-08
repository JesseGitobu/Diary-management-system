import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body
    
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }
    
    const adminSupabase = createAdminClient()
    
    // Mark invitation as declined
    // Cast adminSupabase to any to fix "Argument of type ... is not assignable to parameter of type 'never'"
    const { error } = await (adminSupabase as any)
      .from('invitations')
      .update({ status: 'declined' })
      .eq('token', token)
      .eq('status', 'pending')
    
    if (error) {
      console.error('Error declining invitation:', error)
      return NextResponse.json({ error: 'Failed to decline invitation' }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Invitation declined successfully'
    })
    
  } catch (error) {
    console.error('Decline invitation API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}