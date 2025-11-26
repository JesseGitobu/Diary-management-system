// src/app/api/production/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createProductionRecord, getProductionRecords } from '@/lib/database/production'

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
    const { farm_id, ...productionData } = body
    
    // Verify user owns the farm
    if (farm_id !== userRole.farm_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Add recorded_by field
    const dataWithRecorder = {
      ...productionData,
      recorded_by: user.id,
    }
    
    const result = await createProductionRecord(userRole.farm_id, dataWithRecorder)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: true, 
      data: result.data,
      message: 'Production record created successfully'
    })
    
  } catch (error) {
    console.error('Production API error:', error)
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
    const animalId = searchParams.get('animal_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    
    const records = await getProductionRecords(
      userRole.farm_id,
      animalId || undefined,
      startDate || undefined,
      endDate || undefined
    )
    
    return NextResponse.json({ 
      success: true, 
      data: records 
    })
    
  } catch (error) {
    console.error('Production GET API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}