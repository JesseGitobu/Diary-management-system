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

    // Collect all animal IDs currently in a pen
    const { data: pens, error: pensError } = await (supabase as any)
      .from('housing_pens')
      .select('id, assigned_animals')
      .eq('farm_id', farmId)

    if (pensError) throw pensError

    const penByAnimal: Record<string, string> = {}
    for (const pen of pens ?? []) {
      for (const animalId of pen.assigned_animals ?? []) {
        penByAnimal[animalId] = pen.id
      }
    }

    const assignedIds = Object.keys(penByAnimal)
    if (assignedIds.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    const { data: animals, error: animalsError } = await (supabase as any)
      .from('animals')
      .select('id, tag_number, name, breed, gender, production_status, health_status, status')
      .eq('farm_id', farmId)
      .in('id', assignedIds)
      .order('tag_number')

    if (animalsError) throw animalsError

    const result = (animals ?? []).map((a: any) => ({
      ...a,
      current_pen: penByAnimal[a.id] ?? null,
    }))

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Assigned animals GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
