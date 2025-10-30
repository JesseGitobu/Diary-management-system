// app/api/animals/[id]/weight-requirement/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }  // ← Changed to Promise
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ✅ Await params before accessing properties
    const { id } = await params

    // 🔍 Log to debug
    console.log('🔍 [Weight Check] Animal ID:', id)

    const { searchParams } = new URL(request.url)
    const farmId = searchParams.get('farmId')

    // ✅ Validate parameters before querying
    if (!id || id === 'undefined') {
      console.error('❌ [Weight Check] Invalid animal ID:', id)
      return NextResponse.json({ 
        error: 'Invalid animal ID',
        requires_update: false 
      }, { status: 400 })
    }

    if (!farmId) {
      console.error('❌ [Weight Check] Missing farm ID')
      return NextResponse.json({ 
        error: 'Farm ID required',
        requires_update: false 
      }, { status: 400 })
    }

    // ✅ Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      console.error('❌ [Weight Check] Invalid UUID format:', id)
      return NextResponse.json({ 
        error: 'Invalid UUID format',
        requires_update: false 
      }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    
    console.log('🔍 [Weight Check] Querying for:', {
      animal_id: id,
      farm_id: farmId
    })

    const { data, error } = await supabase
      .from('animals_requiring_weight_update')
      .select('*')
      .eq('animal_id', id)  // ← Now using awaited id
      .eq('farm_id', farmId)
      .eq('is_resolved', false)
      .maybeSingle()

    if (error) {
      console.error('❌ [Weight Check] Database error:', error)
      return NextResponse.json({ 
        error: error.message,
        requires_update: false 
      }, { status: 500 })
    }

    console.log('✅ [Weight Check] Query result:', data)

    return NextResponse.json({
      requires_update: !!data,
      due_date: data?.due_date || null,
      reason: data?.reason || null,
      priority: data?.priority || 'normal'
    })
  } catch (error) {
    console.error('❌ [Weight Check] Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      requires_update: false 
    }, { status: 500 })
  }
}