// app/api/feed/consumption/route.ts - Fixed validation for batch mode
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const farmId = searchParams.get('farm_id')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!farmId) {
      return NextResponse.json({ error: 'farm_id parameter required' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    
    // Get consumption records with related data
    const { data: records, error } = await supabase
      .from('feed_consumption')
      .select(`
        *,
        feed_consumption_animals (
          animal_id
        )
      `)
      .eq('farm_id', farmId)
      .order('feeding_time', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(records || [])
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { farmId, feedingTime, mode, entries } = body

    console.log('Received feeding data:', { farmId, feedingTime, mode, entries })

    // Validate required fields
    if (!farmId || !entries || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ 
        error: 'Missing required fields: farmId, entries' 
      }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    
    const consumptionRecords = []

    // Process each entry
    for (const entry of entries) {
      const { feedTypeId, quantityKg, animalIds, animalCount, notes } = entry

      // Validate entry based on feeding mode
      if (!feedTypeId || !quantityKg) {
        return NextResponse.json({ 
          error: 'Each entry must have feedTypeId and quantityKg' 
        }, { status: 400 })
      }

      // Mode-specific validation
      if (mode === 'individual') {
        if (!animalIds || !Array.isArray(animalIds) || animalIds.length === 0) {
          return NextResponse.json({ 
            error: 'Individual mode requires animalIds array with at least one animal' 
          }, { status: 400 })
        }
      } else if (mode === 'batch') {
        if (!animalCount || animalCount <= 0) {
          return NextResponse.json({ 
            error: 'Batch mode requires animalCount greater than 0' 
          }, { status: 400 })
        }
      } else {
        return NextResponse.json({ 
          error: 'Invalid feeding mode. Must be "individual" or "batch"' 
        }, { status: 400 })
      }

      // Create proper timestamp from feeding time
      let feedingTimestamp: string
      
      if (feedingTime) {
        // If feedingTime is just a time (HH:mm), combine with today's date
        if (feedingTime.match(/^\d{2}:\d{2}$/)) {
          const today = new Date()
          const [hours, minutes] = feedingTime.split(':')
          today.setHours(parseInt(hours), parseInt(minutes), 0, 0)
          feedingTimestamp = today.toISOString()
        } else {
          // If it's already a full timestamp, use it
          feedingTimestamp = new Date(feedingTime).toISOString()
        }
      } else {
        // Default to current time
        feedingTimestamp = new Date().toISOString()
      }

      console.log('Using feeding timestamp:', feedingTimestamp)

      // Create consumption record
      const insertData = {
        farm_id: farmId,
        feed_type_id: feedTypeId,
        quantity_kg: parseFloat(quantityKg),
        feeding_time: feedingTimestamp,
        feeding_mode: mode || 'individual',
        animal_count: mode === 'batch' ? animalCount : (animalIds?.length || 1),
        notes: notes || null,
        recorded_by: user.email || 'Unknown',
        created_by: user.id
      }

      console.log('Inserting consumption data:', insertData)

      const { data: consumptionRecord, error: consumptionError } = await supabase
        .from('feed_consumption')
        .insert(insertData)
        .select()
        .single()

      if (consumptionError) {
        console.error('Consumption insert error:', consumptionError)
        return NextResponse.json({ 
          error: `Failed to create consumption record: ${consumptionError.message}`,
          details: consumptionError
        }, { status: 500 })
      }

      console.log('Created consumption record:', consumptionRecord)

      // Create animal consumption records (only for individual mode with specific animals)
      if (mode === 'individual' && animalIds && animalIds.length > 0) {
        const animalRecords = animalIds.map((animalId: string) => ({
          consumption_id: consumptionRecord.id,
          animal_id: animalId
        }))

        console.log('Inserting animal records:', animalRecords)

        const { error: animalError } = await supabase
          .from('feed_consumption_animals')
          .insert(animalRecords)

        if (animalError) {
          console.error('Animal consumption insert error:', animalError)
          // Continue processing other entries even if this fails
          console.warn('Failed to link animals to consumption record, but consumption was recorded')
        }
      }

      consumptionRecords.push(consumptionRecord)
    }

    return NextResponse.json({ 
      success: true,
      records: consumptionRecords,
      message: `Successfully recorded ${consumptionRecords.length} consumption record(s)`
    }, { status: 201 })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Get consumption statistics
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const farmId = searchParams.get('farm_id')
    const days = parseInt(searchParams.get('days') || '30')

    if (!farmId) {
      return NextResponse.json({ error: 'farm_id parameter required' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - days)

    // Get consumption statistics
    const { data: stats, error } = await supabase
      .from('feed_consumption')
      .select('quantity_kg, feeding_time, feed_type_id')
      .eq('farm_id', farmId)
      .gte('feeding_time', startDate.toISOString())
      .lte('feeding_time', endDate.toISOString())

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate statistics
    const totalQuantity = stats?.reduce((sum, record) => sum + record.quantity_kg, 0) || 0
    const avgDailyQuantity = totalQuantity / days
    
    // Group by date for daily summaries
    const dailyConsumption = stats?.reduce((acc: any, record) => {
      const date = new Date(record.feeding_time).toISOString().split('T')[0]
      if (!acc[date]) {
        acc[date] = 0
      }
      acc[date] += record.quantity_kg
      return acc
    }, {}) || {}

    const dailySummaries = Object.entries(dailyConsumption).map(([date, quantity]) => ({
      date,
      quantity: quantity as number
    }))

    return NextResponse.json({
      totalQuantity,
      avgDailyQuantity,
      recordCount: stats?.length || 0,
      dailySummaries,
      periodDays: days
    })

  } catch (error) {
    console.error('Stats API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}