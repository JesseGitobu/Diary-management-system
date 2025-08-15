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
      farmId, // Accept farmId from request body
      name,
      type,
      contact,
      email,
      contactPerson,
      pricePerLiter,
      location,
      paymentTerms,
      notes,
      isActive
    } = body

    // Validate required fields
    if (!farmId || !name || !type || !contact || !pricePerLiter) {
      return NextResponse.json({ 
        error: 'Missing required fields: farmId, name, type, contact, pricePerLiter' 
      }, { status: 400 })
    }

    // Validate type
    if (!['cooperative', 'processor', 'direct', 'retail'].includes(type)) {
      return NextResponse.json({ 
        error: 'Invalid type. Must be one of: cooperative, processor, direct, retail' 
      }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    
    const insertData = {
      farm_id: farmId,
      name: name.trim(),
      type,
      contact: contact.trim(),
      email: email?.trim() || null,
      contact_person: contactPerson?.trim() || null,
      price_per_liter: parseFloat(pricePerLiter),
      location: location?.trim() || null,
      payment_terms: paymentTerms || 'Monthly Payment',
      notes: notes?.trim() || null,
      is_active: isActive !== false
    }

    console.log('Inserting channel data:', insertData)

    const { data: channel, error } = await supabase
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