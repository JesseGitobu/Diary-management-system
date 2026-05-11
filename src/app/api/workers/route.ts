// src/app/api/workers/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getWorkers } from '@/lib/database/workers'

/**
 * GET /api/workers
 * Get list of workers for the current farm
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      console.log('❌ No authenticated user')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id)
    
    if (!userRole?.farm_id) {
      console.log('❌ User has no farm associated')
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }

    console.log('🔍 [API] Fetching workers for farm:', userRole.farm_id)
    
    const workers = await getWorkers(userRole.farm_id)
    
    console.log('✅ [API] Workers retrieved:', { count: workers.length })
    return NextResponse.json(workers)
  } catch (error) {
    console.error('❌ [API] Error fetching workers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
