// src/app/api/farms/[farmId]/animals/route.ts
// Lightweight list endpoint used for lazy-loading animals into the feed dashboard.
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ farmId: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { farmId } = await params
    const supabase = await createServerSupabaseClient()

    // Verify farm ownership/access
    const { data: farm, error: farmError } = await supabase
      .from('farms')
      .select('id')
      .eq('id', farmId)
      .single()

    if (farmError || !farm) {
      return NextResponse.json(
        { error: 'Farm not found or access denied' },
        { status: 404 }
      )
    }

    // Fetch animals with their category assignments
    const [animalsResult, assignmentsResult] = await Promise.all([
      supabase
        .from('animals')
        .select('id, tag_number, name, gender, status, birth_date, production_status')
        .eq('farm_id', farmId)
        .eq('status', 'active')
        .order('tag_number'),
      (supabase as any)
        .from('animal_category_assignments')
        .select('animal_id, category_id')
        .eq('farm_id', farmId)
    ])

    if (animalsResult.error) {
      console.error('Database error fetching animals:', animalsResult.error)
      return NextResponse.json({ error: animalsResult.error.message }, { status: 500 })
    }

    // Build a map: animal_id -> category_ids[]
    const categoryMap: Record<string, string[]> = {}
    for (const row of (assignmentsResult.data ?? [])) {
      if (!categoryMap[row.animal_id]) categoryMap[row.animal_id] = []
      categoryMap[row.animal_id].push(row.category_id)
    }

    const animals = (animalsResult.data ?? []).map(a => ({
      ...a,
      category_ids: categoryMap[a.id] ?? []
    }))

    return NextResponse.json({ animals })
  } catch (error) {
    console.error('Error in animals API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
