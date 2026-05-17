// ✅ UPDATED API Route - src/app/api/health/protocols/route.ts
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
    if (!['farm_owner', 'farm_manager', 'veterinarian'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    const body = await request.json()
    
    // ✅ Extract and validate required fields
    const {
      protocol_name,
      protocol_type,
      description,
      frequency_type,
      frequency_value,
      start_date,
      end_date,
      target_animals,
      individual_animals,
      veterinarian,
      estimated_cost,
      notes,
      auto_create_records,
      farm_id
    } = body
    
    // Security check - ensure farm_id matches user's farm
    if (farm_id && farm_id !== userRole.farm_id) {
      return NextResponse.json({ error: 'Invalid farm ID' }, { status: 403 })
    }
    
    // ✅ Data cleanup and validation
    const cleanedProtocolData = {
      protocol_name: protocol_name?.trim() || '',
      protocol_type: protocol_type || 'vaccination',
      description: description?.trim() || '',
      frequency_type: frequency_type || 'monthly',
      frequency_value: parseInt(frequency_value) || 1,
      start_date: start_date || null, // Convert empty string to null
      end_date: (end_date && end_date.trim() !== '') ? end_date.trim() : null, // Convert empty string to null
      target_animals: target_animals || 'all',
      individual_animals: Array.isArray(individual_animals) ? individual_animals : null,
      veterinarian: (veterinarian && veterinarian.trim() !== '') ? veterinarian.trim() : null,
      estimated_cost: estimated_cost ? parseFloat(estimated_cost) : null,
      notes: (notes && notes.trim() !== '') ? notes.trim() : null,
      auto_create_records: auto_create_records ?? true,
    }
    
    // ✅ Validate required fields
    if (!cleanedProtocolData.protocol_name || cleanedProtocolData.protocol_name.length < 2) {
      return NextResponse.json({ error: 'Protocol name is required and must be at least 2 characters' }, { status: 400 })
    }
    
    if (!cleanedProtocolData.description || cleanedProtocolData.description.length < 5) {
      return NextResponse.json({ error: 'Description is required and must be at least 5 characters' }, { status: 400 })
    }
    
    if (!cleanedProtocolData.start_date) {
      return NextResponse.json({ error: 'Start date is required' }, { status: 400 })
    }
    
    // Validate date format (YYYY-MM-DD)
    if (cleanedProtocolData.start_date && isNaN(Date.parse(cleanedProtocolData.start_date))) {
      return NextResponse.json({ error: 'Invalid start date format (use YYYY-MM-DD)' }, { status: 400 })
    }
    
    if (cleanedProtocolData.end_date && isNaN(Date.parse(cleanedProtocolData.end_date))) {
      return NextResponse.json({ error: 'Invalid end date format (use YYYY-MM-DD)' }, { status: 400 })
    }
    
    // Validate end date is after start date
    if (cleanedProtocolData.end_date) {
      const startDate = new Date(cleanedProtocolData.start_date)
      const endDate = new Date(cleanedProtocolData.end_date)
      if (endDate <= startDate) {
        return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 })
      }
    }
    
    // Validate frequency value
    if (cleanedProtocolData.frequency_value < 1 || cleanedProtocolData.frequency_value > 365) {
      return NextResponse.json({ error: 'Frequency value must be between 1 and 365' }, { status: 400 })
    }
    
    // Validate estimated_cost format
    if (cleanedProtocolData.estimated_cost && (cleanedProtocolData.estimated_cost < 0 || cleanedProtocolData.estimated_cost > 999999999999.99)) {
      return NextResponse.json({ error: 'Estimated cost must be between 0 and 999999999999.99' }, { status: 400 })
    }
    
    console.log('Processing protocol request:', { ...cleanedProtocolData, farm_id: userRole.farm_id })
    
    // Create the protocol (animals will be associated via junction table)
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
