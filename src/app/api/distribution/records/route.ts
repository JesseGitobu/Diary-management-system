// app/api/distribution/records/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, getUserRole, createServerSupabaseClient } from '@/lib/supabase/server'
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm access' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status')
    const channelType = searchParams.get('channelType')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    const supabase = await createServerSupabaseClient()
    let query = supabase
  .from('distribution_records')
  .select(`
    *,
    distribution_channels (
      id,
      name,
      type,
      contact_person,
      is_paid_for,
      price_per_liter,
      metadata
    ),
    distribution_delivery_logs (
      id,
      delivery_date,
      delivery_time,
      driver_name,
      vehicle_number
    ),
    distribution_payment_records (
      id,
      payment_method,
      expected_payment_date,
      actual_payment_date,
      payment_status,
      amount_paid
    )
  `)
  .eq('farm_id', userRole.farm_id)
  .order('distribution_date', { ascending: false })
  .order('created_at', { ascending: false })

    // Apply filters
    if (status) {
      query = query.eq('distribution_status', status as any)
    }
    
    if (dateFrom) {
      query = query.gte('distribution_date', dateFrom)
    }
    
    if (dateTo) {
      query = query.lte('distribution_date', dateTo)
    }

    query = query.range(offset, offset + limit - 1)

    const { data: records, error } = await query

    if (error) throw error

    // Normalize data to flat shape expected by component
    const normalized = (records ?? []).map((r: any) => {
      const deliveryLog = r.distribution_delivery_logs?.[0] ?? null
      const paymentRec  = r.distribution_payment_records?.[0] ?? null
      const channel     = r.distribution_channels ?? {}

      return {
        id:                    r.id,
        distribution_date:     r.distribution_date,
        distribution_status:   r.distribution_status,
        quantity_distributed:  r.quantity_distributed,
        unit_price:            r.unit_price,
        total_amount:          r.total_amount,
        notes:                 r.notes,
        channelName:           channel.name ?? 'Unknown channel',
        channelType:           channel.type ?? 'other',
        isPaidFor:             channel.is_paid_for !== false,
        distribution_channels: r.distribution_channels,
        delivery: deliveryLog ? {
          id:             deliveryLog.id,
          driver_name:    deliveryLog.driver_name,
          vehicle_number: deliveryLog.vehicle_number,
          delivery_date:  deliveryLog.delivery_date,
          delivery_time:  deliveryLog.delivery_time,
        } : null,
        payment: paymentRec ? {
          id:                    paymentRec.id,
          method:                paymentRec.payment_method,
          expected_date:         paymentRec.expected_payment_date,
          actual_date:           paymentRec.actual_payment_date,
          status:                paymentRec.payment_status,
          amount_paid:           paymentRec.amount_paid,
        } : null,
      }
    })

    return NextResponse.json(normalized || [])
  } catch (error) {
    console.error('Error fetching distribution records:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id || !['farm_owner', 'farm_manager', 'worker'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { records } = body

    // Validate records array
    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: 'No distribution records provided' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()

    // Validate all records have required fields and channels exist
    const channelIds = [...new Set(records.map((r: any) => r.channelId))]
    const { data: channels, error: channelsError } = await supabase
      .from('distribution_channels')
      .select('id, is_active, name, type')
      .eq('farm_id', userRole.farm_id)
      .in('id', channelIds)

    if (channelsError) {
      return NextResponse.json({ error: 'Failed to validate channels' }, { status: 400 })
    }

    const validChannels = new Map((channels as any[]).map(c => [c.id, c]))

    for (const record of records) {
      if (!record.channelId || record.volume === undefined || record.volume === null || !record.recordDate) {
        return NextResponse.json({ error: 'Missing required fields in distribution record' }, { status: 400 })
      }

      const channel = validChannels.get(record.channelId)
      if (!channel) {
        return NextResponse.json({ error: `Invalid channel: ${record.channelId}` }, { status: 400 })
      }

      if (!channel.is_active) {
        return NextResponse.json({ error: `Channel is not active: ${channel.name}` }, { status: 400 })
      }
    }

    // Insert all distribution records
    // Note: Views (milk_inventory_summary, daily_milk_distribution_summary) will automatically
    // reflect the updated data through their queries
    const distributionRecordsToInsert = records.map((record: any) => ({
      farm_id: userRole.farm_id,
      channel_id: record.channelId,
      quantity_distributed: parseFloat(record.volume),
      unit_price: record.pricePerLiter ? parseFloat(record.pricePerLiter) : null,
      total_amount: record.totalAmount ? parseFloat(record.totalAmount) : null,
      distribution_date: record.recordDate,
      distribution_status: record.status || 'pending',
      notes: record.notes || null
    }))

    const { data: createdRecords, error: recordError } = await (supabase as any)
      .from('distribution_records')
      .insert(distributionRecordsToInsert)
      .select()

    if (recordError || !createdRecords || createdRecords.length === 0) {
      throw new Error(`Failed to create distribution records: ${recordError?.message}`)
    }

    // Insert delivery records if delivery data is provided
    const deliveriesToInsert = createdRecords
      .map((createdRecord: any, index: number) => {
        const originalRecord = records[index]
        if (originalRecord?.deliveryDate || originalRecord?.deliveryTime || originalRecord?.driverName) {
          return {
            farm_id: userRole.farm_id,
            distribution_record_id: createdRecord.id,
            delivery_date: originalRecord.deliveryDate || createdRecord.distribution_date,
            delivery_time: originalRecord.deliveryTime || null,
            driver_name: originalRecord.driverName || null,
            vehicle_number: originalRecord.vehicleNumber || null,
            notes: originalRecord.deliveryNotes || null
          }
        }
        return null
      })
      .filter((d: any) => d !== null)

    if (deliveriesToInsert.length > 0) {
      const { error: deliveryError } = await (supabase as any)
        .from('deliveries')
        .insert(deliveriesToInsert)

      if (deliveryError) {
        console.error('Error creating delivery records:', deliveryError)
      }
    }

    // Fetch complete records with relationships
    const { data: completeRecords } = await (supabase as any)
      .from('distribution_records')
      .select(`
        *,
        distribution_channels (
          id,
          name,
          type,
          contact_person
        ),
        deliveries (
          id,
          delivery_date,
          delivery_time,
          driver_name,
          vehicle_number,
          notes
        )
      `)
      .in('id', createdRecords.map((r: any) => r.id))

    // Log success
    const recordDate = records[0].recordDate
    const totalVolume = records.reduce((sum: number, r: any) => sum + parseFloat(r.volume), 0)
    console.log(`Successfully created ${createdRecords.length} distribution record(s) for farm ${userRole.farm_id} on ${recordDate}, total volume: ${totalVolume}L`)

    return NextResponse.json(
      {
        success: true,
        message: `Successfully created ${createdRecords.length} distribution record(s)`,
        records: completeRecords || createdRecords
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating distribution records:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}