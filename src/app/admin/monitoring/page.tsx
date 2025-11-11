// src/app/admin/monitoring/page.tsx
import { getCurrentUser } from '@/lib/supabase/server'
import { getSystemMetrics } from '@/lib/database/admin'
import { redirect } from 'next/navigation'
import { SystemMonitoring } from '@/components/admin/SystemMonitoring'

export default async function AdminMonitoringPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/admin/auth')
  }
  
  const metrics = await getSystemMetrics()
  
  return (
    <div className="dashboard-container">
      <SystemMonitoring metrics={metrics} />
    </div>
  )
}