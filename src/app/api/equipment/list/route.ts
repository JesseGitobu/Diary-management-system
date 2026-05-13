import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const farmId = searchParams.get('farm_id')
    const search = searchParams.get('search')

    if (!farmId) {
      return NextResponse.json(
        { error: 'farm_id is required' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    let query = supabase
      .from('equipment')
      .select('id, name, asset_id, status')
      .eq('farm_id', farmId)
      .order('name', { ascending: true })

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,asset_id.ilike.%${search}%`
      )
    }

    const { data, error } = await query

    if (error) {
      console.error('❌ [API] Error fetching equipment:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    })
  } catch (error) {
    console.error('❌ [API] Unexpected error fetching equipment:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
