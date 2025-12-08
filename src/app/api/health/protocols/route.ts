// 3. API Route - src/app/api/health/protocols/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createHealthProtocol, getFarmHealthProtocols } from '@/lib/database/health-protocols'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id) as any
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }
    
    // Check permissions
    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    const body = await request.json()
    
    // ✅ CRITICAL FIX: Clean up the data before processing
    const {
      protocol_name,
      protocol_type,
      description,
      frequency_type,
      frequency_value,
      start_date,
      end_date,
      target_animals,
      animal_groups,
      individual_animals,
      veterinarian,
      estimated_cost,
      notes,
      auto_create_records,
      farm_id
    } = body
    
    // Security check
    if (farm_id && farm_id !== userRole.farm_id) {
      return NextResponse.json({ error: 'Invalid farm ID' }, { status: 403 })
    }
    
    // ✅ FIX: Clean up date fields - convert empty strings to null
    const cleanedProtocolData = {
      protocol_name,
      protocol_type,
      description,
      frequency_type,
      frequency_value,
      start_date: start_date || null, // Convert empty string to null
      end_date: end_date && end_date.trim() !== '' ? end_date : null, // Convert empty string to null
      target_animals,
      animal_groups: animal_groups || null,
      individual_animals: individual_animals || null,
      veterinarian: veterinarian && veterinarian.trim() !== '' ? veterinarian : null,
      estimated_cost: estimated_cost || null,
      notes: notes && notes.trim() !== '' ? notes : null,
      auto_create_records: auto_create_records ?? true,
    }
    
    // Additional validation
    if (!cleanedProtocolData.start_date) {
      return NextResponse.json({ error: 'Start date is required' }, { status: 400 })
    }
    
    // Validate date format
    if (cleanedProtocolData.start_date && isNaN(Date.parse(cleanedProtocolData.start_date))) {
      return NextResponse.json({ error: 'Invalid start date format' }, { status: 400 })
    }
    
    if (cleanedProtocolData.end_date && isNaN(Date.parse(cleanedProtocolData.end_date))) {
      return NextResponse.json({ error: 'Invalid end date format' }, { status: 400 })
    }
    
    const result = await createHealthProtocol(userRole.farm_id, user.id, cleanedProtocolData)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    return NextResponse.json({
      success: true,
      protocol: result.data,
      message: 'Health protocol created successfully'
    })
    
  } catch (error) {
    console.error('Health protocols API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id) as any
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }
    
    const protocols = await getFarmHealthProtocols(userRole.farm_id)
    
    return NextResponse.json({
      success: true,
      protocols
    })
    
  } catch (error) {
    console.error('Get health protocols API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
