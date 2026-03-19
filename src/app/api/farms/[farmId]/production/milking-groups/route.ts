import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ farmId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { farmId } = await params

    // Verify user has access to this farm by checking user_roles
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('id')
      .eq('farm_id', farmId)
      .not('farm_id', 'is', null)
      .single()

    if (roleError || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized access to farm' },
        { status: 403 }
      )
    }

    // Fetch all milking groups for this farm from farm_milking_groups table
    const { data: milkingGroups, error: fetchError } = await supabase
      .from('farm_milking_groups')
      .select('category_id, category_name, animal_count, milking_schedules, selected_schedule_id')
      .eq('farm_id', farmId)
      .order('created_at', { ascending: true })

    if (fetchError) {
      throw fetchError
    }

    // Format response to match expected structure
    const formattedGroups = (milkingGroups || []).map((group: any) => ({
      category_id: group.category_id,
      category_name: group.category_name,
      animal_count: group.animal_count,
      milking_schedules: group.milking_schedules || [],
      selected_schedule_id: group.selected_schedule_id
    }))

    return NextResponse.json({
      success: true,
      data: formattedGroups
    })
  } catch (error) {
    console.error('Error fetching milking groups:', error)
    return NextResponse.json(
      { error: 'Failed to fetch milking groups' },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ farmId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { farmId } = await params
    const body = await req.json()

    // Validate input
    if (!body.category_id) {
      return NextResponse.json(
        { error: 'category_id is required' },
        { status: 400 }
      )
    }

    // Verify user has access to this farm by checking user_roles
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('id, role_type')
      .eq('farm_id', farmId)
      .not('farm_id', 'is', null)
      .single()

    if (roleError || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized access to farm' },
        { status: 403 }
      )
    }

    // Verify farm manager role
    if (!userRole || !['farm_owner', 'farm_manager'].includes((userRole as any).role_type)) {
      return NextResponse.json(
        { error: 'Only farm managers can create milking groups' },
        { status: 403 }
      )
    }

    // Check if group already exists for this category
    const { data: existingGroup, error: checkError } = await supabase
      .from('farm_milking_groups')
      .select('id')
      .eq('farm_id', farmId)
      .eq('category_id', body.category_id)
      .single()

    if (existingGroup) {
      return NextResponse.json(
        { error: 'Group already exists for this category' },
        { status: 400 }
      )
    }

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError
    }

    // Prepare new milking group record
    const newGroup = {
      farm_id: farmId,
      category_id: body.category_id,
      category_name: body.category_name || '',
      animal_count: body.animal_count || 0,
      milking_schedules: body.milking_schedules || [],
      selected_schedule_id: body.selected_schedule_id || null
    }

    // Insert directly into farm_milking_groups table
    const { data: insertedGroup, error: insertError } = await supabase
      .from('farm_milking_groups')
      .insert([newGroup] as any)
      .select('category_id, category_name, animal_count, milking_schedules, selected_schedule_id')
      .single()

    if (insertError) throw insertError

    return NextResponse.json({
      success: true,
      data: insertedGroup
    })
  } catch (error) {
    console.error('Error adding milking group:', error)
    return NextResponse.json(
      { error: 'Failed to add milking group' },
      { status: 500 }
    )
  }
}
