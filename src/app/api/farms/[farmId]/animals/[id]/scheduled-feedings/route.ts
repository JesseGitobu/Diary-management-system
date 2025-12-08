// app/api/farms/[farmId]/animals/[id]/scheduled-feedings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getAnimalScheduledFeedings, updateOverdueScheduledFeedings } from '@/lib/database/scheduledFeedings'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ farmId: string; id: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { farmId, id: animalId } = await params
    const userRole = await getUserRole(user.id) as any
    
    if (!userRole?.farm_id || userRole.farm_id !== farmId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    // Update overdue feedings first
    await updateOverdueScheduledFeedings(farmId)

    // Get scheduled feedings
    const scheduledFeedings = await getAnimalScheduledFeedings(
      farmId,
      animalId,
      status || undefined
    )

    return NextResponse.json({ 
      success: true,
      scheduledFeedings,
      total: scheduledFeedings.length 
    })
    
  } catch (error) {
    console.error('Scheduled feedings API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}