// app/api/distribution/channels/route.ts - Simplified version for testing
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // For testing, let's get the farm_id from query params or use a default
    const { searchParams } = new URL(request.url)
    const farmId = searchParams.get('farm_id')
    
    if (!farmId) {
      return NextResponse.json({ error: 'farm_id parameter required' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const { data: channels, error } = await supabase
      .from('distribution_channels')
      .select('*')
      .eq('farm_id', farmId)
      .order('name', { ascending: true })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(channels || [])
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
    const {
      farmId,
      name,
      type,
      contact,
      email,
      contactPerson,
      pricePerLiter,
      location,
      paymentTerms,
      notes,
      isActive,
      isPaidFor,
      // Retail specific
      storeType,
      customerCount,
      retailOutlets,
      deliveryOptions,
      // Direct Sales specific
      salesMethod,
      customerType,
      salesFrequency,
      buyerDetails,
      // Other specific
      useReason,
      customReason,
      authorizationPerson
    } = body

    // Validate required common fields
    if (!farmId || !name || !type) {
      return NextResponse.json({ 
        error: 'Missing required fields: farmId, name, type' 
      }, { status: 400 })
    }

    // Validate type
    if (!['cooperative', 'processor', 'direct', 'retail', 'other'].includes(type)) {
      return NextResponse.json({ 
        error: 'Invalid type. Must be one of: cooperative, processor, direct, retail, other' 
      }, { status: 400 })
    }

    // Conditional validation based on type
    if (type !== 'other' && !contact) {
      return NextResponse.json({ 
        error: 'Contact is required for this channel type' 
      }, { status: 400 })
    }

    if ((type !== 'other' || (type === 'other' && isPaidFor)) && !pricePerLiter) {
      return NextResponse.json({ 
        error: 'Price per liter is required for this channel type and payment status' 
      }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    
    // Build metadata object based on channel type
    const metadata: Record<string, any> = {}
    
    if (type === 'retail') {
      metadata.storeType = storeType
      metadata.customerCount = customerCount
      metadata.retailOutlets = retailOutlets
      metadata.deliveryOptions = deliveryOptions
    } else if (type === 'direct') {
      metadata.salesMethod = salesMethod
      metadata.customerType = customerType
      metadata.salesFrequency = salesFrequency
      metadata.buyerDetails = buyerDetails
    } else if (type === 'other') {
      metadata.useReason = useReason
      metadata.customReason = customReason
      metadata.authorizationPerson = authorizationPerson
    }
    
    const insertData = {
      farm_id: farmId,
      name: name.trim(),
      type,
      contact: contact?.trim() || null,
      email: email?.trim() || null,
      contact_person: contactPerson?.trim() || null,
      price_per_liter: pricePerLiter ? parseFloat(pricePerLiter) : null,
      location: location?.trim() || null,
      payment_terms: paymentTerms || null,
      notes: notes?.trim() || null,
      is_active: isActive !== false,
      is_paid_for: isPaidFor !== false,
      metadata
    }

    console.log('Inserting channel data:', insertData)

    // Cast supabase to any to fix "Argument of type ... is not assignable to parameter of type 'never'"
    const { data: channel, error } = await (supabase as any)
      .from('distribution_channels')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Database insert error:', error)
      return NextResponse.json({ 
        error: `Database error: ${error.message}`,
        details: error
      }, { status: 500 })
    }

    return NextResponse.json(channel, { status: 201 })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}