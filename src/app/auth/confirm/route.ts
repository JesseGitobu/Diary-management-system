// src/app/auth/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { type EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/'

  console.log('🔍 Auth confirm callback', { 
    hasTokenHash: !!token_hash, 
    type, 
    next 
  })

  if (token_hash && type) {
    const supabase = await createServerSupabaseClient()

    try {
      // Verify the OTP token to establish session
      const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash,
      })

      if (error) {
        console.error('❌ OTP verification error:', error)
        // Redirect to error page with specific error message
        return NextResponse.redirect(
          `${request.nextUrl.origin}/auth?error=${encodeURIComponent(error.message)}`
        )
      }

      // Success! Session is now established
      console.log('✅ OTP verified successfully, redirecting to:', next)
      
      // Redirect to the next page (e.g., /auth/reset-password)
      const redirectUrl = next.startsWith('/') ? next : `/${next}`
      return NextResponse.redirect(`${request.nextUrl.origin}${redirectUrl}`)

    } catch (error) {
      console.error('❌ Exception during OTP verification:', error)
      return NextResponse.redirect(
        `${request.nextUrl.origin}/auth?error=verification_failed`
      )
    }
  }

  // No token_hash or type provided
  console.error('❌ Missing token_hash or type')
  return NextResponse.redirect(
    `${request.nextUrl.origin}/auth?error=invalid_link`
  )
}