// app/api/farms/[farmId]/animals/[id]/scheduled-feedings/[scheduledId]/route.ts
// New DELETE endpoint for scheduled feedings

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { deleteScheduledFeeding } from '@/lib/database/scheduledFeedings'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ farmId: string; id: string; scheduledId: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { farmId, scheduledId } = await params
    const userRole = await getUserRole(user.id) as any
    
    if (!userRole?.farm_id || userRole.farm_id !== farmId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check permissions - only farm_owner and farm_manager can delete
    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions to delete scheduled feedings' }, { status: 403 })
    }

    const { reason } = await request.json().catch(() => ({ reason: undefined }))

    const result = await deleteScheduledFeeding(
      scheduledId,
      farmId,
      user.id,
      reason
    )

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Scheduled feeding deleted successfully'
    })
    
  } catch (error) {
    console.error('Delete scheduled feeding API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}