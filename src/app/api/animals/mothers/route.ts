// app/api/animals/mothers/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getAvailableMothers } from '@/lib/database/animals'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const farmId = searchParams.get('farmId')

    if (!farmId) {
      return NextResponse.json({ error: 'Farm ID is required' }, { status: 400 })
    }

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id) as any
    if (!userRole || userRole.farm_id !== farmId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const mothers = await getAvailableMothers(farmId)

    return NextResponse.json({
      success: true,
      mothers
    })

  } catch (error) {
    console.error('Error fetching available mothers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}