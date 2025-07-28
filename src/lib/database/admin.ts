import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server'

// System Overview Statistics
export async function getSystemOverview() {
  const adminSupabase = createAdminClient()
  
  try {
    // Get total counts with individual error handling
    const farmsResult = await adminSupabase.from('farms').select('*', { count: 'exact', head: true })
    const usersResult = await adminSupabase.from('user_roles').select('*', { count: 'exact', head: true })
    const animalsResult = await adminSupabase.from('animals').select('*', { count: 'exact', head: true })
    
    // These tables might not exist yet, so handle errors gracefully
    let activeSubscriptionsResult = { count: 0 }
    let openTicketsResult = { count: 0 }
    
    try {
      const { count: activeSubscriptionsCount } = await adminSupabase.from('billing_subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active')
      activeSubscriptionsResult = { count: activeSubscriptionsCount ?? 0 }
    } catch (error) {
      console.warn('billing_subscriptions table not found:', error)
    }
    
    try {
      const openTicketsResponse = await adminSupabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open')
      openTicketsResult = { count: openTicketsResponse.count ?? 0 }
    } catch (error) {
      console.warn('support_tickets table not found:', error)
    }

    // Get recent metrics with error handling
    let recentSignups = []
    try {
      const signupsResult = await adminSupabase
        .from('user_roles')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      
      recentSignups = signupsResult.data || []
    } catch (error) {
      console.warn('Error fetching recent signups:', error)
    }

    // Calculate growth metrics
    const last30DaysSignups = recentSignups.length || 0
    
    // Get revenue data with error handling
    type BillingSubscription = {
      monthly_price?: number | string
      status?: string
      plan_type?: string
    }
    let subscriptions: BillingSubscription[] = []
    try {
      const subscriptionsResult = await adminSupabase
        .from('billing_subscriptions')
        .select('monthly_price, status')
        .eq('status', 'active')
      
      subscriptions = subscriptionsResult.data || []
    } catch (error) {
      console.warn('Error fetching subscriptions:', error)
    }
    
    const monthlyRevenue = subscriptions.reduce((sum, sub) => sum + (Number(sub.monthly_price) || 0), 0) || 0

    return {
      totalFarms: farmsResult.count || 0,
      totalUsers: usersResult.count || 0,
      totalAnimals: animalsResult.count || 0,
      activeSubscriptions: activeSubscriptionsResult.count || 0,
      openTickets: openTicketsResult.count || 0,
      last30DaysSignups,
      monthlyRevenue,
      averageAnimalsPerFarm: (farmsResult.count || 0) > 0 ? Math.round((animalsResult.count || 0) / (farmsResult.count || 1)) : 0
    }
  } catch (error) {
    console.error('Error getting system overview:', error)
    
    // Return default values if database queries fail
    return {
      totalFarms: 0,
      totalUsers: 0,
      totalAnimals: 0,
      activeSubscriptions: 0,
      openTickets: 0,
      last30DaysSignups: 0,
      monthlyRevenue: 0,
      averageAnimalsPerFarm: 0
    }
  }
}

// Farm Management
export async function getAllFarms(limit = 50, offset = 0) {
  const adminSupabase = createAdminClient()
  
  try {
    const { data, error, count } = await adminSupabase
      .from('farms')
      .select(`
        *,
        farm_profiles!inner (
          herd_size,
          onboarding_completed
        ),
        user_roles!inner (
          user_id,
          role_type
        )
      `, { count: 'exact' })
      .eq('user_roles.role_type', 'farm_owner')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error getting all farms:', error)
      return { farms: [], count: 0 }
    }

    return { farms: data || [], count: count || 0 }
  } catch (error) {
    console.error('Error in getAllFarms:', error)
    return { farms: [], count: 0 }
  }
}

export async function getFarmDetails(farmId: string) {
  const adminSupabase = createAdminClient()
  
  try {
    const { data, error } = await adminSupabase
      .from('farms')
      .select(`
        *,
        farm_profiles (
          *
        ),
        user_roles (
          id,
          role_type,
          status,
          created_at
        ),
        animals (
          id,
          name,
          tag_number,
          status
        )
      `)
      .eq('id', farmId)
      .single()

    if (error) {
      console.error('Error getting farm details:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in getFarmDetails:', error)
    return null
  }
}

// User Management
export async function getAllUsers(limit = 50, offset = 0) {
  const adminSupabase = createAdminClient()
  
  try {
    const { data, error, count } = await adminSupabase
      .from('user_roles')
      .select(`
        *,
        farms (
          name,
          location
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error getting all users:', error)
      return { users: [], count: 0 }
    }

    return { users: data || [], count: count || 0 }
  } catch (error) {
    console.error('Error in getAllUsers:', error)
    return { users: [], count: 0 }
  }
}

export async function suspendUser(userId: string, reason: string) {
  const adminSupabase = createAdminClient()
  
  try {
    // Update user roles to inactive
    const { error: roleError } = await adminSupabase
      .from('user_roles')
      .update({ status: 'suspended' })
      .eq('user_id', userId)

    if (roleError) throw roleError

    // Log the action (only if audit_logs table exists)
    try {
      await adminSupabase.from('audit_logs').insert({
        action: 'suspend_user',
        resource_type: 'user',
        resource_id: userId,
        new_values: { reason, suspended_at: new Date().toISOString() }
      })
    } catch (auditError) {
      console.warn('Could not log admin action:', auditError)
    }

    return { success: true }
  } catch (error) {
    console.error('Error suspending user:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// Support Ticket Management
export async function getAllTickets(status?: string, priority?: string) {
  const adminSupabase = createAdminClient()
  
  try {
    let query = adminSupabase
      .from('support_tickets')
      .select(`
        *,
        farms (
          name
        )
      `)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)
    if (priority) query = query.eq('priority', priority)

    const { data, error } = await query

    if (error) {
      console.error('Error getting support tickets:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getAllTickets:', error)
    return []
  }
}

// Billing Management
export async function getBillingOverview() {
  const adminSupabase = createAdminClient()
  
  try {
    // Try to get subscriptions data
    interface BillingSubscription {
      plan_type?: string
      status?: string
      monthly_price?: number | string
    }
    let subscriptions: BillingSubscription[] = []
    try {
      const subscriptionsResult = await adminSupabase
        .from('billing_subscriptions')
        .select('plan_type, status, monthly_price')
      
      if (subscriptionsResult.data) {
        subscriptions = subscriptionsResult.data
      }
    } catch (error) {
      console.warn('billing_subscriptions table not found, using defaults:', error)
    }

    const overview = {
      totalSubscriptions: subscriptions.length || 0,
      active: subscriptions.filter(s => s.status === 'active').length || 0,
      cancelled: subscriptions.filter(s => s.status === 'cancelled').length || 0,
      pastDue: subscriptions.filter(s => s.status === 'past_due').length || 0,
      totalMRR: subscriptions.filter(s => s.status === 'active')
        .reduce((sum, s) => sum + (Number(s.monthly_price) || 0), 0) || 0,
      planBreakdown: {
        starter: subscriptions.filter(s => s.plan_type === 'starter' && s.status === 'active').length || 0,
        professional: subscriptions.filter(s => s.plan_type === 'professional' && s.status === 'active').length || 0,
        enterprise: subscriptions.filter(s => s.plan_type === 'enterprise' && s.status === 'active').length || 0
      }
    }

    return overview
  } catch (error) {
    console.error('Error getting billing overview:', error)
    
    // Return default billing data
    return {
      totalSubscriptions: 0,
      active: 0,
      cancelled: 0,
      pastDue: 0,
      totalMRR: 0,
      planBreakdown: {
        starter: 0,
        professional: 0,
        enterprise: 0
      }
    }
  }
}

// System Monitoring (simplified for now)
export async function recordSystemMetric(metricType: string, metricName: string, value: number, unit?: string, metadata?: any) {
  const adminSupabase = createAdminClient()
  
  try {
    const result = await adminSupabase
      .from('system_metrics')
      .insert({
        metric_type: metricType,
        metric_name: metricName,
        metric_value: value,
        metric_unit: unit,
        metadata
      })

    if (result.error) {
      console.error('Error recording system metric:', result.error)
    }
  } catch (error) {
    console.error('Error in recordSystemMetric:', error)
  }
}

export async function getSystemMetrics(metricType?: string, hours = 24) {
  const adminSupabase = createAdminClient()
  
  try {
    const sinceTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
    
    let query = adminSupabase
      .from('system_metrics')
      .select('*')
      .gte('recorded_at', sinceTime)
      .order('recorded_at', { ascending: false })

    if (metricType) {
      query = query.eq('metric_type', metricType)
    }

    const result = await query

    if (result.error) {
      console.error('Error getting system metrics:', result.error)
      return []
    }

    return result.data || []
  } catch (error) {
    console.error('Error in getSystemMetrics:', error)
    return []
  }
}

// Audit Logging
export async function logAdminAction(actionData: {
  action: string
  resource_type: string
  resource_id: string
  old_values?: any
  new_values?: any
}) {
  const adminSupabase = createAdminClient()
  
  try {
    // Note: This won't work until we have a way to get current admin user ID in server context
    const { error } = await adminSupabase
      .from('audit_logs')
      .insert({
        // user_id: will need to be passed in or obtained differently
        ...actionData
      })

    if (error) {
      console.error('Error logging admin action:', error)
    }
  } catch (error) {
    console.error('Error in logAdminAction:', error)
  }
}