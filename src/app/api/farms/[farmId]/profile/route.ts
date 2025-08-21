// api/farms/[farmId]/profile/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function PUT(
  request: NextRequest,
  { params }: { params: { farmId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to edit farm profile
    const { data: member, error: memberError } = await supabase
      .from('farm_members')
      .select('role')
      .eq('farm_id', params.farmId)
      .eq('user_id', user.id)
      .single()

    if (memberError || !member || !['farm_owner', 'farm_manager'].includes(member.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const profileData = await request.json()

    // Update farm profile
    const { error: updateError } = await supabase
      .from('farms')
      .update({
        name: profileData.name,
        owner_name: profileData.owner_name,
        owner_phone: profileData.owner_phone,
        owner_email: profileData.owner_email,
        farm_size_acres: profileData.farm_size_acres,
        total_cows: profileData.total_cows,
        farm_type: profileData.farm_type,
        county: profileData.county,
        sub_county: profileData.sub_county,
        village: profileData.village,
        preferred_currency: profileData.preferred_currency,
        preferred_volume_unit: profileData.preferred_volume_unit,
        description: profileData.description,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.farmId)

    if (updateError) {
      console.error('Error updating farm profile:', updateError)
      return NextResponse.json({ error: 'Failed to update farm profile' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}