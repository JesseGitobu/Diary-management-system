// src/app/api/distribution/calf-feeding/route.ts
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getCalfFeedingRequirements, getCalfFeedingForecast } from '@/lib/database/calf-feeding'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userRole = await getUserRole(user.id)
    if (!userRole?.farm_id) {
      return NextResponse.json(
        { error: 'Farm not found' },
        { status: 404 }
      )
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')
    const forecast = searchParams.get('forecast') === 'true'
    const days = Math.min(parseInt(searchParams.get('days') || '7'), 30) // Max 30 days

    if (forecast) {
      const forecasts = await getCalfFeedingForecast(userRole.farm_id, days)
      return NextResponse.json(forecasts)
    } else {
      const requirements = await getCalfFeedingRequirements(userRole.farm_id, date ?? undefined)
      return NextResponse.json(requirements)
    }
  } catch (error) {
    console.error('Error fetching calf feeding requirements:', error)
    return NextResponse.json(
      { error: 'Failed to fetch calf feeding requirements' },
      { status: 500 }
    )
  }
}
