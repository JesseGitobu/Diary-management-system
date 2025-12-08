import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { generateHealthReminders, checkWithdrawalPeriods } from '@/lib/health/automation'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id) as any
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated' }, { status: 400 })
    }
    
    const { searchParams } = new URL(request.url)
    const farmId = searchParams.get('farmId')
    
    if (!farmId || farmId !== userRole.farm_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Get health reminders and alerts
    // farmId is guaranteed to be a string here due to the check above
    const [reminders, withdrawalAlerts] = await Promise.all([
      generateHealthReminders(farmId),
      checkWithdrawalPeriods(farmId)
    ])
    
    // Mock health stats (you'll implement these based on your data)
    const healthStats = {
      healthy_animals: 45,
      under_treatment: 3,
      quarantined: 1
    }
    
    const vaccinationStats = {
      pending: reminders.filter((r: any) => r.type === 'vaccination' && r.status === 'pending').length,
      overdue: reminders.filter((r: any) => r.type === 'vaccination' && r.status === 'overdue').length,
      completed_this_month: 12 // You'll calculate this from actual data
    }
    
    return NextResponse.json({
      reminders,
      withdrawalAlerts,
      healthStats,
      vaccinationStats
    })
    
  } catch (error) {
    console.error('Health dashboard API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}