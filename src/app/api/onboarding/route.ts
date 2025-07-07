import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { saveOnboardingStep, calculateProgress } from '@/lib/database/onboarding'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { userId, step, data } = body
    
    // Verify user can only update their own data
    if (userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Save the onboarding step
    const result = await saveOnboardingStep(userId, data)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    // Calculate and update progress
    const progress = await calculateProgress(userId)
    
    return NextResponse.json({ 
      success: true, 
      progress,
      message: 'Onboarding step saved successfully'
    })
    
  } catch (error) {
    console.error('Onboarding API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const progress = await calculateProgress(user.id)
    
    return NextResponse.json({ progress })
    
  } catch (error) {
    console.error('Onboarding GET API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}