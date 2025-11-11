// src/app/admin/analytics/page.tsx
import { getCurrentUser } from '@/lib/supabase/server'
import { getAnalyticsData } from '@/lib/database/admin'
import { redirect } from 'next/navigation'
import { Analytics } from '@/components/admin/Analytics'

export default async function AdminAnalyticsPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/admin/auth')
  }
  
  const analyticsData = await getAnalyticsData()
  
  return (
    <div className="dashboard-container">
      <Analytics analyticsData={analyticsData} />
    </div>
  )
}