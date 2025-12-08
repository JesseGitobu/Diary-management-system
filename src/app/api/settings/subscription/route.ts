// app/api/settings/subscription/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { 
  getSubscriptionSettings, 
  getPaymentHistory, 
  updateSubscription 
} from '@/lib/database/subscription-settings'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const searchParams = request.nextUrl.searchParams
    const farmId = searchParams.get('farmId')
    const includePayments = searchParams.get('includePayments') === 'true'

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let targetFarmId = farmId
    if (!targetFarmId) {
      const { data: userRoleResult } = await supabase
        .from('user_roles')
        .select('farm_id')
        .eq('user_id', user.id)
        .single()
      
      // Cast to any to fix "Property 'farm_id' does not exist on type 'never'"
      const userRole = userRoleResult as any

      if (!userRole) {
        return NextResponse.json({ error: 'No farm found' }, { status: 400 })
      }
      targetFarmId = userRole.farm_id
    }

    // Verify user has access to this farm
    if (!targetFarmId) {
      return NextResponse.json({ error: 'Farm ID is required' }, { status: 400 })
    }

    // Cast supabase to any to prevent type errors on query with variable farmId
    const { data: userRoleResult } = await (supabase as any)
      .from('user_roles')
      .select('role_type')
      .eq('user_id', user.id)
      .eq('farm_id', targetFarmId)
      .single()

    // Cast to any here as well
    const userRole = userRoleResult as any

    if (!userRole) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const subscription = await getSubscriptionSettings(targetFarmId)
    
    let paymentHistory = null
    if (includePayments && userRole.role_type === 'farm_owner') {
      paymentHistory = await getPaymentHistory(targetFarmId)
    }

    return NextResponse.json({ 
      success: true, 
      subscription, 
      paymentHistory 
    })
  } catch (error: any) {
    console.error('Error fetching subscription:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { farmId, updates } = body

    // Verify user is farm owner
    const { data: userRoleResult } = await supabase
      .from('user_roles')
      .select('role_type')
      .eq('user_id', user.id)
      .eq('farm_id', farmId)
      .single()

    // Cast to any to fix type errors
    const userRole = userRoleResult as any

    if (!userRole || userRole.role_type !== 'farm_owner') {
      return NextResponse.json(
        { error: 'Only farm owners can modify subscription settings' }, 
        { status: 403 }
      )
    }

    await updateSubscription(farmId, updates)
    const updatedSubscription = await getSubscriptionSettings(farmId)

    return NextResponse.json({ 
      success: true, 
      subscription: updatedSubscription 
    })
  } catch (error: any) {
    console.error('Error updating subscription:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST endpoint for initiating plan changes or payments
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { farmId, action, data } = body

    // Verify user is farm owner
    const { data: userRoleResult } = await supabase
      .from('user_roles')
      .select('role_type')
      .eq('user_id', user.id)
      .eq('farm_id', farmId)
      .single()

    // Cast to any to fix type errors
    const userRole = userRoleResult as any

    if (!userRole || userRole.role_type !== 'farm_owner') {
      return NextResponse.json(
        { error: 'Only farm owners can perform this action' }, 
        { status: 403 }
      )
    }

    switch (action) {
      case 'request_upgrade':
        // Handle plan upgrade request
        await updateSubscription(farmId, {
          pendingPlanChange: data.newPlan,
          planChangeEffectiveDate: data.effectiveDate
        })
        return NextResponse.json({ 
          success: true, 
          message: 'Upgrade request submitted' 
        })

      case 'cancel_subscription':
        // Handle cancellation
        await updateSubscription(farmId, {
          planStatus: 'cancelled',
          cancelledAt: new Date().toISOString(),
          autoRenew: false
        })
        return NextResponse.json({ 
          success: true, 
          message: 'Subscription cancelled' 
        })

      case 'reactivate':
        // Handle reactivation
        await updateSubscription(farmId, {
          planStatus: 'active',
          cancelledAt: undefined,
          autoRenew: true
        })
        return NextResponse.json({ 
          success: true, 
          message: 'Subscription reactivated' 
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Error processing subscription action:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}