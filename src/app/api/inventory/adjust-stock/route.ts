// src/app/api/inventory/adjust-stock/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { updateInventoryStock } from '@/lib/database/inventory'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id) as any
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 403 })
    }
    
    // Check if user has permission to manage inventory
    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    const body = await request.json()
    const { itemId, type, quantity, notes } = body
    
    if (!itemId || !type || !quantity) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    const result = await updateInventoryStock(
      itemId,
      userRole.farm_id,
      {
        type,
        quantity,
        notes,
        performed_by: user.id
      }
    )
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update stock' },
        { status: 400 }
      )
    }
    
    return NextResponse.json({ 
      success: true,
      newStock: result.newStock 
    })
  } catch (error) {
    console.error('Error adjusting stock:', error)
    return NextResponse.json(
      { error: 'Failed to adjust stock' },
      { status: 500 }
    )
  }
}