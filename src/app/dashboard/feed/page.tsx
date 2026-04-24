// src/app/dashboard/feed/page.tsx
import { Metadata } from 'next'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getFeedStats, getFeedTypes, getFeedInventory } from '@/lib/database/feed'
import { getFeedConsumptionRecords } from '@/lib/database/feedConsumption'
import { redirect } from 'next/navigation'
import { FeedManagementDashboard } from '@/components/feed/FeedManagementDashboard'
import { getFeedTypeCategories, getAnimalCategories, getWeightConversions } from '@/lib/database/feedManagementSettings'
import { getStorageLocations } from '@/lib/database/storage'
import { getSuppliers } from '@/lib/database/suppliers'

export const metadata: Metadata = {
  title: 'Feed Management | DairyTrack Pro',
  description: 'Manage feed inventory, track consumption patterns, monitor costs, and optimize nutrition for your dairy herd.',
}

export default async function FeedPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth')
  }

  const userRole = await getUserRole(user.id) as any

  if (!userRole?.farm_id) {
    redirect('/dashboard')
  }

  const farmId = userRole.farm_id

  // Critical data only — everything needed to paint the first visible screen.
  // Heavy/modal-only data (animals, feedMixRecipes, permissions) is loaded
  // client-side on demand to avoid blocking the initial render.
  const [feedStats, feedTypes, inventory, consumptionRecords, feedTypeCategories, animalCategories, weightConversions, storageLocations, suppliers] = await Promise.all([
    getFeedStats(farmId, 30),
    getFeedTypes(farmId),
    getFeedInventory(farmId),
    // Reduce limit: the table view shows ~20 rows; full history is paginated client-side
    getFeedConsumptionRecords(farmId, 20),
    getFeedTypeCategories(farmId),
    getAnimalCategories(farmId),
    getWeightConversions(farmId),
    getStorageLocations(farmId),
    getSuppliers(farmId),
  ])

  return (
    <div className="dashboard-container">
      <FeedManagementDashboard
        farmId={farmId}
        feedStats={feedStats}
        feedTypes={feedTypes}
        inventory={inventory}
        consumptionRecords={consumptionRecords}
        animals={[]}           // loaded client-side when modal opens
        userRole={userRole.role_type}
        feedTypeCategories={feedTypeCategories}
        animalCategories={animalCategories}
        weightConversions={weightConversions}
        storageLocations={storageLocations}
        suppliers={suppliers}
        feedMixRecipes={[]}    // loaded client-side when TMR tab is activated
      />
    </div>
  )
}