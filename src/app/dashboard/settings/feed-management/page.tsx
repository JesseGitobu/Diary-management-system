// app/dashboard/settings/feed-management/page.tsx
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { 
  getFeedTypeCategories,
  getAnimalCategories,
  getWeightConversions,
  getConsumptionBatches,
  getConsumptionBatchFactors,
  initializeFarmFeedManagementSettings
} from '@/lib/database/feedManagementSettings'
import { FeedManagementSettings } from '@/components/settings/feeds/FeedManagementSettings'

interface FeedManagementSettingsPageProps {
  searchParams: Promise<{ farmId: string }>
}

export default async function FeedManagementSettingsPage({
  searchParams
}: FeedManagementSettingsPageProps) {
  // Await searchParams before accessing its properties
  const { farmId } = await searchParams
  
  if (!farmId) {
    redirect('/dashboard')
  }
  
  // Verify user access
  const user = await getCurrentUser() 
  if (!user) {
    redirect('/auth/signin')
  }
  
  const userRole = await getUserRole(user.id) as any
  if (!userRole || userRole.farm_id !== farmId) {
    redirect('/dashboard')
  }
  
  try {
    // Fetch all data in parallel
    const [
      feedTypeCategories,
      animalCategories,
      weightConversions,
      consumptionBatches,
      batchFactors
    ] = await Promise.all([
      getFeedTypeCategories(farmId),
      getAnimalCategories(farmId),
      getWeightConversions(farmId),
      getConsumptionBatches(farmId),
      getConsumptionBatchFactors(farmId)
    ])
    
    // Initialize default data if no categories exist
    if (feedTypeCategories.length === 0 && animalCategories.length === 0 && weightConversions.length === 0) {
      await initializeFarmFeedManagementSettings(farmId)
      
      // Refetch the data after initialization
      const [
        refreshedFeedTypeCategories,
        refreshedAnimalCategories,
        refreshedWeightConversions,
        refreshedConsumptionBatches,
        refreshedBatchFactors
      ] = await Promise.all([
        getFeedTypeCategories(farmId),
        getAnimalCategories(farmId),
        getWeightConversions(farmId),
        getConsumptionBatches(farmId),
        getConsumptionBatchFactors(farmId)
      ])
      
      return (
        <FeedManagementSettings
          farmId={farmId}
          userRole={userRole.role_type}
          feedTypeCategories={refreshedFeedTypeCategories}
          animalCategories={refreshedAnimalCategories}
          weightConversions={refreshedWeightConversions}
          consumptionBatches={refreshedConsumptionBatches}
          batchFactors={refreshedBatchFactors}
        />
      )
    }
    
    return (
      <FeedManagementSettings
        farmId={farmId}
        userRole={userRole.role_type}
        feedTypeCategories={feedTypeCategories}
        animalCategories={animalCategories}
        weightConversions={weightConversions}
        consumptionBatches={consumptionBatches}
        batchFactors={batchFactors}
      />
    )
    
  } catch (error) {
    console.error('Error loading feed management settings:', error)
    
    // Return empty arrays as fallback
    return (
      <FeedManagementSettings
        farmId={farmId}
        userRole={userRole.role_type}
        feedTypeCategories={[]}
        animalCategories={[]}
        weightConversions={[]}
        consumptionBatches={[]}
        batchFactors={[]}
      />
    )
  }
}

// Generate metadata for the page
export async function generateMetadata() {
  return {
    title: 'Feed Management Settings - Farm Management System',
    description: 'Configure feed types, animal categories, weight conversions, and consumption batches for your dairy farm.'
  }
}