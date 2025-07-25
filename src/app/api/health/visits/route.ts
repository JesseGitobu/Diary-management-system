
// src/app/api/health/visits/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createVeterinaryVisit, getVeterinaryVisits, getUpcomingVisits, getFollowUpVisits } from '@/lib/database/health'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id)
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }
    
    // Check permissions - allow farm owners, managers, and workers to schedule visits
    if (!['farm_owner', 'farm_manager', 'worker'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions to schedule visits' }, { status: 403 })
    }
    
    const body = await request.json()
    
    // Validate required fields
    const requiredFields = ['visit_type', 'visit_purpose', 'scheduled_datetime', 'veterinarian_name']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ 
          error: `Missing required field: ${field}` 
        }, { status: 400 })
      }
    }
    
    // Verify user owns the farm
    if (body.farm_id && body.farm_id !== userRole.farm_id) {
      return NextResponse.json({ error: 'Cannot schedule visit for different farm' }, { status: 403 })
    }
    
    const result = await createVeterinaryVisit(userRole.farm_id, body)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: true, 
      visit: result.data,
      message: 'Veterinary visit scheduled successfully'
    })
    
  } catch (error) {
    console.error('Veterinary visits API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error while scheduling visit' 
    }, { status: 500 })
  }
}

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
    
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const upcoming = searchParams.get('upcoming') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')
    
    const visits = await getVeterinaryVisits(userRole.farm_id, {
      status,
      upcoming,
      limit
    })
    
    const upcomingVisits = await getUpcomingVisits(userRole.farm_id)
    const followUpVisits = await getFollowUpVisits(userRole.farm_id)
    
    return NextResponse.json({ 
      visits,
      upcomingVisits,
      followUpVisits,
      totalCount: visits.length
    })
    
  } catch (error) {
    console.error('Get veterinary visits API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error while fetching visits' 
    }, { status: 500 })
  }
}