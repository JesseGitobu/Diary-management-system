// api/farms/[farmId]/financial-settings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ farmId: string }> }
) {
  try {
    const params = await props.params;
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions - only farm owners and managers can modify financial settings
    const { data: member, error: memberError } = await supabase
      .from('farm_members')
      .select('role')
      .eq('farm_id', params.farmId)
      .eq('user_id', user.id)
      .single()

    if (memberError || !member || !['farm_owner', 'farm_manager'].includes(member.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { buyers, ...financialSettings } = await request.json()

    // Update financial settings
    const { error: settingsError } = await supabase
      .from('financial_settings')
      .upsert({
        farm_id: params.farmId,
        ...financialSettings,
        updated_at: new Date().toISOString()
      })

    if (settingsError) {
      console.error('Error updating financial settings:', settingsError)
      return NextResponse.json({ error: 'Failed to update financial settings' }, { status: 500 })
    }

    // Update buyers if provided
    if (buyers && Array.isArray(buyers)) {
      // First, get existing buyers
      const { data: existingBuyers } = await supabase
        .from('milk_buyers')
        .select('id')
        .eq('farm_id', params.farmId)

      const existingBuyerIds = existingBuyers?.map(b => b.id) || []
      const newBuyerIds = buyers.map(b => b.id)

      // Delete buyers that are no longer in the list
      const buyersToDelete = existingBuyerIds.filter(id => !newBuyerIds.includes(id))
      if (buyersToDelete.length > 0) {
        await supabase
          .from('milk_buyers')
          .delete()
          .eq('farm_id', params.farmId)
          .in('id', buyersToDelete)
      }

      // Upsert current buyers
      for (const buyer of buyers) {
        const { error: buyerError } = await supabase
          .from('milk_buyers')
          .upsert({
            ...buyer,
            farm_id: params.farmId,
            updated_at: new Date().toISOString()
          })

        if (buyerError) {
          console.error('Error updating buyer:', buyerError)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Financial settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}