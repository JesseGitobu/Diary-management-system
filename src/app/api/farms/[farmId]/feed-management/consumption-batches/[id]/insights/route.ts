// app/api/farms/[farmId]/feed-management/consumption-batches/[id]/insights/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getBatchInsights } from '@/lib/database/feedManagementSettings'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id)
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }
    
    const { id: batchId } = await params
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(batchId)) {
      return NextResponse.json({ error: 'Invalid batch ID format' }, { status: 400 })
    }
    
    const result = await getBatchInsights(userRole.farm_id, batchId)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: true, 
      data: result.data 
    })
    
  } catch (error) {
    console.error('Batch insights GET API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}