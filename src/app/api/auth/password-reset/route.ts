// src/app/api/auth/password-reset/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()
    
    // Check if we actually have a session first
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      console.error('Password reset API: No active session')
      return NextResponse.json(
        { error: 'Session expired. Please request a new password reset link.' },
        { status: 401 }
      )
    }

    // Attempt update
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      console.error('Password reset API error:', error.message)
      // Return the exact error message from Supabase so frontend can handle "same password" case
      return NextResponse.json(
        { error: error.message },
        { status: 422 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Password reset exception:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}