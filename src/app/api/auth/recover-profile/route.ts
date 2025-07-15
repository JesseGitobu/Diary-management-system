import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { createFarmOwnerProfile } from '@/lib/database/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check if user already has a role
    // (this check should be in getUserRole function)
    
    // Create farm owner profile for users who somehow missed it
    const result = await createFarmOwnerProfile(user.id, user.email!)
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Farm owner profile created successfully'
      })
    } else if ('error' in result) {
      return NextResponse.json({ 
        error: result.error 
      }, { status: 400 })
    } else {
      return NextResponse.json({ 
        error: 'Unknown error occurred' 
      }, { status: 400 })
    }
    
  } catch (error) {
    console.error('Profile recovery error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}