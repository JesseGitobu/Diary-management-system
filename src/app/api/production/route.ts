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
    
    const userRole = await getUserRole(user.id) as any
    
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
    
    // Validate required fields
    if (!productionData.animal_id) {
      return NextResponse.json({ error: 'animal_id is required' }, { status: 400 })
    }
    if (!productionData.record_date) {
      return NextResponse.json({ error: 'record_date is required' }, { status: 400 })
    }
    if (productionData.milk_volume === undefined || productionData.milk_volume === null) {
      return NextResponse.json({ error: 'milk_volume is required' }, { status: 400 })
    }
    if (!productionData.milking_session) {
      return NextResponse.json({ error: 'milking_session is required' }, { status: 400 })
    }
    if (!productionData.milk_safety_status) {
      return NextResponse.json({ error: 'milk_safety_status is required' }, { status: 400 })
    }
    
    // Validate milk_safety_status enum
    const validSafetyStatuses = ['safe', 'unsafe_health', 'unsafe_colostrum']
    if (!validSafetyStatuses.includes(productionData.milk_safety_status)) {
      return NextResponse.json({ 
        error: `milk_safety_status must be one of: ${validSafetyStatuses.join(', ')}` 
      }, { status: 400 })
    }
    
    // Validate mastitis_result if provided
    if (productionData.mastitis_result) {
      const validMastitisResults = ['negative', 'mild', 'severe']
      if (!validMastitisResults.includes(productionData.mastitis_result)) {
        return NextResponse.json({ 
          error: `mastitis_result must be one of: ${validMastitisResults.join(', ')}` 
        }, { status: 400 })
      }
    }
    
    // Build the data object with only valid fields
    const recordData = {
      animal_id: productionData.animal_id,
      record_date: productionData.record_date,
      milk_volume: Number(productionData.milk_volume),
      milking_session: productionData.milking_session,
      milk_safety_status: productionData.milk_safety_status,
      temperature: productionData.temperature ? Number(productionData.temperature) : null,
      mastitis_test_performed: productionData.mastitis_test_performed ?? false,
      mastitis_result: productionData.mastitis_result || null,
      affected_quarters: Array.isArray(productionData.affected_quarters) 
        ? productionData.affected_quarters 
        : null,
      fat_content: productionData.fat_content ? Number(productionData.fat_content) : null,
      protein_content: productionData.protein_content ? Number(productionData.protein_content) : null,
      somatic_cell_count: productionData.somatic_cell_count ? Number(productionData.somatic_cell_count) : null,
      lactose_content: productionData.lactose_content ? Number(productionData.lactose_content) : null,
      ph_level: productionData.ph_level ? Number(productionData.ph_level) : null,
      notes: productionData.notes || null,
      recording_type: productionData.recording_type || 'individual',
      milking_group_id: productionData.milking_group_id || null,
      recorded_by: user.id,
    }
    
    const result = await createProductionRecord(userRole.farm_id, recordData)
    
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
    
    const userRole = await getUserRole(user.id) as any
    
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