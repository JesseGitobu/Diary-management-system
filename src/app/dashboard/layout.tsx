// src/app/dashboard/layout.tsx
import { getCurrentUser, createServerSupabaseClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { redirect } from 'next/navigation'
import { DashboardHeader } from '@/components/layout/DashboardHeader'
import { DashboardSidebar } from '@/components/layout/DashboardSidebar'
import { MobileHeader } from '@/components/mobile/MobileHeader'
import { MobileBottomNav } from '@/components/mobile/MobileBottomNav'
import { GlobalModalWrapper } from '@/components/layout/GlobalModalWrapper'

// Import database functions (keep your existing imports)
import { getFarmAnimals } from '@/lib/database/animals'
import { getFeedTypes, getFeedInventory } from '@/lib/database/feed'
import { getWeightConversions, getFeedTypeCategories, getAnimalCategories } from '@/lib/database/feedManagementSettings'
import { getVeterinarians } from '@/lib/database/veterinary'
import { getDistributionChannels } from '@/lib/database/channels'
import { getAvailableVolume } from '@/lib/database/inventory'
import { getProductionSettings } from '@/lib/database/production-settings'
import { getDistributionSettings } from '@/lib/database/distribution-settings'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  const supabase = await createServerSupabaseClient()
  
  if (!user) redirect('/auth')

  const userRole = await getUserRole(user.id) as any
  
  // 1. SCENARIO A: No Farm ID (Skipped Onboarding)
  if (!userRole?.farm_id) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
        <MobileHeader farmId={null} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-16 md:pb-0">
          <div className="py-4 md:py-6">{children}</div>
        </main>
        {/* Hide bottom nav if no farm */}
      </div>
    )
  }

  // 2. Fetch critical layout data (Features & Counts)
  const [
    animals, 
    { data: farmProfile }
  ] = await Promise.all([
    getFarmAnimals(userRole.farm_id),
    supabase.from('farm_profiles').select('tracking_features').eq('user_id', user.id).single()
  ])
  
  // Cast to specific types for safety
  const trackingFeatures = (farmProfile as any)?.tracking_features as string[] | undefined
  const animalCount = animals ? animals.length : 0

  // 3. Fetch Rest of Data for Modals (Keep your existing parallel fetch)
  const [
    feedTypes, 
    inventory, 
    veterinarians,
    feedTypeCategories,
    animalCategories,
    weightConversions,
    channels,
    availableVolume,
    productionSettings,
    distributionSettings
  ] = await Promise.all([
    getFeedTypes(userRole.farm_id),
    getFeedInventory(userRole.farm_id),
    getVeterinarians(userRole.farm_id).catch(() => []),
    getFeedTypeCategories(userRole.farm_id),
    getAnimalCategories(userRole.farm_id),
    getWeightConversions(userRole.farm_id),
    getDistributionChannels(userRole.farm_id),
    getAvailableVolume(userRole.farm_id),
    getProductionSettings(userRole.farm_id),
    getDistributionSettings(userRole.farm_id)
  ])

  // Transform channels
  const formattedChannels = channels.map((channel: any) => ({
    id: channel.id,
    name: channel.name,
    type: channel.type,
    contact: channel.contact || "",
    pricePerLiter: channel.pricePerLiter || 0,
    isActive: channel.isActive ?? true
  }))

  return (
    <div className="h-screen bg-gray-50">
      <div className="hidden md:block">
        <DashboardHeader />
      </div>
      
      {/* Pass props to MobileHeader */}
      <MobileHeader 
        trackingFeatures={trackingFeatures}
        animalCount={animalCount}
        farmId={userRole.farm_id}
      />
      
      <div className="flex h-full">
        <div className="hidden md:block">
          {/* Pass props to DashboardSidebar */}
          <DashboardSidebar 
             trackingFeatures={trackingFeatures}
             animalCount={animalCount}
             farmId={userRole.farm_id}
          />
        </div>
        
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-16 md:pb-0">
          <div className="py-4 md:py-6">
            {children}
          </div>
        </main>
      </div>

      {/* Hide Bottom Nav if 0 animals or apply restrictions */}
      {animalCount > 0 && <MobileBottomNav />}
      
      <GlobalModalWrapper 
        farmId={userRole.farm_id}
        animals={animals}
        feedTypes={feedTypes}
        inventory={inventory}
        feedTypeCategories={feedTypeCategories}
        animalCategories={animalCategories}
        weightConversions={weightConversions}
        veterinarians={veterinarians}
        channels={formattedChannels}
        availableVolume={availableVolume}
        productionSettings={productionSettings}
        distributionSettings={distributionSettings}
      />
    </div>
  )
}