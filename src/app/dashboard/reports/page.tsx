import { Metadata } from 'next'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getReportingKPIs } from '@/lib/database/reports'
import { redirect } from 'next/navigation'
import { ReportsDashboard } from '@/components/reports/ReportsDashboard'

export const metadata: Metadata = {
  title: 'Reports & Analytics | DairyTrack Pro',
  description: 'Generate comprehensive farm reports with KPI analytics, performance metrics, trend analysis, and customizable data visualizations.',
}

export default async function ReportsPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth')
  }
  
  const userRole = await getUserRole(user.id) as any
  
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