// app/api/feed/consumption/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { format } from 'date-fns'
import {
  recordFeedConsumption,
  getFeedConsumptionRecords,
  getFeedConsumptionStats,
  validateConsumptionEntry,
  ConsumptionData
} from '@/lib/database/feedConsumption'
import { createScheduledFeeding } from '@/lib/database/scheduledFeedings'

// GET feed consumption records
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

// POST create new feed consumption record or scheduled feeding
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
      return NextResponse.json({ error: 'Insufficient permissions to record feed consumption' }, { status: 403 })
    }

    const body = await request.json()
    console.log('=== FEED CONSUMPTION API POST RECEIVED ===')
    console.log('Request User:', user.email)
    console.log('Farm ID:', userRole.farm_id)
    console.log('Feeding Mode:', body.mode)
    console.log('Received consumption request:', JSON.stringify(body, null, 2))

    // Calculate time difference between feeding time and now
    const now = new Date()
    const feedingDate = new Date(body.feedingTime || now)
    const timeDifferenceHours = (feedingDate.getTime() - now.getTime()) / (1000 * 60 * 60)

    // Validate required fields
    if (!body.entries || !Array.isArray(body.entries) || body.entries.length === 0) {
      return NextResponse.json({ 
        error: 'Missing required field: entries (must be non-empty array)' 
      }, { status: 400 })
    }

    if (!body.mode || !['individual', 'ration', 'feed-mix-recipe', 'feed-mix-template'].includes(body.mode)) {
      return NextResponse.json({
        error: 'Invalid or missing mode. Must be "individual", "ration", or "feed-mix-recipe"'
      }, { status: 400 })
    }
    // Normalise template mode to recipe mode (same DB value)
    if (body.mode === 'feed-mix-template') body.mode = 'feed-mix-recipe'

    // Mode-specific validation
    if (body.mode === 'feed-mix-recipe') {
      // Feed mix recipe mode validation
      if (!body.feedMixRecipeId) {
        return NextResponse.json({ 
          error: 'Feed mix recipe mode requires feedMixRecipeId' 
        }, { status: 400 })
      }
      
      if (!body.animalCount || body.animalCount <= 0) {
        return NextResponse.json({ 
          error: 'Feed mix recipe mode requires animalCount greater than 0' 
        }, { status: 400 })
      }

      // Validate entries for recipe mode
      for (let i = 0; i < body.entries.length; i++) {
        const entry = body.entries[i]
        
        if (!entry.feedTypeId || entry.quantityKg === undefined) {
          return NextResponse.json({ 
            error: `Entry ${i + 1}: Missing required fields (feedTypeId, quantityKg)` 
          }, { status: 400 })
        }

        if (entry.quantityKg < 0) {
          return NextResponse.json({ 
            error: `Entry ${i + 1}: Quantity cannot be negative` 
          }, { status: 400 })
        }
      }
    } else if (body.mode === 'ration') {
      // Ration mode validation
      if (!body.rationId) {
        return NextResponse.json({
          error: 'Ration mode requires rationId'
        }, { status: 400 })
      }

      for (let i = 0; i < body.entries.length; i++) {
        const entry = body.entries[i]

        if (!entry.feedTypeId || entry.quantityKg === undefined) {
          return NextResponse.json({
            error: `Entry ${i + 1}: Missing required fields (feedTypeId, quantityKg)`
          }, { status: 400 })
        }

        if (entry.quantityKg < 0) {
          return NextResponse.json({
            error: `Entry ${i + 1}: Quantity cannot be negative`
          }, { status: 400 })
        }
      }
    } else {
      // Individual mode validation
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

        if (!entry.animalIds || !Array.isArray(entry.animalIds) || entry.animalIds.length === 0) {
          return NextResponse.json({
            error: `Entry ${i + 1}: Individual mode requires animalIds array with at least one animal`
          }, { status: 400 })
        }

        // Validate the entry against database constraints
        const validation = await validateConsumptionEntry(userRole.farm_id, entry)
        if (!validation.valid) {
          console.error(`Validation failed for entry ${i + 1}:`, validation.error)
          return NextResponse.json({
            error: `Entry ${i + 1}: ${validation.error}`
          }, { status: 400 })
        }
      }
    }

    // Optional: Validate appetite score if provided
    if (body.appetiteScore !== undefined && body.appetiteScore !== null) {
      if (body.appetiteScore < 1 || body.appetiteScore > 5) {
        return NextResponse.json({ 
          error: 'Appetite score must be between 1 and 5' 
        }, { status: 400 })
      }
    }

    // Optional: Validate waste quantity if provided
    if (body.approximateWasteKg !== undefined && body.approximateWasteKg !== null) {
      if (body.approximateWasteKg < 0) {
        return NextResponse.json({ 
          error: 'Approximate waste cannot be negative' 
        }, { status: 400 })
      }
    }

    // SCHEDULING LOGIC: If feeding time is more than 1 hour in the future, create scheduled feeding
    if (timeDifferenceHours > 1) {
      console.log('📅 SCHEDULING: Feeding time is', timeDifferenceHours.toFixed(1), 'hours in the future')
      const result = await createScheduledFeeding(userRole.farm_id, body, user.id)
      
      if (!result.success) {
        console.error('❌ Failed to create scheduled feeding:', result.error)
        return NextResponse.json({ error: result.error }, { status: 500 })
      }

      console.log('✅ Successfully created scheduled feeding:', result.data?.id)
      console.log('=== SCHEDULING COMPLETED ===')

      return NextResponse.json({ 
        success: true,
        records: result.data ? [result.data] : [],
        type: 'scheduled',
        message: `Successfully scheduled feeding for ${format(feedingDate, 'MMM dd, HH:mm')}`
      }, { status: 201 })
    } else {
      // IMMEDIATE FEEDING: Record consumption using existing function
      console.log('⏱️ IMMEDIATE RECORDING: Feeding time is within 1 hour (', timeDifferenceHours.toFixed(1), 'hours)')
      const consumptionData: ConsumptionData = {
        farmId: userRole.farm_id,
        feedingTime: body.feedingTime || new Date().toISOString(),
        mode: body.mode,
        feedMixRecipeId: body.feedMixRecipeId || null,
        rationId: body.rationId || null,
        entries: body.entries,
        recordedBy: user.email || 'Unknown',
        globalNotes: body.notes,
        appetiteScore: body.appetiteScore ?? null,
        approximateWasteKg: body.approximateWasteKg ?? null,
        observationalNotes: body.observationalNotes || null,
        observations: body.observations || null,
        animalCount: body.animalCount || null,
        // TMR session fields (migration 069)
        feedTimeSlotId: body.feedTimeSlotId ?? null,
        slotName: body.slotName ?? null,
        sessionPercentage: body.sessionPercentage ?? null,
      }

      console.log('--- CONSUMPTION DATA TO BE PROCESSED ---')
      console.log('Mode:', consumptionData.mode)
      console.log('Entries count:', consumptionData.entries?.length || 0)
      console.log('Animal count:', consumptionData.animalCount)
      console.log('Recorded by:', consumptionData.recordedBy)

      const result = await recordFeedConsumption(consumptionData, user.id)

      if (!result.success) {
        console.error('❌ Failed to record consumption:', result.error)
        return NextResponse.json({ error: result.error }, { status: 500 })
      }

      console.log('✅ Successfully recorded consumption:', result.data?.length || 0, 'record(s)')
      result.data?.forEach((record: any, idx: number) => {
        console.log(`Record ${idx + 1}:`, {
          id: record.id,
          feedTypeId: record.feed_type_id,
          quantityConsumed: record.quantity_consumed,
          consumptionDate: record.consumption_date,
          mode: record.feeding_mode,
          animalCount: record.animal_count
        })
      })
      console.log('=== RECORDING COMPLETED ===')

      return NextResponse.json({ 
        success: true,
        records: result.data,
        type: 'immediate',
        message: `Successfully recorded ${result.data.length} consumption record(s)`
      }, { status: 201 })
    }

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

    const userRole = await getUserRole(user.id) as any
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