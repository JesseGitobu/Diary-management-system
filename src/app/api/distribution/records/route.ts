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
          contact_person
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

    return NextResponse.json(records || [])
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
    const {
      channelId,
      volume,
      pricePerLiter,
      totalAmount,
      recordDate,
      deliveryDate,
      deliveryTime,
      driverName,
      vehicleNumber,
      paymentMethod,
      expectedPaymentDate,
      notes,
      status,
      calfFeedingData,
      isCalvesFeedingChannel
    } = body

    // Validate required fields
    if (!channelId || volume === undefined || volume === null || !recordDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    
    // Validate channel belongs to farm
    const { data: channelResult, error: channelError } = await supabase
      .from('distribution_channels')
      .select('id, is_active, name, type')
      .eq('id', channelId)
      .eq('farm_id', userRole.farm_id)
      .single()

    const channel = channelResult as any

    if (channelError || !channel) {
      return NextResponse.json({ error: 'Invalid channel' }, { status: 400 })
    }

    if (!channel.is_active) {
      return NextResponse.json({ error: 'Channel is not active' }, { status: 400 })
    }

    // Create distribution record
    const { data: record, error: recordError } = await (supabase as any)
      .from('distribution_records')
      .insert({
        farm_id: userRole.farm_id,
        channel_id: channelId,
        quantity_distributed: parseFloat(volume),
        unit_price: pricePerLiter ? parseFloat(pricePerLiter) : null,
        total_amount: totalAmount ? parseFloat(totalAmount) : null,
        distribution_date: recordDate,
        delivery_date: deliveryDate || null,
        delivery_time: deliveryTime || null,
        driver_name: driverName?.trim() || null,
        vehicle_number: vehicleNumber?.trim() || null,
        distribution_status: status || 'pending',
        notes: notes?.trim() || null
      })
      .select()
      .single()

    if (recordError || !record) {
      throw new Error(`Failed to create distribution record: ${recordError?.message}`)
    }

    // Create delivery log if applicable
    if (deliveryDate && (driverName || vehicleNumber)) {
      const { error: deliveryError } = await (supabase as any)
        .from('distribution_delivery_logs')
        .insert({
          farm_id: userRole.farm_id,
          distribution_record_id: record.id,
          driver_name: driverName?.trim() || null,
          vehicle_number: vehicleNumber?.trim() || null,
          delivery_date: deliveryDate,
          delivery_time: deliveryTime || null
        })

      if (deliveryError) {
        console.error('Error creating delivery log:', deliveryError)
        // Don't fail the entire request if delivery log fails
      }
    }

    // Create payment record if applicable
    if (paymentMethod) {
      const { error: paymentError } = await (supabase as any)
        .from('distribution_payment_records')
        .insert({
          farm_id: userRole.farm_id,
          distribution_record_id: record.id,
          payment_method: paymentMethod,
          expected_payment_date: expectedPaymentDate || null,
          payment_status: 'pending'
        })

      if (paymentError) {
        console.error('Error creating payment record:', paymentError)
        // Don't fail the entire request if payment record fails
      }
    }

    // Create calf milk feeding records if this is a Calves Feeding channel
    if (isCalvesFeedingChannel && calfFeedingData && calfFeedingData.calves && Array.isArray(calfFeedingData.calves)) {
      const calfRecords = calfFeedingData.calves.map((calf: any) => ({
        farm_id: userRole.farm_id,
        distribution_record_id: record.id,
        animal_id: calf.calfId,
        feeding_date: recordDate,
        volume_liters: parseFloat(calf.dailyMilkPerCalf),
        is_adjusted: calf.isAdjusted || false,
        original_volume_liters: calf.originalDailyMilkPerCalf ? parseFloat(calf.originalDailyMilkPerCalf) : null
      }))

      const { error: calfError } = await (supabase as any)
        .from('calf_milk_feeding_records')
        .insert(calfRecords)

      if (calfError) {
        console.error('Error creating calf feeding records:', calfError)
        // Don't fail the entire request if calf records fail
      }
    }

    // Fetch complete record with relationships
    const { data: completeRecord, error: fetchError } = await (supabase as any)
      .from('distribution_records')
      .select(`
        *,
        distribution_channels (
          id,
          name,
          type,
          contact_person
        )
      `)
      .eq('id', record.id)
      .single()

    if (fetchError) {
      console.error('Error fetching complete record:', fetchError)
      return NextResponse.json(record, { status: 201 })
    }

    return NextResponse.json(completeRecord, { status: 201 })
  } catch (error) {
    console.error('Error creating distribution record:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}