// src/lib/database/admin.ts
import {createAdminClient } from '@/lib/supabase/server'

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
    let recentSignups: any[] = []
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
    // Step 1: Get user_roles with farm relationships
    const { data: userRoles, error: rolesError, count } = await (adminSupabase
      .from('user_roles') as any)
      .select(`
        id,
        user_id,
        role_type,
        status,
        created_at,
        farms (
          id,
          name,
          location
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (rolesError) {
      console.error('Error getting user roles:', rolesError)
      return { users: [], count: 0 }
    }

    // Step 2: Get auth user data from the auth schema
    const userIds = (userRoles || []).map((ur: any) => ur.user_id)
    
    if (userIds.length === 0) {
      return { users: [], count: 0 }
    }

    // Step 3: Fetch auth users using admin API
    let authUsersData: any[] = []
    try {
      const { data: { users: listUsers }, error: authError } = await (adminSupabase.auth.admin.listUsers() as any)
      
      if (!authError && listUsers) {
        authUsersData = listUsers
      }
    } catch (error) {
      console.error('Error fetching auth users:', error)
      // Continue without auth data - will use fallback
    }

    // Step 4: Create a map of user_id -> auth user data
    const authUserMap = new Map<string, any>()
    authUsersData.forEach((au: any) => {
      authUserMap.set(au.id, {
        email: au.email || 'N/A',
        full_name: au.user_metadata?.full_name || 'Unknown User'
      })
    })

    // Step 5: Combine user_roles with auth users
    const combinedUsers = (userRoles || []).map((ur: any) => {
      const authData = authUserMap.get(ur.user_id) || { 
        email: 'N/A', 
        full_name: 'Unknown User' 
      }

      return {
        id: ur.id,
        user_id: ur.user_id,
        role_type: ur.role_type,
        status: ur.status || 'active',
        created_at: ur.created_at,
        farms: ur.farms,
        profiles: {
          email: authData.email,
          user_metadata: {
            full_name: authData.full_name
          }
        }
      }
    })

    return { users: combinedUsers, count: count || 0 }
  } catch (error) {
    console.error('Error in getAllUsers:', error)
    return { users: [], count: 0 }
  }
}

// ✅ NEW: Get user details with auth info (no type errors)
export async function getUserDetailsWithAuth(userId: string) {
  const adminSupabase = createAdminClient()
  
  try {
    // Get user_roles data
    const { data: userRole, error: roleError } = await (adminSupabase
      .from('user_roles') as any)
      .select(`
        *,
        farms (
          name,
          location
        )
      `)
      .eq('user_id', userId)
      .single()

    if (roleError) {
      console.error('Error getting user role:', roleError)
      return null
    }

    // Get auth user data
    let authUser: any = null
    try {
      const { data: { user }, error: authError } = await (adminSupabase.auth.admin.getUserById(userId) as any)
      
      if (!authError && user) {
        authUser = user
      }
    } catch (error) {
      console.error('Error getting auth user:', error)
    }

    // Combine the data
    return {
      ...userRole,
      profiles: {
        email: authUser?.email || 'N/A',
        user_metadata: {
          full_name: authUser?.user_metadata?.full_name || 'Unknown User'
        }
      }
    }
  } catch (error) {
    console.error('Error in getUserDetailsWithAuth:', error)
    return null
  }
}

export async function suspendUser(userId: string, reason: string) {
  const adminSupabase = createAdminClient()
  
  try {
    // Update user roles to inactive
    const { error: roleError } = await (adminSupabase
      .from('user_roles') as any)
      .update({ status: 'suspended' })
      .eq('user_id', userId)

    if (roleError) throw roleError

    // Log the action (only if audit_logs table exists)
    try {
      await (adminSupabase.from('audit_logs') as any).insert({
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
    const result = await (adminSupabase
      .from('system_metrics') as any)
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
    const { error } = await (adminSupabase
      .from('audit_logs') as any)
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

// Analytics Data
export async function getAnalyticsData(timeRange: string = '30d') {
  const adminSupabase = createAdminClient()
  
  try {
    // Calculate date range
    const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)
    const previousPeriodStart = new Date()
    previousPeriodStart.setDate(previousPeriodStart.getDate() - (daysBack * 2))

    // Get current period data
    const { data: currentUsers } = await adminSupabase
      .from('user_roles')
      .select('id')
      .gte('created_at', startDate.toISOString())

    const { data: currentFarms } = await adminSupabase
      .from('farms')
      .select('id')
      .gte('created_at', startDate.toISOString())

    const { data: currentAnimals } = await adminSupabase
      .from('animals')
      .select('id')
      .gte('created_at', startDate.toISOString())

    // Get previous period data for comparison
    const { data: previousUsers } = await adminSupabase
      .from('user_roles')
      .select('id')
      .gte('created_at', previousPeriodStart.toISOString())
      .lt('created_at', startDate.toISOString())

    const { data: previousFarms } = await adminSupabase
      .from('farms')
      .select('id')
      .gte('created_at', previousPeriodStart.toISOString())
      .lt('created_at', startDate.toISOString())

    // Calculate growth percentages
    const userGrowth = {
      current: currentUsers?.length || 0,
      previous: previousUsers?.length || 0,
      change: previousUsers?.length ? 
        Math.round(((currentUsers?.length || 0) - (previousUsers?.length || 0)) / (previousUsers?.length || 1) * 100) : 0
    }

    const farmGrowth = {
      current: currentFarms?.length || 0,
      previous: previousFarms?.length || 0,
      change: previousFarms?.length ? 
        Math.round(((currentFarms?.length || 0) - (previousFarms?.length || 0)) / (previousFarms?.length || 1) * 100) : 0
    }

    const animalTracking = {
      current: currentAnimals?.length || 0,
      previous: 0,
      change: 0
    }

    // Get revenue data
    const { data: subscriptionsData } = await adminSupabase
      .from('billing_subscriptions')
      .select('monthly_price, status')
      .eq('status', 'active')

    const subscriptions = (subscriptionsData || []) as any[]

    const currentRevenue = subscriptions.reduce((sum, sub) => sum + (Number(sub.monthly_price) || 0), 0) || 0

    const revenueGrowth = {
      current: currentRevenue,
      previous: currentRevenue * 0.88, // Simulated previous period
      change: 12 // Simulated growth
    }

    // Get top farms by activity
    const { data: topFarms } = await adminSupabase
      .from('farms')
      .select(`
        id,
        name,
        animals(count),
        user_roles(count)
      `)
      .limit(5)

    return {
      userGrowth,
      farmGrowth,
      revenueGrowth,
      animalTracking,
      engagement: {
        dailyActiveUsers: Math.floor((currentUsers?.length || 0) * 0.6),
        averageSessionTime: 24,
        featuresUsed: [
          { name: 'Animal Tracking', usage: 95 },
          { name: 'Health Records', usage: 87 },
          { name: 'Breeding Management', usage: 72 },
          { name: 'Reports', usage: 68 },
          { name: 'Team Collaboration', usage: 54 }
        ]
      },
      topFarms: (topFarms || []).map((farm: any, index: number) => ({
        id: farm.id,
        name: farm.name,
        animals: farm.animals?.[0]?.count || 0,
        teamSize: farm.user_roles?.[0]?.count || 0,
        engagement: 95 - (index * 5)
      })),
      recentActivity: [
        { message: 'New farm registered', timestamp: '5 min ago', type: 'success', category: 'signup' },
        { message: 'User upgraded subscription', timestamp: '15 min ago', type: 'success', category: 'billing' },
        { message: 'Support ticket resolved', timestamp: '1 hour ago', type: 'success', category: 'support' },
        { message: 'Payment failed', timestamp: '2 hours ago', type: 'error', category: 'billing' },
        { message: 'New animal added', timestamp: '3 hours ago', type: 'success', category: 'activity' }
      ]
    }
  } catch (error) {
    console.error('Error getting analytics data:', error)
    return {
      userGrowth: { current: 0, previous: 0, change: 0 },
      farmGrowth: { current: 0, previous: 0, change: 0 },
      revenueGrowth: { current: 0, previous: 0, change: 0 },
      animalTracking: { current: 0, previous: 0, change: 0 },
      engagement: { dailyActiveUsers: 0, averageSessionTime: 0, featuresUsed: [] },
      topFarms: [],
      recentActivity: []
    }
  }
}

// Get Audit Logs
export async function getAuditLogs(limit: number = 100) {
  const adminSupabase = createAdminClient()
  
  try {
    const { data, error } = await adminSupabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error getting audit logs:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getAuditLogs:', error)
    return []
  }
}

// Get User Details
export async function getUserDetails(userId: string) {
  const adminSupabase = createAdminClient()
  
  try {
    const { data, error } = await adminSupabase
      .from('user_roles')
      .select(`
        *,
        farms (
          name,
          location
        )
      `)
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error('Error getting user details:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in getUserDetails:', error)
    return null
  }
}

// Activate/Deactivate User
export async function toggleUserStatus(userId: string, newStatus: 'active' | 'suspended' | 'inactive') {
  const adminSupabase = createAdminClient()
  
  try {
    // Update user roles
    const { error } = await (adminSupabase
      .from('user_roles') as any)
      .update({ status: newStatus })
      .eq('user_id', userId)

    if (error) throw error

    // Log the action
    try {
      await (adminSupabase.from('audit_logs') as any).insert({
        action: newStatus === 'active' ? 'activate_user' : 'suspend_user',
        resource_type: 'user',
        resource_id: userId,
        new_values: { status: newStatus, updated_at: new Date().toISOString() }
      })
    } catch (auditError) {
      console.warn('Could not log action:', auditError)
    }

    return { success: true }
  } catch (error) {
    console.error('Error toggling user status:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// Update Subscription Status
export async function updateSubscriptionStatus(subscriptionId: string, newStatus: string) {
  const adminSupabase = createAdminClient()
  
  try {
    // FIXED: Cast .from('billing_subscriptions') to any to bypass 'never' type on .update()
    const { error } = await (adminSupabase
      .from('billing_subscriptions') as any)
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error updating subscription:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// Get Support Ticket Details
export async function getTicketDetails(ticketId: string) {
  const adminSupabase = createAdminClient()
  
  try {
    const { data, error } = await adminSupabase
      .from('support_tickets')
      .select(`
        *,
        farms (
          name
        )
      `)
      .eq('id', ticketId)
      .single()

    if (error) {
      console.error('Error getting ticket details:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in getTicketDetails:', error)
    return null
  }
}

// Update Support Ticket
export async function updateTicket(ticketId: string, updates: any) {
  const adminSupabase = createAdminClient()
  
  try {
    // FIXED: Cast .from('support_tickets') to any to bypass 'never' type on .update()
    const { error } = await (adminSupabase
      .from('support_tickets') as any)
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', ticketId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error updating ticket:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// Get Platform Statistics
export async function getPlatformStats(days: number = 30) {
  const adminSupabase = createAdminClient()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  
  try {
    // Fetch all data in parallel
    const [
      { count: totalFarms },
      { count: totalUsers },
      { count: totalAnimals },
      { data: subscriptionsData }
    ] = await Promise.all([
      adminSupabase.from('farms').select('*', { count: 'exact', head: true }),
      adminSupabase.from('user_roles').select('*', { count: 'exact', head: true }),
      adminSupabase.from('animals').select('*', { count: 'exact', head: true }),
      adminSupabase.from('billing_subscriptions').select('monthly_price, status')
    ])

    const subscriptions = (subscriptionsData || []) as any[]
    const activeSubscriptions = subscriptions.filter(s => s.status === 'active')
    const mrr = activeSubscriptions.reduce((sum, sub) => sum + (Number(sub.monthly_price) || 0), 0)

    return {
      totalFarms: totalFarms || 0,
      totalUsers: totalUsers || 0,
      totalAnimals: totalAnimals || 0,
      activeSubscriptions: activeSubscriptions.length,
      monthlyRevenue: mrr
    }
  } catch (error) {
    console.error('Error getting platform stats:', error)
    return {
      totalFarms: 0,
      totalUsers: 0,
      totalAnimals: 0,
      activeSubscriptions: 0,
      monthlyRevenue: 0
    }
  }
}