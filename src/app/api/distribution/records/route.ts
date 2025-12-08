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
          contact
        )
      `)
      .eq('farm_id', userRole.farm_id)
      .order('delivery_date', { ascending: false })
      .order('created_at', { ascending: false })

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    
    if (dateFrom) {
      query = query.gte('delivery_date', dateFrom)
    }
    
    if (dateTo) {
      query = query.lte('delivery_date', dateTo)
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
      deliveryDate,
      deliveryTime,
      driverName,
      vehicleNumber,
      paymentMethod,
      expectedPaymentDate,
      notes,
      status
    } = body

    // Validate required fields
    if (!channelId || !volume || !pricePerLiter || !deliveryDate || !driverName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    
    // Validate channel belongs to farm
    const { data: channelResult, error: channelError } = await supabase
      .from('distribution_channels')
      .select('id, is_active')
      .eq('id', channelId)
      .eq('farm_id', userRole.farm_id)
      .single()

    // Cast to any to fix "Property 'is_active' does not exist on type 'never'"
    const channel = channelResult as any

    if (channelError || !channel) {
      return NextResponse.json({ error: 'Invalid channel' }, { status: 400 })
    }

    if (!channel.is_active) {
      return NextResponse.json({ error: 'Channel is not active' }, { status: 400 })
    }

    // Cast supabase to any to prevent insert type errors
    const { data: record, error } = await (supabase as any)
      .from('distribution_records')
      .insert({
        farm_id: userRole.farm_id,
        channel_id: channelId,
        volume: parseFloat(volume),
        price_per_liter: parseFloat(pricePerLiter),
        total_amount: parseFloat(totalAmount),
        delivery_date: deliveryDate,
        delivery_time: deliveryTime || null,
        driver_name: driverName.trim(),
        vehicle_number: vehicleNumber?.trim() || null,
        payment_method: paymentMethod || 'mpesa',
        expected_payment_date: expectedPaymentDate || null,
        notes: notes?.trim() || null,
        status: status || 'pending',
        created_by: user.id
      })
      .select(`
        *,
        distribution_channels (
          id,
          name,
          type,
          contact
        )
      `)
      .single()

    if (error) throw error

    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    console.error('Error creating distribution record:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}