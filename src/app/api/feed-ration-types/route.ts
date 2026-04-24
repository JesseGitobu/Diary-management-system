// src/app/api/feed-ration-types/route.ts
// Returns the system-wide predefined ration type catalog (shared across all farms).
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getFeedRationTypes } from '@/lib/database/feedRations'

export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const types = await getFeedRationTypes()
    return NextResponse.json({ success: true, data: types })
  } catch (error) {
    console.error('Feed ration types GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
