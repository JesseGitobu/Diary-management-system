import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getReportingKPIs } from '@/lib/database/reports'
import { redirect } from 'next/navigation'
import { ReportsDashboard } from '@/components/reports/ReportsDashboard'

export default async function ReportsPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth')
  }
  
  const userRole = await getUserRole(user.id)
  
  if (!userRole?.farm_id) {
    redirect('/dashboard')
  }
  
  // Get initial KPI data
  const kpis = await getReportingKPIs(userRole.farm_id)
  
  return (
    <div className="dashboard-container">
      <ReportsDashboard
        farmId={userRole.farm_id}
        initialKPIs={kpis}
        userRole={userRole.role_type}
      />
    </div>
  )
}