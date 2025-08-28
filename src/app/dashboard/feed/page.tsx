import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getFeedStats, getFeedTypes, getFeedInventory, getFeedConsumptionRecords } from '@/lib/database/feed'
import { getFarmAnimals } from '@/lib/database/animals'
import { redirect } from 'next/navigation'
import { FeedManagementDashboard } from '@/components/feed/FeedManagementDashboard'
import { getWeightConversions, getFeedTypeCategories, getAnimalCategories, getConsumptionBatches } from '@/lib/database/feedManagementSettings'

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
  const [feedStats, feedTypes, inventory, consumptionRecords, animals, feedTypeCategories, animalCategories, weightConversions, consumptionBatches] = await Promise.all([
  getFeedStats(userRole.farm_id, 30),
  getFeedTypes(userRole.farm_id),
  getFeedInventory(userRole.farm_id),
  getFeedConsumptionRecords(userRole.farm_id, 50),
  getFarmAnimals(userRole.farm_id),
  getFeedTypeCategories(userRole.farm_id),
  getAnimalCategories(userRole.farm_id),
  getWeightConversions(userRole.farm_id),
  getConsumptionBatches(userRole.farm_id),
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
        feedTypeCategories={feedTypeCategories}
        animalCategories={animalCategories}
        weightConversions={weightConversions}
        consumptionBatches={consumptionBatches}
      />
    </div>
  )
}