//src/app/admin/dashboard/page.tsx
import { getCurrentUser } from '@/lib/supabase/server'
import { getSystemOverview } from '@/lib/database/admin'
import { redirect } from 'next/navigation'
import { AdminDashboard } from '@/components/admin/AdminDashboard'


export default async function AdminDashboardPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/admin/auth')
  }
  
  // Check if user is admin (this should be handled by middleware too)
  const systemOverview = await getSystemOverview()
  
  return (
    <div className="dashboard-container">
      <AdminDashboard 
        user={user}
        systemOverview={systemOverview}
      />
    </div>
  )
}