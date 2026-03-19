// app/api/animals/[id]/weight-requirement/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    // ✅ If no user found, log and return graceful response instead of 401
    if (!user) {
      console.warn('⚠️ [Weight Check] No authenticated user found - returning default response')
      return NextResponse.json({
        requires_update: false,
        due_date: null,
        reason: 'Unable to verify authentication',
        priority: 'normal'
      }, { status: 200 })
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

    // Query the new animal_weight_status view
    const { data, error } = await supabase
      .from('animal_weight_status')
      .select(`
        id,
        tag_number,
        weight,
        last_weight_date,
        days_since_weight,
        requires_weight_update,
        next_due_date
      `)
      .eq('id', id)
      .eq('farm_id', farmId)
      .maybeSingle()

    if (error) {
      console.error('❌ [Weight Check] Database error:', error)
      return NextResponse.json({ 
        error: error.message,
        requires_update: false 
      }, { status: 500 })
    }

    console.log('✅ [Weight Check] Query result:', data)

    const typedData = data as any
    
    return NextResponse.json({
      requires_update: !!typedData?.requires_weight_update,
      due_date: typedData?.next_due_date || null,
      reason: typedData?.days_since_weight 
        ? `${typedData.days_since_weight} days since last weight`
        : (typedData?.weight === null ? 'No weight recorded' : null),
      priority: typedData?.days_since_weight && typedData.days_since_weight > 45 ? 'high' : 'normal'
    })
  } catch (error) {
    console.error('❌ [Weight Check] Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      requires_update: false 
    }, { status: 500 })
  }
}