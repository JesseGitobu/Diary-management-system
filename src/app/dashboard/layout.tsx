import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { redirect } from 'next/navigation'
import { DashboardHeader } from '@/components/layout/DashboardHeader'
import { DashboardSidebar } from '@/components/layout/DashboardSidebar'
import { MobileHeader } from '@/components/mobile/MobileHeader'
import { MobileBottomNav } from '@/components/mobile/MobileBottomNav'
import { GlobalModalWrapper } from '@/components/layout/GlobalModalWrapper'

// Import database functions
import { getFarmAnimals } from '@/lib/database/animals'
import { getFeedTypes, getFeedInventory } from '@/lib/database/feed'
import { getWeightConversions, getFeedTypeCategories, getAnimalCategories } from '@/lib/database/feedManagementSettings'
import { getVeterinarians } from '@/lib/database/veterinary'

// NEW IMPORTS for Production & Distribution
import { getDistributionChannels } from '@/lib/database/channels'
import { getAvailableVolume } from '@/lib/database/inventory'
import { getProductionSettings } from '@/lib/database/production-settings'
import { getDistributionSettings } from '@/lib/database/distribution-settings'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth')
  }

  const userRole = await getUserRole(user.id) as any
  
  if (!userRole?.farm_id) {
    return (
      <div className="h-screen bg-gray-50">
        <MobileHeader />
        <main className="flex-1 overflow-auto pb-16 md:pb-0">
          <div className="py-4 md:py-6">{children}</div>
        </main>
        <MobileBottomNav />
      </div>
    )
  }

  // Pre-fetch data required for Global Modals
  // We use Promise.all to fetch them in parallel for performance
  const [
    animals, 
    feedTypes, 
    inventory, 
    veterinarians,
    feedTypeCategories,
    animalCategories,
    weightConversions,
    // New Data
    channels,
    availableVolume,
    productionSettings,
    distributionSettings
  ] = await Promise.all([
    getFarmAnimals(userRole.farm_id),
    getFeedTypes(userRole.farm_id),
    getFeedInventory(userRole.farm_id),
    getVeterinarians(userRole.farm_id).catch(() => []), // Fallback if not implemented yet
    getFeedTypeCategories(userRole.farm_id),
    getAnimalCategories(userRole.farm_id),
    getWeightConversions(userRole.farm_id),
    // Production & Distribution Fetching
    getDistributionChannels(userRole.farm_id),
    getAvailableVolume(userRole.farm_id),
    getProductionSettings(userRole.farm_id),
    getDistributionSettings(userRole.farm_id)
  ])

  // Transform channels to match expected interface if needed
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
      
      <MobileHeader />
      
      <div className="flex h-full">
        <div className="hidden md:block">
          <DashboardSidebar />
        </div>
        
        <main className="flex-1 overflow-auto pb-16 md:pb-0">
          <div className="py-4 md:py-6">
            {children}
          </div>
        </main>
      </div>

      <MobileBottomNav />
      
      <GlobalModalWrapper 
        farmId={userRole.farm_id}
        animals={animals}
        // Feed
        feedTypes={feedTypes}
        inventory={inventory}
        feedTypeCategories={feedTypeCategories}
        animalCategories={animalCategories}
        weightConversions={weightConversions}
        // Health
        veterinarians={veterinarians}
        // Production & Distribution
        channels={formattedChannels}
        availableVolume={availableVolume}
        productionSettings={productionSettings}
        distributionSettings={distributionSettings}
      />
    </div>
  )
}