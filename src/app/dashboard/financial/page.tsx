import { Metadata } from 'next'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getFinancialSummary, getMonthlyFinancialData, getCostPerAnimal } from '@/lib/database/financial'
import { redirect } from 'next/navigation'
import { FinancialDashboard } from '@/components/financial/FinancialDashboard'
import { getUserPermissions } from '@/lib/database/user-permissions'

export const metadata: Metadata = {
  title: 'Financial Management | DairyTrack Pro',
  description: 'Track farm finances with revenue analytics, expense tracking, profitability reports, cost per animal, and financial forecasting.',
}

export default async function FinancialPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth')
  }
  
  const userRole = await getUserRole(user.id) as any
  
  if (!userRole?.farm_id) {
    redirect('/dashboard')
  }
  
  const currentYear = new Date().getFullYear()

  const [financialSummary, monthlyData, costPerAnimal, permissions] = await Promise.all([
    getFinancialSummary(userRole.farm_id, currentYear),
    getMonthlyFinancialData(userRole.farm_id, currentYear),
    getCostPerAnimal(userRole.farm_id, currentYear),
    getUserPermissions(userRole.id, userRole.farm_id, userRole.role_type),
  ])

  // Gate: only users with financial view permission can access this page
  if (!permissions.canViewFinancial) {
    redirect('/dashboard')
  }
  
  return (
    <div className="dashboard-container">
      <FinancialDashboard
        currentUser={user}
        userRole={userRole}
        farmId={userRole.farm_id}
        financialSummary={financialSummary}
        monthlyData={monthlyData}
        costPerAnimal={costPerAnimal}
        currentYear={currentYear}
      />
    </div>
  )
}