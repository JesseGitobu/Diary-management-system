import { NextResponse } from 'next/server'
import { getCurrentUser, createServerSupabaseClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id) return NextResponse.json({ error: 'No farm context' }, { status: 400 })

    const farmId = userRole.farm_id
    const supabase = await createServerSupabaseClient()

    // Collect all animal IDs already in a pen
    const { data: pens, error: pensError } = await (supabase as any)
      .from('housing_pens')
      .select('assigned_animals')
      .eq('farm_id', farmId)

    if (pensError) throw pensError

    const assignedIds: string[] = (pens ?? [])
      .flatMap((p: any) => p.assigned_animals ?? [])

    // Fetch active animals not assigned to any pen, with their category
    let query = (supabase as any)
      .from('animals')
      .select(`
        id,
        tag_number,
        name,
        breed,
        gender,
        production_status,
        health_status,
        status,
        animal_category_assignments(category_id)
      `)
      .eq('farm_id', farmId)
      .eq('status', 'active')
      .order('tag_number')

    if (assignedIds.length > 0) {
      query = query.not('id', 'in', `(${assignedIds.join(',')})`)
    }

    const { data: animals, error: animalsError } = await query
    if (animalsError) throw animalsError

    // Flatten category_id from the nested assignment row (one-to-one, take first)
    const result = (animals ?? []).map((a: any) => ({
      id: a.id,
      tag_number: a.tag_number,
      name: a.name,
      breed: a.breed,
      gender: a.gender,
      production_status: a.production_status,
      health_status: a.health_status,
      status: a.status,
      category_id: a.animal_category_assignments?.[0]?.category_id ?? null,
    }))

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Unassigned animals GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
