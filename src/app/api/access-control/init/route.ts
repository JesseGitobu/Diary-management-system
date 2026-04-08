// src/app/api/access-control/init/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { initializeDefaultPolicies } from '@/lib/database/access-control'

/**
 * POST /api/access-control/init
 * Initialize default access control policies for a farm
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { farmId } = body

    console.log('🔍 [API] Initializing default access control policies:', { farmId })

    if (!farmId) {
      return NextResponse.json({ error: 'Farm ID is required' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()

    // Verify user owns this farm
    const { data: user } = await supabase.auth.getUser()
    if (!user?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role_type')
      .eq('farm_id', farmId)
      .eq('user_id', user.user.id)
      .single()

    if (!userRole || (userRole as any)?.role_type !== 'farm_owner') {
      return NextResponse.json(
        { error: 'Only farm owners can initialize policies' },
        { status: 403 }
      )
    }

    const success = await initializeDefaultPolicies(farmId, user.user.id)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to initialize policies' },
        { status: 400 }
      )
    }

    console.log('✅ [API] Default policies initialized successfully')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ [API] Exception:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
