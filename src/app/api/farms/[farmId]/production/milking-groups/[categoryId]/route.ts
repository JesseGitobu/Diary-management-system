import { createServerSupabaseClient, getUserIdFromSession } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ farmId: string; categoryId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { farmId, categoryId } = await params

    // Get user ID with fallback
    let userId: string | null = null
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) throw error || new Error('User is null')
      userId = user.id
      console.log(`✅ [milking-groups DELETE] Got user via getUser(): ${userId}`)
    } catch (authErr) {
      console.log(`⚠️ [milking-groups DELETE] getUser() failed, attempting session fallback...`)
      try {
        userId = await getUserIdFromSession()
        if (userId) {
          console.log(`✅ [milking-groups DELETE] User authenticated via session-cookie: ${userId}`)
        }
      } catch (sessionErr) {
        console.error(`❌ [milking-groups DELETE] Both auth methods failed:`, authErr, sessionErr)
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
      console.warn(`⚠️ [milking-groups DELETE] No user role found for farm ${farmId}:`, roleError)
      return NextResponse.json(
        { error: 'Unauthorized access to farm' },
        { status: 403 }
      )
    }

    const typedUserRole = userRole as any

    // Verify farm manager role
    if (!typedUserRole || !['farm_owner', 'farm_manager'].includes(typedUserRole.role_type)) {
      return NextResponse.json(
        { error: 'Only farm managers can delete milking groups' },
        { status: 403 }
      )
    }

    // Validate categoryId provided
    if (!categoryId) {
      return NextResponse.json(
        { error: 'categoryId is required' },
        { status: 400 }
      )
    }

    // Check if group exists
    const { data: existingGroup, error: checkError } = await supabase
      .from('farm_milking_groups')
      .select('id')
      .eq('farm_id', farmId)
      .eq('category_id', categoryId)
      .single()

    const typedCheckError = checkError as any

    if (!existingGroup || typedCheckError?.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Milking group not found' },
        { status: 404 }
      )
    }

    if (typedCheckError) throw typedCheckError

    // Delete the milking group record
    const { error: deleteError } = await supabase
      .from('farm_milking_groups')
      .delete()
      .eq('farm_id', farmId)
      .eq('category_id', categoryId)

    if (deleteError) throw deleteError

    return NextResponse.json({
      success: true,
      message: 'Milking group removed successfully'
    })
  } catch (error) {
    console.error('Error removing milking group:', error)
    return NextResponse.json(
      { error: 'Failed to remove milking group' },
      { status: 500 }
    )
  }
}
