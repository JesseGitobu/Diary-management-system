// app/api/feed/consumption/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import {
  recordFeedConsumption,
  getFeedConsumptionRecords,
  getFeedConsumptionStats,
  validateConsumptionEntry,
  ConsumptionData
} from '@/lib/database/feedConsumption'

// GET feed consumption records
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
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const statsOnly = searchParams.get('stats_only') === 'true'
    const days = parseInt(searchParams.get('days') || '30')

    if (statsOnly) {
      // Return consumption statistics
      const stats = await getFeedConsumptionStats(userRole.farm_id, days)
      return NextResponse.json(stats)
    } else {
      // Return consumption records
      const records = await getFeedConsumptionRecords(userRole.farm_id, limit, offset)
      return NextResponse.json(records)
    }

  } catch (error) {
    console.error('Feed consumption GET API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST create new feed consumption record
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

    // Check permissions - allow farm_owner, farm_manager, worker
    if (!['farm_owner', 'farm_manager', 'worker'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions to record feed consumption' }, { status: 403 })
    }

    const body = await request.json()
    console.log('Received consumption request:', body)

    // Validate required fields
    if (!body.entries || !Array.isArray(body.entries) || body.entries.length === 0) {
      return NextResponse.json({ 
        error: 'Missing required field: entries (must be non-empty array)' 
      }, { status: 400 })
    }

    if (!body.mode || !['individual', 'batch'].includes(body.mode)) {
      return NextResponse.json({ 
        error: 'Invalid or missing mode. Must be "individual" or "batch"' 
      }, { status: 400 })
    }

    // Validate each entry
    for (let i = 0; i < body.entries.length; i++) {
      const entry = body.entries[i]
      
      if (!entry.feedTypeId || !entry.quantityKg) {
        return NextResponse.json({ 
          error: `Entry ${i + 1}: Missing required fields (feedTypeId, quantityKg)` 
        }, { status: 400 })
      }

      if (entry.quantityKg <= 0) {
        return NextResponse.json({ 
          error: `Entry ${i + 1}: Quantity must be greater than 0` 
        }, { status: 400 })
      }

      // Mode-specific validation
      if (body.mode === 'individual') {
        if (!entry.animalIds || !Array.isArray(entry.animalIds) || entry.animalIds.length === 0) {
          return NextResponse.json({ 
            error: `Entry ${i + 1}: Individual mode requires animalIds array with at least one animal` 
          }, { status: 400 })
        }
      } else if (body.mode === 'batch') {
        if (!entry.animalCount || entry.animalCount <= 0) {
          return NextResponse.json({ 
            error: `Entry ${i + 1}: Batch mode requires animalCount greater than 0` 
          }, { status: 400 })
        }
        // For batch mode, animalIds should be provided to populate feed_consumption_animals table
        if (!entry.animalIds || !Array.isArray(entry.animalIds) || entry.animalIds.length === 0) {
          return NextResponse.json({ 
            error: `Entry ${i + 1}: Batch mode requires animalIds array to track individual animal consumption` 
          }, { status: 400 })
        }
      }

      // Validate the entry against database constraints
      const validation = await validateConsumptionEntry(userRole.farm_id, entry)
      if (!validation.valid) {
        return NextResponse.json({ 
          error: `Entry ${i + 1}: ${validation.error}` 
        }, { status: 400 })
      }
    }

    // Prepare consumption data
    const consumptionData: ConsumptionData = {
      farmId: userRole.farm_id,
      feedingTime: body.feedingTime || new Date().toISOString(),
      mode: body.mode,
      batchId: body.batchId || null,
      entries: body.entries,
      recordedBy: user.email || 'Unknown',
      globalNotes: body.notes
    }

    // Record consumption using database function
    const result = await recordFeedConsumption(consumptionData, user.id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    console.log('Successfully recorded consumption:', result.data)

    return NextResponse.json({ 
      success: true,
      records: result.data,
      message: `Successfully recorded ${result.data.length} consumption record(s)`
    }, { status: 201 })

  } catch (error) {
    console.error('Feed consumption POST API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// PUT update consumption statistics endpoint (keeping for backward compatibility)
export async function PUT(request: NextRequest) {
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
    const days = parseInt(searchParams.get('days') || '30')

    const stats = await getFeedConsumptionStats(userRole.farm_id, days)
    
    return NextResponse.json(stats)

  } catch (error) {
    console.error('Feed consumption PUT API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}