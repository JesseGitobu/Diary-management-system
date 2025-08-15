import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getFeedStats, getFeedTypes, getFeedInventory, getFeedConsumptionRecords } from '@/lib/database/feed'
import { getFarmAnimals } from '@/lib/database/animals'
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
  
  // Get feed management data including consumption records and animals
  const [feedStats, feedTypes, inventory, consumptionRecords, animals] = await Promise.all([
    getFeedStats(userRole.farm_id, 30), // Last 30 days stats
    getFeedTypes(userRole.farm_id),
    getFeedInventory(userRole.farm_id),
    getFeedConsumptionRecords(userRole.farm_id, 50), // Last 50 consumption records
    getFarmAnimals(userRole.farm_id) // Animals for feeding modal
  ])
  
  return (
    <div className="dashboard-container">
      <FeedManagementDashboard
        farmId={userRole.farm_id}
        feedStats={feedStats}
        feedTypes={feedTypes}
        inventory={inventory}
        consumptionRecords={consumptionRecords}
        animals={animals}
        userRole={userRole.role_type}
      />
    </div>
  )
}