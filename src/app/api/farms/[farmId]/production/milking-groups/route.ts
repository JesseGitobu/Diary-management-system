import { createServerSupabaseClient, getUserIdFromSession } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ farmId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { farmId } = await params

    // Get user ID with fallback
    let userId: string | null = null
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) throw error || new Error('User is null')
      userId = user.id
      console.log(`✅ [milking-groups GET] Got user via getUser(): ${userId}`)
    } catch (authErr) {
      console.log(`⚠️ [milking-groups GET] getUser() failed, attempting session fallback...`)
      try {
        userId = await getUserIdFromSession()
        if (userId) {
          console.log(`✅ [milking-groups GET] User authenticated via session-cookie: ${userId}`)
        }
      } catch (sessionErr) {
        console.error(`❌ [milking-groups GET] Both auth methods failed:`, authErr, sessionErr)
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized access to farm' },
        { status: 401 }
      )
    }

    // Verify user has access to this farm by checking user_roles
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('id')
      .eq('farm_id', farmId)
      .eq('user_id', userId)
      .maybeSingle()

    if (roleError || !userRole) {
      console.warn(`⚠️ [milking-groups GET] No user role found for farm ${farmId}:`, roleError)
      return NextResponse.json(
        { error: 'Unauthorized access to farm' },
        { status: 403 }
      )
    }

    // Fetch all milking groups for this farm from farm_milking_groups table
    const { data: milkingGroups, error: fetchError } = await supabase
      .from('farm_milking_groups')
      .select('id, category_id, category_name, animal_count, milking_schedules, selected_schedule_id')
      .eq('farm_id', farmId)
      .order('created_at', { ascending: true })

    if (fetchError) {
      throw fetchError
    }

    // Format response to match expected structure
    const formattedGroups = (milkingGroups || []).map((group: any) => ({
      id: group.id,
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

    // Get user ID with fallback
    let userId: string | null = null
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) throw error || new Error('User is null')
      userId = user.id
      console.log(`✅ [milking-groups POST] Got user via getUser(): ${userId}`)
    } catch (authErr) {
      console.log(`⚠️ [milking-groups POST] getUser() failed, attempting session fallback...`)
      try {
        userId = await getUserIdFromSession()
        if (userId) {
          console.log(`✅ [milking-groups POST] User authenticated via session-cookie: ${userId}`)
        }
      } catch (sessionErr) {
        console.error(`❌ [milking-groups POST] Both auth methods failed:`, authErr, sessionErr)
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized access to farm' },
        { status: 401 }
      )
    }

    // Verify user has access to this farm by checking user_roles
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('id, role_type')
      .eq('farm_id', farmId)
      .eq('user_id', userId)
      .maybeSingle()

    if (roleError || !userRole) {
      console.warn(`⚠️ [milking-groups POST] No user role found for farm ${farmId}:`, roleError)
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
