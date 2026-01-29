// src/app/api/audit-logs/animal/[animalId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getAnimalAuditHistory, getAnimalTimeline } from '@/lib/database/audit-logs'

interface RouteParams {
  params: Promise<{
    animalId: string
  }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { animalId } = await params
    const searchParams = request.nextUrl.searchParams
    const farmId = searchParams.get('farmId')
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100
    const format = searchParams.get('format') || 'json' // 'json', 'timeline'

    if (!farmId) {
      return NextResponse.json(
        { error: 'farmId is required' },
        { status: 400 }
      )
    }

    // Verify user has access to this farm
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: farmAccess } = await supabase
      .from('user_roles')
      .select('id')
      .eq('farm_id', farmId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!farmAccess) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Verify animal belongs to farm
    const { data: animal } = await supabase
      .from('animals')
      .select('id, tag_number, name')
      .eq('id', animalId)
      .eq('farm_id', farmId)
      .single()

    if (!animal) {
      return NextResponse.json(
        { error: 'Animal not found' },
        { status: 404 }
      )
    }

    if (format === 'timeline') {
      const timeline = await getAnimalTimeline(farmId, animalId)
      return NextResponse.json({ data: timeline, animal })
    }

    const logs = await getAnimalAuditHistory(farmId, animalId, limit)
    return NextResponse.json({ data: logs, animal })
  } catch (error) {
    console.error('Error fetching animal audit history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch audit history' },
      { status: 500 }
    )
  }
}
