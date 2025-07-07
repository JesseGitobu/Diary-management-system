
// src/app/dashboard/health/page.tsx (Fixed - Server Component)
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { redirect } from 'next/navigation'
import { HealthDashboardWrapper } from '@/components/health/HealthDashboardWrapper'

export default async function HealthPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth')
  }
  
  const userRole = await getUserRole(user.id)
  
  if (!userRole?.farm_id) {
    redirect('/dashboard')
  }
  
  return (
    <div className="dashboard-container">
      <HealthDashboardWrapper 
        farmId={userRole.farm_id}
        userRole={userRole.role_type}
      />
    </div>
  )
}