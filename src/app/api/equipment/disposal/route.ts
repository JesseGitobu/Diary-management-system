import { getCurrentUser, createServerSupabaseClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { NextRequest, NextResponse } from 'next/server'

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

    const body = await request.json()

    const {
      equipmentId,
      method,
      saleValue,
      disposalDate,
      buyer,
      reason,
    } = body

    // Validation
    if (!equipmentId || !equipmentId.trim()) {
      return NextResponse.json(
        { error: 'Equipment ID is required' },
        { status: 400 }
      )
    }

    if (!method || !method.trim()) {
      return NextResponse.json(
        { error: 'Disposal method is required' },
        { status: 400 }
      )
    }

    if (!disposalDate) {
      return NextResponse.json(
        { error: 'Disposal date is required' },
        { status: 400 }
      )
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: 'Reason for disposal is required' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // Map disposal method values to enum format (lowercase with underscores)
    const methodMap: Record<string, string> = {
      'Sold': 'sold',
      'Scrapped': 'scrapped',
      'Donated': 'donated',
      'Traded-In': 'traded_in',
      'Lost / Stolen': 'lost_stolen',
      'sold': 'sold',
      'scrapped': 'scrapped',
      'donated': 'donated',
      'traded_in': 'traded_in',
      'lost_stolen': 'lost_stolen',
    }

    const disposalMethodEnum = methodMap[method] || method.toLowerCase().replace(/-/g, '_').replace(/\s+/g, '_')

    // Create disposal record in asset_disposals table
    // Convert disposal method to lowercase for enum compatibility
    const { data: disposal, error: disposalError } = await supabase
      .from('asset_disposals')
      .insert([
        {
          farm_id: userRole.farm_id,
          equipment_id: equipmentId,
          disposal_method: disposalMethodEnum,
          sale_value: saleValue ? parseFloat(saleValue) : 0,
          disposal_date: disposalDate,
          buyer_recipient: buyer || null,
          reason: reason || null,
          confirmed_by: user.id,
        },
      ])
      .select()
      .single()

    if (disposalError) {
      console.error('❌ [DB] Error creating disposal record:', disposalError)
      console.error('Error code:', disposalError.code)
      console.error('Error details:', disposalError.details)
      
      if (disposalError.code === '23503') {
        return NextResponse.json(
          { error: 'Invalid equipment ID or farm ID. Please verify the IDs are correct.' },
          { status: 400 }
        )
      }

      if (disposalError.code === '23505') {
        return NextResponse.json(
          { error: 'This equipment has already been disposed of. Each equipment can only have one disposal record.' },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: disposalError.message || 'Failed to record disposal' },
        { status: 500 }
      )
    }

    // Update equipment status to 'disposed'
    const { error: updateError } = await supabase
      .from('equipment')
      .update({
        status: 'retired',
        updated_at: new Date().toISOString(),
      })
      .eq('id', equipmentId)
      .eq('farm_id', userRole.farm_id)

    if (updateError) {
      console.error('❌ [DB] Error updating equipment status:', updateError)
      // Don't fail here, as the disposal record was created successfully
    }

    console.log('✅ [API] Equipment disposal recorded:', disposal?.id)

    return NextResponse.json({
      success: true,
      data: disposal,
      message: 'Equipment disposal recorded successfully',
    })
  } catch (error) {
    console.error('❌ [API] Unexpected error recording disposal:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
