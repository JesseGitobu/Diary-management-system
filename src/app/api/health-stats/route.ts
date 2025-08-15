import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getHealthStats } from '@/lib/database/health'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id)
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }
    
    // Load all breeding data
    const [healthStats ] = await Promise.all([
      getHealthStats(userRole.farm_id),
      
    ])
    
   
    
    return NextResponse.json({
      healthStats
    })
    
  } catch (error) {
    console.error('Health stats API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}