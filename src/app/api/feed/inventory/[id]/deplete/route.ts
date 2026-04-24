import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    const { id } = await params
    const body = await request.json()
    const supabase = await createServerSupabaseClient()

    const { quantity_kg = 0, depleted_at, notes, feed_type_id } = body

    // The 'id' parameter should be the feed_type_id
    let feedTypeId = feed_type_id || id

    // Get the current inventory item to verify ownership
    const { data: currentInventory, error: fetchError } = await supabase
      .from('feed_inventory')
      .select('*')
      .eq('farm_id', userRole.farm_id)
      .eq('feed_type_id', feedTypeId)
      .single()

    if (fetchError || !currentInventory) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 })
    }

    // Update the inventory record to mark as depleted
    const { data: updatedInventory, error: updateError } = await supabase
      .from('feed_inventory')
      .update({
        quantity_in_stock: quantity_kg,
        updated_at: depleted_at || new Date().toISOString(),
      })
      .eq('farm_id', userRole.farm_id)
      .eq('feed_type_id', feedTypeId)
      .select()
      .single()

    if (updateError) {
      console.error('Error marking inventory as depleted:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: updatedInventory,
      message: 'Feed inventory marked as depleted successfully'
    })

  } catch (error) {
    console.error('Feed inventory deplete API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
