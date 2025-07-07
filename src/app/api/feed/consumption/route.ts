import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { recordFeedConsumption, getFeedConsumption } from '@/lib/database/feed'

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
    
    // Check permissions
    if (!['farm_owner', 'farm_manager', 'worker'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    const body = await request.json()
    
    // Add recorded_by field
    const dataWithRecorder = {
      ...body,
      recorded_by: user.id,
    }
    
    const result = await recordFeedConsumption(userRole.farm_id, dataWithRecorder)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: true, 
      data: result.data,
      message: 'Feed consumption recorded successfully'
    })
    
  } catch (error) {
    console.error('Feed consumption API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const animalId = searchParams.get('animal_id')
    
    const consumption = await getFeedConsumption(
      userRole.farm_id,
      startDate || undefined,
      endDate || undefined,
      animalId || undefined
    )
    
    return NextResponse.json({ 
      success: true, 
      data: consumption 
    })
    
  } catch (error) {
    console.error('Feed consumption GET API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}