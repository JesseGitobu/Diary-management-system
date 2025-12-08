// app/api/farms/[farmId]/animals/[id]/consumption-records/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getAnimalConsumptionRecords } from '@/lib/database/feedConsumption'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ farmId: string; id: string }> } // Changed to 'id'
) {
  try {
    console.log('=== Consumption Records API Called ===')
    
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Await the params first
    const { farmId, id: animalId } = await params // Extract 'id' and rename to 'animalId'
    console.log('Extracted IDs:', { farmId, animalId })
    
    // Add validation to ensure the IDs are valid UUIDs
    if (!farmId || !animalId) {
      console.log('ERROR: Missing farmId or animalId')
      return NextResponse.json({ 
        error: 'Missing farmId or animalId',
        received: { farmId, animalId }
      }, { status: 400 })
    }
    
    // Basic UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(farmId) || !uuidRegex.test(animalId)) {
      return NextResponse.json({ error: 'Invalid UUID format' }, { status: 400 })
    }
    
    const userRole = await getUserRole(user.id) as any
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }

    // Verify farm access
    if (userRole.farm_id !== farmId) {
      return NextResponse.json({ error: 'Access denied to this farm' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    
    console.log('Fetching consumption records for:', { farmId, animalId, limit })
    
    // Get animal-specific consumption records
    const records = await getAnimalConsumptionRecords(farmId, animalId, limit)
    
    return NextResponse.json({ 
      success: true,
      records: records,
      total: records.length 
    })
    
  } catch (error) {
    console.error('Animal consumption records API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}