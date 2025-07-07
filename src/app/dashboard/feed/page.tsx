import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getFeedStats, getFeedTypes, getFeedInventory } from '@/lib/database/feed'
import { redirect } from 'next/navigation'
import { FeedManagementDashboard } from '@/components/feed/FeedManagementDashboard'

export default async function FeedPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth')
  }
  
  const userRole = await getUserRole(user.id)
  
  if (!userRole?.farm_id) {
    redirect('/dashboard')
  }
  
  // Get feed management data
  const [feedStats, feedTypes, inventory] = await Promise.all([
    getFeedStats(userRole.farm_id, 30),
    getFeedTypes(userRole.farm_id),
    getFeedInventory(userRole.farm_id)
  ])
  
  return (
    <div className="dashboard-container">
      <FeedManagementDashboard
        farmId={userRole.farm_id}
        feedStats={feedStats}
        feedTypes={feedTypes}
        inventory={inventory}
        userRole={userRole.role_type}
      />
    </div>
  )
}