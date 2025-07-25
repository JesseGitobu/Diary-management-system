// Health Records API Route
// src/app/api/health/records/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createHealthRecord, getAnimalHealthRecords } from '@/lib/database/health'

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
    
    const body = await request.json()
    const { 
      animal_id, 
      record_date, 
      record_type, 
      description, 
      veterinarian, 
      cost, 
      notes,
      next_due_date,
      medication,
      severity,
      farm_id 
    } = body
    
    // Verify the animal belongs to the user's farm
    const result = await createHealthRecord({
      animal_id,
      record_date,
      record_type,
      description,
      veterinarian: veterinarian || null,
      cost: cost || 0,
      notes: notes || null,
      next_due_date: next_due_date || null,
      medication: medication || null,
      severity: severity || null,
      created_by: user.id,
      farm_id: userRole.farm_id
    })
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: true, 
      record: result.data,
      message: 'Health record added successfully'
    })
    
  } catch (error) {
    console.error('Health records API error:', error)
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
    const recordType = searchParams.get('record_type')
    const limit = parseInt(searchParams.get('limit') || '50')
    
    const records = await getAnimalHealthRecords(userRole.farm_id, {
      animalId: animalId || undefined,
      recordType: recordType || undefined,
      limit
    })
    
    return NextResponse.json({ 
      success: true, 
      records 
    })
    
  } catch (error) {
    console.error('Health records GET API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
