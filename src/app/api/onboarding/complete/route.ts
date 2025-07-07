import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { updateCompletionStatus } from '@/lib/database/onboarding'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { userId } = body
    
    // Verify user can only complete their own onboarding
    if (userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Mark onboarding as completed
    const success = await updateCompletionStatus(userId, true)
    
    if (!success) {
      return NextResponse.json({ error: 'Failed to complete onboarding' }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Onboarding completed successfully'
    })
    
  } catch (error) {
    console.error('Onboarding complete API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}