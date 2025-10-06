// app/api/distribution/channels/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, getUserRole, createServerSupabaseClient } from '@/lib/supabase/server'

export async function PUT(request: NextRequest, context: any) {
  const { params } = context
  const channelId = params.id

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id)
    if (!userRole?.farm_id || !['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const {
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

    const supabase = await createServerSupabaseClient()
    const { data: channel, error } = await supabase
      .from('distribution_channels')
      .update({
        name: name?.trim(),
        type,
        contact: contact?.trim(),
        email: email?.trim() || null,
        contact_person: contactPerson?.trim() || null,
        price_per_liter: pricePerLiter ? parseFloat(pricePerLiter) : undefined,
        location: location?.trim() || null,
        payment_terms: paymentTerms,
        notes: notes?.trim() || null,
        is_active: isActive
      })
      .eq('id', channelId)
      .eq('farm_id', userRole.farm_id)
      .select()
      .single()

    if (error) throw error
    if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 })

    return NextResponse.json(channel)
  } catch (error) {
    console.error('Error updating distribution channel:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH( request: NextRequest, { params }: { params: Promise<{ id: string }> } ) {

  try {
    const { id } = await params;
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id)
    if (!userRole?.farm_id || !['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const supabase = await createServerSupabaseClient()
    const { data: channel, error } = await supabase
      .from('distribution_channels')
      .update(body)
      .eq('id', id)
      .eq('farm_id', userRole.farm_id)
      .select()
      .single()

    if (error) throw error
    if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 })

    return NextResponse.json(channel)
  } catch (error) {
    console.error('Error updating distribution channel:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: any) {
  const { params } = context
  const channelId = params.id

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id)
    if (!userRole?.farm_id || !['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const supabase = await createServerSupabaseClient()

    // Check if channel has distribution records
    const { data: records, error: recordsError } = await supabase
      .from('distribution_records')
      .select('id')
      .eq('channel_id', channelId)
      .limit(1)

    if (recordsError) throw recordsError

    if (records && records.length > 0) {
      // Don't delete channels with records, just deactivate
      const { data: channel, error } = await supabase
        .from('distribution_channels')
        .update({ is_active: false })
        .eq('id', channelId)
        .eq('farm_id', userRole.farm_id)
        .select()
        .single()

      if (error) throw error

      return NextResponse.json({
        message: 'Channel deactivated (has distribution records)',
        channel
      })
    }

    // Delete channel if no records exist
    const { error } = await supabase
      .from('distribution_channels')
      .delete()
      .eq('id', channelId)
      .eq('farm_id', userRole.farm_id)

    if (error) throw error

    return NextResponse.json({ message: 'Channel deleted successfully' })
  } catch (error) {
    console.error('Error deleting distribution channel:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
